(() => {
  if (window.__plNeonLoaded) return;
  window.__plNeonLoaded = true;

  const DEFAULTS = globalThis.PLN.DEFAULTS; // settings.js
  const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);
  const BACKGROUNDS = new Set(["aurora", "stars", "matrix", "synthwave", "bokeh", "warp", "rain", "fireflies", "orbit", "bullet", "none"]);
  const FONTS = new Set(["site", "mono", "opensans", "arial"]);
  const settings = { ...DEFAULTS };
  const root = document.documentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const float = window.__plnFloat;
  let fx;

  // ---------- Fundo animado (fica atrás do conteúdo) ----------
  function ensureFx() {
    if (fx?.isConnected) return;
    fx = document.createElement("div");
    fx.id = "pln-fx";
    fx.setAttribute("aria-hidden", "true");
    const shape = document.createElement("div");
    shape.className = "pln-fx-shape";
    const particles = document.createElement("div");
    particles.className = "pln-fx-particles";
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
    root.classList.toggle("pln-theme", theme);
    root.classList.toggle("pln-tilt-on", theme && !!settings.tilt);
    root.dataset.plnColor = COLORS.has(settings.color) ? settings.color : "purple";
    root.dataset.plnBg = theme && BACKGROUNDS.has(settings.background) ? settings.background : "none";
    root.dataset.plnFont = FONTS.has(settings.font) ? settings.font : "site";
    // fundo Bullet: densidade moderada, como no SL Neon (o fundo divide a tela com vídeos)
    root.dataset.bulletFxDensity = "0.4";
    root.dataset.bulletFx = root.dataset.plnBg === "bullet" ? "#pln-fx" : "off";
    if (!theme || !settings.tilt) endFollow();
    root.classList.toggle("pln-no-float-btn", !settings.floatButton);
    if (settings.floatButton) float?.ensureButton();
    else document.querySelectorAll(".pln-float-btn").forEach((b) => b.remove());
  }

  globalThis.PLN.load().then((stored) => {
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
  // Pluto: cartões do guia e do catálogo (CSS modules: o começo do nome da classe é estável) e botões. Nada no player.
  const FOLLOW_SELECTOR = [
    "[class*=ChannelRow_tileLink]", "[class*=_tileLink]", "[class*=Card_card]", "[class*=Tile_tile]",
    ".vds-nav-item", "[data-testid=button]"
  ].join(",");
  const AD_SELECTOR = "[class*=ad-slot i], [class*=advert i], [class*=sponsor i]";
  const SMALL = ".vds-nav-item, [data-testid=button], button";
  let followEl = null, followSpot = null, followRestorePos = false, followFrame = 0, followPoint = null;

  function endFollow() {
    if (followFrame) cancelAnimationFrame(followFrame);
    followFrame = 0;
    if (!followEl) return;
    followEl.classList.remove("pln-follow");
    for (const p of ["--pln-rx", "--pln-ry", "--pln-x", "--pln-y", "--pln-sc"]) followEl.style.removeProperty(p);
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
    followEl.style.setProperty("--pln-ry", ((x - 0.5) * tiltY).toFixed(2) + "deg");
    followEl.style.setProperty("--pln-rx", ((0.5 - y) * tiltX).toFixed(2) + "deg");
    followEl.style.setProperty("--pln-x", (x * 100).toFixed(1) + "%");
    followEl.style.setProperty("--pln-y", (y * 100).toFixed(1) + "%");
    followEl.style.setProperty("--pln-sc", small ? "1.04" : "1.015");
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !settings.tilt || !settings.theme || reducedMotion.matches) return;
    let target = event.target instanceof Element ? event.target.closest(FOLLOW_SELECTOR) : null;
    if (target && (target.closest(AD_SELECTOR) || target.querySelector(AD_SELECTOR) || target.closest("#alwaysOnPlayerContainer"))) target = null;
    if (target !== followEl) {
      endFollow();
      if (!target) return;
      followEl = target;
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
        followRestorePos = true;
      }
      followSpot = document.createElement("span");
      followSpot.className = "pln-spot";
      followSpot.setAttribute("aria-hidden", "true");
      target.appendChild(followSpot);
      target.classList.add("pln-follow");
    }
    followPoint = { x: event.clientX, y: event.clientY };
    if (!followFrame) followFrame = requestAnimationFrame(paintFollow);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", endFollow);
  window.addEventListener("blur", endFollow);
  window.addEventListener("scroll", endFollow, { passive: true });
  reducedMotion.addEventListener("change", endFollow);

  // ---------- Amarelo do Pluto → cor do tema ----------
  // Elementos com o amarelo do Pluto (#FFF200 e tons próximos) ganham classes pln-blue-*
  // (nome herdado do Prime) e o theme.css troca pela cor escolhida. Cada elemento é visto uma vez.
  const seen = new WeakSet();
  function isPrimeBlue(c) { // aqui: amarelo do Pluto
    const m = c && c.match(/[0-9.]+/g);
    if (!m || (m[3] !== undefined && +m[3] < 0.5)) return false;
    const [r, g, b] = m.map(Number).map((x) => x / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d < 0.5 || min !== b) return false;
    const h = 60 * ((g - b) / d);
    return r > 0.85 && g > 0.75 && h >= 45 && h <= 62;
  }
  function recolor() {
    if (!settings.theme) return;
    let budget = 2500;
    for (const el of document.body.querySelectorAll("a, button, [role=button], span, div, svg, path, p, h1, h2, h3")) {
      if (seen.has(el)) continue;
      if (--budget < 0) break;
      seen.add(el);
      const cs = getComputedStyle(el);
      if (isPrimeBlue(cs.backgroundColor)) el.classList.add("pln-blue-bg");
      if (isPrimeBlue(cs.color) || (el instanceof SVGElement && isPrimeBlue(cs.fill))) el.classList.add("pln-blue-fg");
      if (cs.borderStyle !== "none" && isPrimeBlue(cs.borderTopColor)) el.classList.add("pln-blue-border");
    }
  }

  // ---------- Botão do player flutuante ----------
  // O Pluto é uma página única: troca de canal e de título sem recarregar a página.
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
  // o Pluto troca de página sem recarregar (SPA): o observador abaixo cobre as trocas
  new MutationObserver(refreshButton).observe(document.body, { childList: true, subtree: true });
})();
