// pluto: background do site, no próprio escopo e com as preferências do site.
(() => {
const NS = NeonNS.make("pluto");
// Pluto Neon: ícone na cor escolhida e atalho global do player flutuante.
const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);

function iconPaths(color) {
  const c = COLORS.has(color) ? color : "purple";
  const path = {};
  for (const n of [16, 32, 48, 128]) path[n] = `sites/pluto/icons/${c}/icon${n}.png`;
  return path;
}

async function applyIcon(color) {
  if (color === undefined) ({ color } = await NS.sync.get({ color: "purple" }));
  try {
    await NeonIcon.set("pluto", { path: iconPaths(color) });
  } catch (error) {
    console.warn("Pluto Neon: não foi possível trocar o ícone", error);
  }
}

chrome.runtime.onInstalled.addListener(() => applyIcon());
chrome.runtime.onStartup.addListener(() => applyIcon());
NS.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.color) applyIcon(changes.color.newValue);
});
applyIcon();

// Atalho global (Alt+Shift+Y, dá para trocar em chrome://extensions/shortcuts).
// A janela flutuante só abre com um gesto do usuário. O Chrome repassa o gesto do atalho
// para o script injetado aqui, que chama o float.js que já está na página.
async function toggleFloat(tabId) {
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => (window.__plnFloat ? window.__plnFloat.toggle("atalho") : "sem-player")
    });
    return res?.result;
  } catch (error) {
    console.warn("Pluto Neon: atalho fora do Pluto TV", error);
    return "fora";
  }
}

chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== "toggle-float") return;
  if (tab?.id && tab.url?.startsWith("https://pluto.tv/")) toggleFloat(tab.id);
});

})();
