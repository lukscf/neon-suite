// slack: background do site, no próprio escopo e com as preferências do site.
(() => {
const NS = NeonNS.make("slack");
// Troca o ícone da barra do Chrome para a cor de tema escolhida no popup.
// O ícone de chrome://extensions vem do manifest e é sempre o roxo (o Chrome não deixa mudá-lo).
const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);

function iconPaths(color) {
  const c = COLORS.has(color) ? color : "purple";
  const path = {};
  for (const n of [16, 32, 48, 128]) path[n] = `sites/slack/icons/${c}/icon${n}.png`;
  return path;
}

async function applyIcon(color) {
  if (color === undefined) ({ color } = await NS.local.get({ color: "purple" }));
  try {
    await NeonIcon.set("slack", { path: iconPaths(color) });
  } catch (error) {
    console.warn("SL Neon: não foi possível trocar o ícone", error);
  }
}

chrome.runtime.onInstalled.addListener(() => applyIcon());
chrome.runtime.onStartup.addListener(() => applyIcon());
NS.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.color) applyIcon(changes.color.newValue);
});
applyIcon();

// ---------- Avisos do Windows pelo SL Neon ----------
// O conteúdo vem da página do Slack (notify.js) e vai direto para o aviso do sistema; nada é guardado,
// além do vínculo aviso → aba (em storage.session, que some ao fechar o navegador).
async function linkOf(nid) {
  const { slnLinks = {} } = await chrome.storage.session.get("slnLinks");
  return slnLinks[nid];
}
async function setLink(nid, value) {
  const { slnLinks = {} } = await chrome.storage.session.get("slnLinks");
  if (value) slnLinks[nid] = value; else delete slnLinks[nid];
  const keys = Object.keys(slnLinks);
  if (keys.length > 50) delete slnLinks[keys[0]];
  await chrome.storage.session.set({ slnLinks });
}

async function showSystemNotice(msg, tab) {
  const { color } = await NS.local.get({ color: "purple" });
  const n = msg.n || {};
  const nid = `sln:${tab?.id ?? 0}:${n.tag || n.id}`;
  const options = {
    type: "basic",
    iconUrl: chrome.runtime.getURL(iconPaths(color)[128]),
    title: String(n.title || "Slack").slice(0, 120),
    message: msg.hide ? "Nova mensagem (conteúdo oculto)" : String(n.body || "Nova mensagem").slice(0, 500),
    contextMessage: msg.test ? "Aviso de teste do SL Neon" : "Slack · SL Neon",
    buttons: [{ title: "Abrir no Slack" }],
    requireInteraction: !!msg.persist,
    silent: !!n.silent,
    priority: 2
  };
  await chrome.notifications.clear(nid).catch(() => {});
  await chrome.notifications.create(nid, options);
  if (!msg.test) await setLink(nid, { tabId: tab?.id, windowId: tab?.windowId, id: n.id });
  return nid;
}

async function openFromNotice(nid) {
  const link = await linkOf(nid);
  chrome.notifications.clear(nid);
  if (!link) return;
  await setLink(nid, null);
  try {
    await chrome.windows.update(link.windowId, { focused: true });
    await chrome.tabs.update(link.tabId, { active: true });
    await chrome.tabs.sendMessage(link.tabId, { type: "sln-notify-click", id: link.id });
  } catch {}
}

chrome.notifications.onClicked.addListener((nid) => { if (nid.startsWith("sln:")) openFromNotice(nid); });
chrome.notifications.onButtonClicked.addListener((nid) => { if (nid.startsWith("sln:")) openFromNotice(nid); });
chrome.notifications.onClosed.addListener(async (nid) => {
  if (!nid.startsWith("sln:")) return;
  const link = await linkOf(nid);
  if (!link) return;
  await setLink(nid, null);
  chrome.tabs.sendMessage(link.tabId, { type: "sln-notify-closed", id: link.id }).catch(() => {});
});

