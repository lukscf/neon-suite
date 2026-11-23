// calendar: background do site, no próprio escopo e com as preferências do site.
(() => {
const NS = NeonNS.make("calendar");
// Troca o ícone da barra do Chrome para a cor de tema escolhida no popup.
const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);

function iconPaths(color) {
  const c = COLORS.has(color) ? color : "purple";
  const path = {};
  for (const n of [16, 32, 48, 128]) path[n] = `sites/calendar/icons/${c}/icon${n}.png`;
  return path;
}

async function applyIcon(color) {
  if (color === undefined) ({ color } = await NS.local.get({ color: "purple" }));
  try {
    await NeonIcon.set("calendar", { path: iconPaths(color) });
  } catch (error) {
    console.warn("CA Neon: não foi possível trocar o ícone", error);
  }
}

chrome.runtime.onInstalled.addListener(() => applyIcon());
chrome.runtime.onStartup.addListener(() => applyIcon());
NS.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.color) applyIcon(changes.color.newValue);
});
applyIcon();

})();
