const SITES = ["gmail", "whatsapp", "slack", "youtube", "prime", "pluto"];
const SKIP = new Set(["youtube:resume", "youtube:chanSpeed"]); // dados de uso, não preferências
const status = (t, err) => { const s = document.getElementById("status"); s.textContent = t; s.style.color = err ? "#ff9db1" : "var(--accent)"; };
const mine = (k) => SITES.some((s) => k.startsWith(s + ":"));
const small = (v) => JSON.stringify(v ?? null).length < 50000; // deixa de fora caches grandes (transcrições)

document.getElementById("export").addEventListener("click", async () => {
  const pick = (all) => Object.fromEntries(Object.entries(all).filter(([k, v]) => mine(k) && !SKIP.has(k) && small(v)));
  const data = {
    app: "neon-suite",
    version: chrome.runtime.getManifest().version,
    exportedAt: new Date().toISOString(),
    local: pick(await chrome.storage.local.get(null)),
    sync: pick(await chrome.storage.sync.get(null))
  };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `neon-suite-configuracoes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  status("Arquivo exportado.");
});

document.getElementById("import").addEventListener("click", () => document.getElementById("file").click());
document.getElementById("file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    if (file.size > 500000) throw new Error("grande");
    const data = JSON.parse(await file.text());
    if (data?.app !== "neon-suite") throw new Error("formato");
    const clean = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k, v]) => mine(k) && !SKIP.has(k) && small(v)));
    const local = clean(data.local), sync = clean(data.sync);
    await chrome.storage.local.set(local);
    await chrome.storage.sync.set(sync);
    status(`Importado: ${Object.keys(local).length + Object.keys(sync).length} configurações. Recarregue os sites abertos.`);
  } catch {
    status("Arquivo inválido: use um .json exportado pela Neon Suite.", true);
  }
});

document.querySelectorAll("[data-reset]").forEach((b) => b.addEventListener("click", async () => {
  const site = b.dataset.reset;
  if (!confirm(`Voltar as configurações do ${b.textContent} ao padrão?`)) return;
  const ns = NeonNS.make(site);
  await ns.local.clear();
  await ns.sync.clear();
  status(`${b.textContent}: configurações restauradas. Recarregue o site.`);
}));
