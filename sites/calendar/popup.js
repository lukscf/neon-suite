const DEFAULTS = {
  theme: true, tilt: true, privacy: false,
  color: "purple", background: "aurora"
};
const COLORS = { purple: "#bd77ff", blue: "#5c9dff", pink: "#ff74bb", cyan: "#4fe0db", green: "#75df95", bullet: "#C2F141" };
// Tema Bullet: tons neutros do Bullet Identity Source em vez de um matiz.
const BULLET_LOOK = { "--bg": "#070707", "--panel": "#131313", "--line": "#333333", "--text": "#FFFFFF", "--muted": "#A3A3A3", "--top": "#1A1A1A" };
// O popup inteiro acompanha a cor: fundo, painéis, linhas e texto secundário têm o mesmo tom.
const HUES = { blue: 218, pink: 330, cyan: 178, green: 140 };
function tint(color) {
  document.documentElement.dataset.look = color;
  const root = document.documentElement.style;
  const h = HUES[color];
  for (const p of ["--bg", "--panel", "--line", "--text", "--muted", "--top"]) root.removeProperty(p);
  if (color === "bullet") {
    for (const [k, v] of Object.entries(BULLET_LOOK)) root.setProperty(k, v);
    return;
  }
  if (h === undefined) return;
  root.setProperty("--bg", `hsl(${h} 50% 4%)`);
  root.setProperty("--panel", `hsl(${h} 42% 10%)`);
  root.setProperty("--line", `hsl(${h} 30% 24%)`);
  root.setProperty("--text", `hsl(${h} 100% 96%)`);
  root.setProperty("--muted", `hsl(${h} 22% 70%)`);
  root.setProperty("--top", `hsl(${h} 40% 20%)`);
}
const $ = (selector) => document.querySelector(selector);

function status(message, error = false) {
  const el = $("#status");
  el.textContent = message;
  el.style.color = error ? "#ff9db1" : "var(--accent)";
}

function showColor(color) {
  document.documentElement.style.setProperty("--accent", COLORS[color] || COLORS.purple);
  tint(color);
  document.querySelectorAll(".colors button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.color === color));
  });
}

NS.local.get(DEFAULTS).then((settings) => {
  for (const key of ["theme", "tilt", "privacy"]) $("#" + key).checked = !!settings[key];
  $("#background").value = settings.background;
  showColor(settings.color);
});

for (const key of ["theme", "tilt", "privacy"]) {
  $("#" + key).addEventListener("change", (event) => {
    NS.local.set({ [key]: event.target.checked });
    status("Preferência salva.");
  });
}
$("#background").addEventListener("change", (event) => {
  NS.local.set({ background: event.target.value });
  status("Fundo atualizado.");
});
document.querySelectorAll(".colors button").forEach((button) => button.addEventListener("click", () => {
  const color = button.dataset.color;
  showColor(color);
  // Escolher Bullet liga também o fundo de balas e cripto
  if (color === "bullet") {
    NS.local.set({ color, background: "bullet" });
    $("#background").value = "bullet";
    status("Tema Bullet aplicado.");
    return;
  }
  NS.local.set({ color });
  status("Cor atualizada.");
}));

// Diagnóstico: mostra se a extensão está ativa nesta aba.
(async () => {
  const diag = $("#diag");
  const version = chrome.runtime.getManifest().version;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.startsWith("https://calendar.google.com/")) {
      diag.textContent = `CA Neon ${version}. Abra o Calendar para ver o diagnóstico.`;
      return;
    }
    const info = await chrome.tabs.sendMessage(tab.id, { type: "ping" });
    diag.textContent = `CA Neon ${version} ativo. Tema ${info.theme ? "aplicado" : "desligado"}.`;
  } catch {
    diag.textContent = `CA Neon ${version} instalado, mas não está rodando nesta aba. Recarregue o Calendar (F5).`;
  }
})();
