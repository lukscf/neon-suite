(() => {
  if (window.__caNeonLoaded) return;
  window.__caNeonLoaded = true;

  const DEFAULTS = {
    theme: true, tilt: true, privacy: false,
    color: "purple", background: "aurora"
  };
  const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);
  const BACKGROUNDS = new Set(["aurora", "stars", "matrix", "synthwave", "bokeh", "warp", "rain", "fireflies", "orbit", "bullet", "none"]);
  const settings = { ...DEFAULTS };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let fx;
  let scanTimer = 0;

  // ---------- Fundo animado ----------
  function ensureFx() {
    if (fx?.isConnected) return;
    fx = document.createElement("div");
    fx.id = "can-fx";
    fx.setAttribute("aria-hidden", "true");
    const shape = document.createElement("div");
    shape.className = "can-fx-shape";
    const particles = document.createElement("div");
    particles.className = "can-fx-particles";
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

  // O fundo cobre só a área da grade do calendário: começa onde a área principal (role=main) começa.
  function placeFx() {
    if (!fx) return;
    const main = document.querySelector('[role="main"]');
    const r = main?.getBoundingClientRect();
    if (r && r.width > 200) {
      fx.style.inset = `${Math.max(0, r.top)}px 0 0 ${Math.max(0, r.left)}px`;
    } else {
      fx.style.removeProperty("inset");
    }
  }

  function applySettings() {
    ensureFx();
    const body = document.body;
    body.classList.toggle("can-theme", !!settings.theme);
    body.classList.toggle("can-tilt-on", !!settings.tilt && !!settings.theme);
    body.classList.toggle("can-privacy", !!settings.privacy);
    body.dataset.canColor = COLORS.has(settings.color) ? settings.color : "purple";
    body.dataset.canBg = settings.theme && BACKGROUNDS.has(settings.background) ? settings.background : "none";
    // fundo Bullet: o bullet-fx.js desenha num canvas dentro de #can-fx
    document.documentElement.dataset.bulletFxDensity = "0.3";
    document.documentElement.dataset.bulletFx = body.dataset.canBg === "bullet" ? "#can-fx" : "off";
    if (!settings.tilt || !settings.theme) endFollow();
    placeFx();
    if (settings.theme) setTimeout(fixContrast, 300);
  }

  NS.local.get(DEFAULTS).then((stored) => {
    Object.assign(settings, stored);
    applySettings();
  });
  NS.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    for (const key of Object.keys(DEFAULTS)) {
      if (changes[key]) settings[key] = changes[key].newValue ?? DEFAULTS[key];
    }
    applySettings();
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "ping") return;
    sendResponse({
      ok: true,
      version: chrome.runtime.getManifest?.().version,
      theme: document.body.classList.contains("can-theme")
    });
  });

  // ---------- Hover 3D que segue o mouse: eventos e botões ----------
  // Eventos mantêm a própria cor (é o que organiza a agenda); o tema só acrescenta o brilho e a
  // inclinação ao passar o mouse, igual ao resto da Suite.
  const FOLLOW_SELECTOR = '[data-eventid], [role="button"]:not([aria-hidden="true"])';
  let followEl = null;
  let followSpot = null;
  let followRestorePos = false;
  let followFrame = 0;
  let followPoint = null;

  function endFollow() {
    if (followFrame) cancelAnimationFrame(followFrame);
    followFrame = 0;
    if (!followEl) return;
    followEl.classList.remove("can-follow");
    for (const p of ["--can-rx", "--can-ry", "--can-x", "--can-y"]) followEl.style.removeProperty(p);
    if (followRestorePos) followEl.style.removeProperty("position");
    followSpot?.remove();
    followEl = followSpot = null;
    followRestorePos = false;
  }

  function paintFollow() {
    followFrame = 0;
    if (!followEl?.isConnected || !followPoint) return endFollow();
    const r = followEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (followPoint.x - r.left) / r.width));
    const y = Math.max(0, Math.min(1, (followPoint.y - r.top) / r.height));
    const tiltY = r.width > 120 ? 10 : 18;
    const tiltX = r.height > 30 ? 6 : 14;
    followEl.style.setProperty("--can-ry", ((x - 0.5) * tiltY).toFixed(2) + "deg");
    followEl.style.setProperty("--can-rx", ((0.5 - y) * tiltX).toFixed(2) + "deg");
    followEl.style.setProperty("--can-x", (x * 100).toFixed(1) + "%");
    followEl.style.setProperty("--can-y", (y * 100).toFixed(1) + "%");
  }

  function followPointer(event) {
    const target = event.target instanceof Element ? event.target.closest(FOLLOW_SELECTOR) : null;
    if (target !== followEl) {
      endFollow();
      if (!target) return;
      followEl = target;
      if (getComputedStyle(target).position === "static") {
        target.style.position = "relative";
        followRestorePos = true;
      }
      followSpot = document.createElement("span");
      followSpot.className = "can-spot";
      followSpot.setAttribute("aria-hidden", "true");
      target.appendChild(followSpot);
      target.classList.add("can-follow");
    }
    followPoint = { x: event.clientX, y: event.clientY };
    if (!followFrame) followFrame = requestAnimationFrame(paintFollow);
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !settings.tilt || !settings.theme || reducedMotion.matches) return;
    followPointer(event);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", () => endFollow());
  window.addEventListener("blur", () => endFollow());
  reducedMotion.addEventListener("change", () => endFollow());
  window.addEventListener("resize", placeFx, { passive: true });

  // ---------- Modo discreto: Alt+P ----------
  // Útil em compartilhamento de tela: borra o título dos compromissos até passar o mouse em cima.
  document.addEventListener("keydown", (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && event.code === "KeyP") {
      event.preventDefault();
      event.stopPropagation();
      NS.local.set({ privacy: !settings.privacy });
    }
  }, true);

  // ---------- Corretor de contraste ----------
  // O Calendar mantém superfícies claras em vários diálogos e menus mesmo com o tema escuro.
  // Superfícies claras viram escuras; texto escuro sobre fundo escuro vira claro. Cada elemento
  // é checado uma vez. A cor dos próprios compromissos nunca é tocada.
  const contrastChecked = new WeakSet();
  const SKIP = "img,svg,path,video,canvas,iframe,script,style,[data-eventid],#can-fx,.can-spot";

  function luminance(color) {
    const m = color.match(/[\d.]+/g);
    if (!m) return 1;
    const [r, g, b] = m.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function isTransparent(color) {
    return color === "transparent" || /rgba\(.*,\s*0\)$/.test(color);
  }
  function effectiveBg(el) {
    for (let node = el; node && node !== document.documentElement; node = node.parentElement) {
      const bg = getComputedStyle(node).backgroundColor;
      if (!isTransparent(bg)) return bg;
    }
    return "rgb(16, 11, 26)";
  }

  let lastContrast = 0;
  let contrastRetry = 0;
  function fixContrast() {
    if (!settings.theme) return;
    const now = performance.now();
    if (now - lastContrast < 1000) { clearTimeout(contrastRetry); contrastRetry = setTimeout(fixContrast, 1050); return; }
    lastContrast = now;
    let budget = 2500;
    for (const el of document.body.querySelectorAll("*")) {
      if (contrastChecked.has(el)) continue;
      if (!el.getClientRects().length) continue; // oculto: checa de novo quando aparecer
      if (--budget < 0) { contrastRetry = setTimeout(fixContrast, 1050); return; }
      contrastChecked.add(el);
      if (el.matches(SKIP) || el.closest("[data-eventid], #can-fx")) continue;
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const bg = style.backgroundColor;
      if (!isTransparent(bg) && luminance(bg) > 0.72 && style.backgroundImage === "none" && rect.width > 14 && rect.height > 14) {
        el.classList.add("can-surface");
      }
      const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches("input, textarea");
      if (!hasText) continue;
      if (luminance(effectiveBg(el)) < 0.4 && luminance(style.color) < 0.5) {
        el.classList.add(el.closest("a") ? "can-ink-link" : "can-ink");
      }
    }
  }

  const observer = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = 0; ensureFx(); placeFx(); fixContrast(); }, 300);
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
