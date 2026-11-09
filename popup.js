// Neon Suite: o popup abre direto o menu do site da aba atual.
// Fora dos quatro sites (ou pelo link "Neon Suite" dentro de um menu), mostra a página inicial.
const NAMES = { gmail: "Gmail", whatsapp: "WhatsApp", slack: "Slack", youtube: "YouTube", prime: "Prime Video" };

(async () => {
  const forceHome = new URLSearchParams(location.search).has("home");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }).catch(() => []);
  const site = NeonNS.siteOfUrl(tab?.url || "");
  if (site && !forceHome) {
    location.replace(`sites/${site}/popup.html`);
    return;
  }
  document.getElementById("home").hidden = false;
  if (site) {
    document.getElementById("where").textContent = `Você está no ${NAMES[site]}.`;
    document.querySelector(`.site[data-site="${site}"]`)?.classList.add("here");
  }
})();

// Uma cor para todos: cada site guarda a cor com o nome que ele usa.
const WHATSAPP_PRESET = { purple: "roxo", blue: "azul", pink: "rosa", cyan: "ciano", green: "matrix", bullet: "bullet" };
document.querySelectorAll(".colors button").forEach((b) => b.addEventListener("click", async () => {
  const color = b.dataset.color;
  const bullet = color === "bullet";
  await chrome.storage.local.set({
    "gmail:color": color, "slack:color": color, "whatsapp:preset": WHATSAPP_PRESET[color],
    ...(bullet ? { "gmail:background": "bullet", "slack:background": "bullet", "whatsapp:bgfx": "bullet" } : {})
  });
  await chrome.storage.sync.set({ "youtube:color": color, "prime:color": color, ...(bullet ? { "youtube:background": "bullet", "prime:background": "bullet" } : {}) });
  document.querySelectorAll(".colors button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  document.getElementById("status").textContent = "Cor aplicada em todos os sites.";
}));

document.getElementById("options").addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });
