// Neon Suite: service worker único.
// Carrega a camada de preferências por site, o gerenciador do ícone e o background de cada site
// (cada um no próprio escopo, com o próprio NS).
importScripts("ns.js");

// ---------- Ícone da barra por aba ----------
// Cada site informa o ícone dele (na cor do tema daquele site). A aba ativa mostra o ícone do site
// aberto nela; fora dos quatro sites, fica o ícone da Suite.
const NeonIcon = (() => {
  const specs = {};
  async function applyTab(tab) {
    if (!tab?.id) return;
    const site = NeonNS.siteOfUrl(tab.url || "");
    const spec = site && specs[site];
    try {
      if (spec) await chrome.action.setIcon({ ...spec, tabId: tab.id });
      else await chrome.action.setIcon({ path: HOME, tabId: tab.id });
    } catch {}
  }
  const HOME = { 16: "icons/icon16.png", 32: "icons/icon32.png", 48: "icons/icon48.png", 128: "icons/icon128.png" };
  async function refreshAll() {
    const tabs = await chrome.tabs.query({}).catch(() => []);
    await Promise.all(tabs.map(applyTab));
  }
  chrome.tabs.onActivated.addListener(({ tabId }) => chrome.tabs.get(tabId).then(applyTab, () => {}));
  chrome.tabs.onUpdated.addListener((_id, info, tab) => { if (info.url || info.status === "loading") applyTab(tab); });
  return {
    // chamado pelo background de cada site no lugar de chrome.action.setIcon
    set(site, spec) {
      specs[site] = { ...spec };
      delete specs[site].tabId;
      return refreshAll();
    }
  };
})();

// backgrounds dos sites
importScripts("sites/gmail/background.js", "sites/whatsapp/background.js", "sites/slack/background.js", "sites/youtube/background.js", "sites/prime/background.js", "sites/pluto/background.js", "sites/calendar/background.js");
