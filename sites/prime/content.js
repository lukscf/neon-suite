(() => {
  if (window.__pvNeonLoaded) return;
  window.__pvNeonLoaded = true;

  const DEFAULTS = globalThis.PVN.DEFAULTS; // settings.js
  const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);
  const BACKGROUNDS = new Set(["aurora", "stars", "matrix", "synthwave", "bokeh", "warp", "rain", "fireflies", "orbit", "bullet", "none"]);
  const FONTS = new Set(["site", "mono", "opensans", "arial"]);
  const settings = { ...DEFAULTS };
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const float = window.__pvnFloat;
  let fx;

  // ---------- Fundo animado (fica atrás do conteúdo) ----------
  function ensureFx() {
    if (fx?.isConnected) return;
    fx = document.createElement("div");
    fx.id = "pvn-fx";
    fx.setAttribute("aria-hidden", "true");
    const shape = document.createElement("div");
    shape.className = "pvn-fx-shape";
    const particles = document.createElement("div");
    particles.className = "pvn-fx-particles";
    for (let i = 0; i < 22; i++) {
      const span = document.createElement("span");
      span.style.setProperty("--i", i);
      span.style.setProperty("--x", ((i * 43 + 17) % 97) + "%");
      span.style.setProperty("--y", ((i * 29 + 11) % 83) + "%");
      span.style.setProperty("--d", ((i * 7) % 11) + "s");
      span.style.setProperty("--s", (3 + (i * 5) % 10) + "px");
      span.textContent = i % 2 ? "1" : "0";
      particles.appendChild(span);
    }
    fx.append(shape, particles);
    document.body.appendChild(fx);
  }

  function applySettings() {
    ensureFx();
    const theme = !!settings.theme;
    root.classList.toggle("pvn-theme", theme);
    root.classList.toggle("pvn-tilt-on", theme && !!settings.tilt);
    root.dataset.pvnColor = COLORS.has(settings.color) ? settings.color : "purple";
    root.dataset.pvnBg = theme && BACKGROUNDS.has(settings.background) ? settings.background : "none";
    root.dataset.pvnFont = FONTS.has(settings.font) ? settings.font : "site";
    // fundo Bullet: densidade moderada, como no SL Neon (o fundo divide a tela com vídeos)
    root.dataset.bulletFxDensity = "0.4";
    root.dataset.bulletFx = root.dataset.pvnBg === "bullet" ? "#pvn-fx" : "off";
    if (!theme || !settings.tilt) endFollow();
    root.classList.toggle("pvn-no-float-btn", !settings.floatButton);
    if (settings.floatButton) float?.ensureButton();
    else document.querySelectorAll(".pvn-float-btn").forEach((b) => b.remove());
  }

  globalThis.PVN.load().then((stored) => {
    Object.assign(settings, stored);
    applySettings();
  });
  NS.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? DEFAULTS[key];
    }
    applySettings();
  });

  chrome.runtime.onMessage.addListener((message, _sender, reply) => {
    if (message?.type === "ping") reply({ ok: true, theme: !!settings.theme, float: float?.state || null });
  });

  // ---------- Hover 3D que segue o mouse ----------
  // Cartões de vídeo (início, busca, sugestões), itens do menu lateral, chips e botões.
  // Anúncios ficam de fora: não recebem inclinação nem brilho.
  // Prime: capas dos títulos (data-testid="card"/"packshot"), itens do menu e botões. Nada dentro do player.
  const FOLLOW_SELECTOR = [
    "article[data-testid=card]", "[data-testid=packshot]", "[data-testid=super-carousel-card]",
    "a[data-testid^=pv-nav-]", "button[data-testid^=pv-nav-]", "[data-testid*=button] button", "button[data-testid*=button]"
  ].join(",");
  const AD_SELECTOR = "[data-testid*=sponsor i], [data-testid*=advert i], [class*=sponsor i]";
  const SMALL = "a[data-testid^=pv-nav-], button";
  let followEl = null, followSpot = null, followRestorePos = false, followFrame = 0, followPoint = null;

  function endFollow() {
    if (followFrame) cancelAnimationFrame(followFrame);
    followFrame = 0;
    if (!followEl) return;
    followEl.classList.remove("pvn-follow");
    for (const p of ["--pvn-rx", "--pvn-ry", "--pvn-x", "--pvn-y", "--pvn-sc"]) followEl.style.removeProperty(p);
    if (followRestorePos) followEl.style.removeProperty("position");
    followSpot?.remove();
    followEl = followSpot = null;
    followRestorePos = false;
  }

  function paintFollow() {
    followFrame = 0;
    if (!followEl?.isConnected || !followPoint) return endFollow();
    const r = followEl.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.max(0, Math.min(1, (followPoint.x - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (followPoint.y - r.top) / r.height));
    const small = followEl.matches(SMALL);
    // cartões grandes inclinam pouco; botões e itens do menu, mais
    const tiltY = small ? (r.width > 150 ? 10 : 20) : Math.min(10, 1600 / r.width);
    const tiltX = small ? 18 : Math.min(9, 1400 / r.height);
    followEl.style.setProperty("--pvn-ry", ((x - 0.5) * tiltY).toFixed(2) + "deg");
    followEl.style.setProperty("--pvn-rx", ((0.5 - y) * tiltX).toFixed(2) + "deg");
    followEl.style.setProperty("--pvn-x", (x * 100).toFixed(1) + "%");
    followEl.style.setProperty("--pvn-y", (y * 100).toFixed(1) + "%");
    followEl.style.setProperty("--pvn-sc", small ? "1.04" : "1.015");
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !settings.tilt || !settings.theme || reducedMotion.matches) return;
    let target = event.target instanceof Element ? event.target.closest(FOLLOW_SELECTOR) : null;
    if (target && (target.closest(AD_SELECTOR) || target.querySelector(AD_SELECTOR) || target.closest(".dv-player-fullscreen"))) target = null;
    if (target !== followEl) {
      endFollow();
      if (!target) return;
      followEl = target;
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
        followRestorePos = true;
      }
      followSpot = document.createElement("span");
      followSpot.className = "pvn-spot";
      followSpot.setAttribute("aria-hidden", "true");
      target.appendChild(followSpot);
      target.classList.add("pvn-follow");
    }
    followPoint = { x: event.clientX, y: event.clientY };
    if (!followFrame) followFrame = requestAnimationFrame(paintFollow);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", endFollow);
  window.addEventListener("blur", endFollow);
  window.addEventListener("scroll", endFollow, { passive: true });
  reducedMotion.addEventListener("change", endFollow);

  // ---------- Azul do Prime → cor do tema ----------
  // As classes do Prime mudam a cada versão; a cor não. Elementos com o azul do Prime (#1A98FF e tons
  // próximos) ganham classes pvn-blue-* e o theme.css troca pela cor escolhida. Cada elemento é visto uma vez.
  const seen = new WeakSet();
  function isPrimeBlue(c) {
    const m = c && c.match(/[\d.]+/g);
    if (!m || (m[3] !== undefined && +m[3] < 0.5)) return false;
    const [r, g, b] = m.map(Number).map((x) => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (d < 0.25 || max !== b) return false;
    const sat = d / (1 - Math.abs(2 * l - 1));
    let h = (r - g) / d + 4; h *= 60;
    return h >= 195 && h <= 218 && sat > 0.6 && l > 0.3 && l < 0.7;
  }
  function recolor() {
    if (!settings.theme) return;
    let budget = 2500;
    for (const el of document.body.querySelectorAll("a, button, [role=button], span, div, svg, path, p, h1, h2, h3")) {
      if (seen.has(el)) continue;
      if (--budget < 0) break;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (isPrimeBlue(cs.backgroundColor)) el.classList.add("pvn-blue-bg");
      if (isPrimeBlue(cs.color) || (el instanceof SVGElement && isPrimeBlue(cs.fill))) el.classList.add("pvn-blue-fg");
      if (cs.borderStyle !== "none" && isPrimeBlue(cs.borderTopColor)) el.classList.add("pvn-blue-border");
    }
  }

  // ---------- Botão do player flutuante ----------
  // O Prime é uma página única: abre o player e troca de título sem recarregar a página.
  let btnTimer = 0;
  const refreshButton = () => {
    if (btnTimer) return;
    btnTimer = setTimeout(() => {
      btnTimer = 0;
      ensureFx();
      recolor();
      if (settings.floatButton) float?.ensureButton();
    }, 400);
  };
  // o Prime troca de página sem recarregar (SPA): o observador abaixo cobre as trocas
  new MutationObserver(refreshButton).observe(document.body, { childList: true, subtree: true });
})();