// ---------- Links do Slack direto no navegador ----------
// Link de <workspace>.slack.com (archives, messages, raiz) abre a página "Iniciando..." do Slack, que
// tenta abrir o app instalado (slack://) e faz o Windows pedir um aplicativo. Aqui a navegação é
// redirecionada antes de a página carregar para app.slack.com/client/<ID do workspace>/...
// O vínculo endereço → ID vem de sites/slack/links.js, aprendido quando você usa o app.slack.com.
const RULE_BASE = 7000, RULE_MAX = 7999;
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.slack\.com$/;
const ID = /^[TE][A-Z0-9]{4,}$/;

function rulesFor(host, team, base) {
  const h = "^https://" + host.replace(/\./g, "\\.");
  const app = `https://app.slack.com/client/${team}`;
  const rule = (n, priority, regexFilter, regexSubstitution) => ({
    id: base + n, priority,
    action: { type: "redirect", redirect: { regexSubstitution } },
    condition: { regexFilter, resourceTypes: ["main_frame"] }
  });
  return [
    // resposta numa thread: abre a thread da mensagem pai
    rule(0, 4, h + "/archives/([A-Z0-9]+)/p\\d+\\?(?:[^#]*&)?thread_ts=(\\d{10}\\.\\d{6})", `${app}/\\1/thread/\\1-\\2`),
    // mensagem: abre o canal com a mensagem aberta no painel lateral
    rule(1, 3, h + "/archives/([A-Z0-9]+)/p(\\d{10})(\\d{6})", `${app}/\\1/thread/\\1-\\2.\\3`),
    // canal ou DM
    rule(2, 2, h + "/(?:archives|messages)/([A-Z0-9]+)/?(?:[?#].*)?$", `${app}/\\1`),
    // raiz do workspace
    rule(3, 2, h + "/?$", app)
  ];
}

// O acesso a *.slack.com é opcional (optional_host_permissions): só existe depois que você liga
// "Abrir links do Slack no navegador" no popup. Sem ele, nenhuma regra fica ativa.
const LINK_ORIGINS = ["https://*.slack.com/*"];
// Sempre remove a faixa inteira de IDs, sem ler as regras antes: duas chamadas ao mesmo tempo
// não tentam criar o mesmo ID.
const ALL_RULE_IDS = Array.from({ length: RULE_MAX - RULE_BASE + 1 }, (_, i) => RULE_BASE + i);

async function applyLinkRules() {
  try {
    const allowed = await chrome.permissions.contains({ origins: LINK_ORIGINS });
    const { teams = {} } = allowed ? await NS.local.get({ teams: {} }) : {};
    const addRules = [];
    let base = RULE_BASE;
    for (const [host, team] of Object.entries(teams || {})) {
      if (!HOST.test(host) || host === "app.slack.com" || !ID.test(team)) continue;
      if (base + 3 > RULE_MAX) break;
      addRules.push(...rulesFor(host, team, base));
      base += 4;
    }
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ALL_RULE_IDS, addRules });
  } catch (error) {
    console.warn("SL Neon: não foi possível atualizar o redirecionamento de links", error);
  }
}

chrome.runtime.onInstalled.addListener(() => applyLinkRules());
chrome.permissions.onAdded.addListener(() => applyLinkRules());
chrome.permissions.onRemoved.addListener(() => applyLinkRules());
NS.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.teams) applyLinkRules();
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!sender.tab?.url?.startsWith("https://app.slack.com/")) return;
  if (msg?.type === "sln-notify") {
    showSystemNotice(msg, sender.tab).then((nid) => reply({ ok: true, nid }), () => reply({ ok: false }));
    return true;
  }
  if (msg?.type === "sln-notify-clear") {
    // o Slack fechou o aviso (por exemplo, você leu a mensagem em outro lugar)
    chrome.storage.session.get("slnLinks").then(({ slnLinks = {} }) => {
      for (const [nid, l] of Object.entries(slnLinks)) if (l.id === msg.id && l.tabId === sender.tab.id) { chrome.notifications.clear(nid); setLink(nid, null); }
    });
  }
});

})();
