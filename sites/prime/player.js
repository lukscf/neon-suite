// Prime Neon: recursos do player do Prime Video.
// Velocidade fina (0,25x a 4x), volume extra (Web Audio) e normalização, roda do mouse no volume,
// pular abertura e recapitulação, ir para o próximo episódio. Testado com o DRM do Prime: a velocidade
// e o Web Audio funcionam com o vídeo protegido.
// Nada disso age durante anúncios: com um anúncio na tela, velocidade, saltos e cliques automáticos param.
(() => {
  if (window.__pvnPlayer) return;
  window.__pvnPlayer = true;

  const Y = globalThis.PVN;
  const root = document.documentElement;
  const PLAYER = ".dv-player-fullscreen";
  let cfg = { ...Y.DEFAULTS };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const playerEl = () => document.querySelector(PLAYER);
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

  function getVideo() {
    const floating = window.__pvnFloat?.video?.();
    if (floating?.isConnected) return floating;
    const vids = [...document.querySelectorAll(`${PLAYER} video`)].filter((v) => v.readyState > 0 && v.getClientRects().length);
    return vids.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
  }

  // Anúncio na tela? O Prime mostra um selo "Anúncio"/"Ad" com contagem regressiva.
  const AD_TEXT = /^\s*(anúncio|anuncio|publicidade|ad|ads|advertisement)\b/i;
  function adShowing() {
    const p = playerEl();
    if (!p) return false;
    if (p.querySelector("[class*='ad-timer' i], [class*='adtimeindicator' i], [class*='ad-indicator' i]")) return true;
    for (const el of p.querySelectorAll("span, div, p")) {
      if (el.childElementCount || !el.textContent || el.textContent.length > 40) continue;
      if (AD_TEXT.test(el.textContent) && visible(el)) return true;
    }
    return false;
  }
  let adState = false;
  function syncAd() {
    const now = adShowing();
    if (now !== adState) { adState = now; root.classList.toggle("pvn-ad", now); }
    return now;
  }

  // ---------- Aviso na tela (OSD) ----------
  let osdTimer = 0;
  function osd(text) {
    const host = playerEl() || document.body;
    let el = document.getElementById("pvn-osd");
    if (!el || el.parentNode !== host) { el?.remove(); el = document.createElement("div"); el.id = "pvn-osd"; el.setAttribute("role", "status"); host.appendChild(el); }
    el.classList.toggle("in-page", host === document.body);
    el.textContent = text;
    el.classList.add("show");
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => el.classList.remove("show"), 1400);
  }

  let syncTimer = 0;
  function saveSetting(patch) {
    Object.assign(cfg, patch);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => Y.save(patch), 800);
  }

  // ---------- Velocidade ----------
  const fmtRate = (r) => r.toFixed(2).replace(/0$/, "").replace(".", ",");
  function setSpeed(rate) {
    const v = getVideo();
    if (!v || syncAd()) return;
    rate = Math.round(clamp(rate, 0.25, 4) * 100) / 100;
    v.playbackRate = rate;
    osd(`Velocidade ${fmtRate(rate)}x`);
  }
  let speedFor = null;
  function applyStartSpeed(force) {
    const v = getVideo();
    if (!v || syncAd()) return;
    if (!force && speedFor === v.currentSrc + "|" + Math.round(v.duration || 0)) return;
    speedFor = v.currentSrc + "|" + Math.round(v.duration || 0);
    const rate = +cfg.defaultSpeed || 1;
    if (Math.abs(v.playbackRate - rate) > 0.001) { v.playbackRate = rate; if (rate !== 1) osd(`Velocidade ${fmtRate(rate)}x`); }
  }

  // ---------- Volume extra e normalização (Web Audio) ----------
  const graphs = new WeakMap(); // <video> → { ctx, src, comp, gain }
  const wantGraph = () => cfg.boost > 100 || cfg.normalize;
  function ensureGraph() {
    const v = getVideo();
    if (!v || !wantGraph()) return null;
    if (graphs.has(v)) return graphs.get(v);
    if (!navigator.userActivation?.hasBeenActive) return null; // sem gesto, o áudio nasceria mudo
    try {
      const ctx = new AudioContext();
      const g = { ctx, src: ctx.createMediaElementSource(v), comp: ctx.createDynamicsCompressor(), gain: ctx.createGain() };
      g.comp.threshold.value = -26; g.comp.knee.value = 12; g.comp.ratio.value = 4; g.comp.attack.value = 0.005; g.comp.release.value = 0.25;
      graphs.set(v, g);
      route(g);
      return g;
    } catch (error) {
      console.warn("Prime Neon: volume extra indisponível", error);
      return null;
    }
  }
  function route(g = graphs.get(getVideo())) {
    if (!g) return;
    try { g.src.disconnect(); g.comp.disconnect(); g.gain.disconnect(); } catch {}
    if (cfg.normalize) { g.src.connect(g.comp); g.comp.connect(g.gain); } else g.src.connect(g.gain);
    g.gain.connect(g.ctx.destination);
    g.gain.gain.value = cfg.boost / 100 * (cfg.normalize ? 1.4 : 1);
    if (g.ctx.state === "suspended") g.ctx.resume().catch(() => {});
  }
  function setBoost(pct, show = true) {
    pct = clamp(Math.round(pct / 10) * 10, 100, 400);
    saveSetting({ boost: pct });
    if (pct > 100) ensureGraph();
    route();
    if (show) osd(pct > 100 ? `Volume extra ${pct}%` : "Volume extra desligado (100%)");
  }
  const onGesture = () => { if (wantGraph()) ensureGraph(); const g = graphs.get(getVideo()); if (g?.ctx.state === "suspended") g.ctx.resume().catch(() => {}); };
  document.addEventListener("pointerdown", onGesture, true);
  document.addEventListener("keydown", onGesture, true);

  // ---------- Roda do mouse no player ----------
  document.addEventListener("wheel", (e) => {
    if (!cfg.wheelVolume || e.ctrlKey) return;
    const p = e.target instanceof Element ? e.target.closest(PLAYER) : null;
    if (!p) return;
    const v = getVideo();
    if (!v) return;
    e.preventDefault();
    const up = e.deltaY < 0;
    const vol = v.muted ? 0 : Math.round(v.volume * 100);
    if (up && vol >= 100 && cfg.boost < 400) return setBoost(cfg.boost + 10);
    if (!up && cfg.boost > 100) return setBoost(cfg.boost - 10);
    const next = clamp(vol + (up ? 5 : -5), 0, 100);
    v.muted = next === 0;
    v.volume = next / 100;
    osd(`Volume ${next}%`);
  }, { passive: false, capture: true });

  // ---------- Pular abertura, recapitulação e ir ao próximo episódio ----------
  // Só aperta botões que o próprio Prime mostra; nunca durante anúncios.
  const INTRO = /pular (a )?(abertura|introdução|intro)|skip intro/i;
  const RECAP = /pular (a )?(recapitulação|resumo|recap)|skip recap/i;
  const NEXT = /próximo episódio|proximo episodio|next episode/i;
  const clicked = new WeakSet();
  function autoClick() {
    if (!(cfg.skipIntro || cfg.skipRecap || cfg.autoNext)) return;
    const p = playerEl();
    if (!p || syncAd()) return;
    for (const b of p.querySelectorAll("button, [role=button]")) {
      if (clicked.has(b) || !visible(b)) continue;
      const label = `${b.textContent} ${b.getAttribute("aria-label") || ""}`;
      let what = null;
      if (cfg.skipIntro && INTRO.test(label)) what = "Abertura pulada";
      else if (cfg.skipRecap && RECAP.test(label)) what = "Recapitulação pulada";
      else if (cfg.autoNext && NEXT.test(label) && b.closest(".atvwebplayersdk-nextupcard-wrapper, [class*='nextup' i]")) what = "Próximo episódio";
      if (!what) continue;
      clicked.add(b);
      b.click();
      osd(what);
      return;
    }
  }
  let clickTimer = 0;
  const scheduleAutoClick = () => { if (!clickTimer) clickTimer = setTimeout(() => { clickTimer = 0; autoClick(); }, 250); };

  // ---------- Atalhos ----------
  const ACTIONS = {
    speedUp: () => setSpeed((getVideo()?.playbackRate || 1) + +cfg.speedStep),
    speedDown: () => setSpeed((getVideo()?.playbackRate || 1) - +cfg.speedStep),
    speedReset: () => setSpeed(1),
    boostUp: () => setBoost(cfg.boost + 10),
    boostDown: () => setBoost(cfg.boost - 10),
    float: () => window.__pvnFloat?.toggle("atalho-pagina")
  };
  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t instanceof Element && (t.closest("input:not([type=range]), textarea, select, [contenteditable=''], [contenteditable=true]") || t.isContentEditable)) return;
    const combo = Y.comboOf(e);
    if (!combo) return;
    const action = Object.keys(cfg.shortcuts).find((k) => cfg.shortcuts[k] === combo);
    if (!action || !ACTIONS[action]) return;
    if (e.repeat && !/^(speed|boost)/.test(action)) return;
    if (!getVideo()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    ACTIONS[action]();
  }, true);

  chrome.runtime.onMessage.addListener((msg, _s, reply) => {
    if (msg?.type === "action" && ACTIONS[msg.action]) { ACTIONS[msg.action](); reply({ ok: true }); }
    else if (msg?.type === "state") {
      const v = getVideo();
      reply({ video: !!v, speed: v?.playbackRate || 1, boost: cfg.boost, ad: adState });
    }
  });

  // ---------- Eventos ----------
  const inPlayer = (e) => e.target instanceof HTMLVideoElement && (e.target.closest(PLAYER) || e.target === window.__pvnFloat?.video?.());
  document.addEventListener("loadedmetadata", (e) => {
    if (!inPlayer(e)) return;
    setTimeout(() => { applyStartSpeed(); if (wantGraph()) ensureGraph(); }, 400);
  }, true);
  let lastTick = 0;
  document.addEventListener("timeupdate", (e) => {
    if (!inPlayer(e)) return;
    const now = performance.now();
    if (now - lastTick < 900) return; // uma vez por segundo basta
    lastTick = now;
    syncAd();
    autoClick();
  }, true);
  // botões de pular aparecem e somem: observa só o player, e só enquanto ele existe
  let watched = null;
  const mo = new MutationObserver(scheduleAutoClick);
  setInterval(() => {
    const p = playerEl();
    if (p === watched) return;
    mo.disconnect();
    watched = p;
    if (p) mo.observe(p, { childList: true, subtree: true });
  }, 2000);

  // ---------- Configurações ----------
  function apply(prev) {
    window.__pvnFloat?.setMode(cfg.floatMode);
    window.__pvnFloat?.setFill(cfg.floatFill);
    if (wantGraph()) ensureGraph();
    route();
    if (prev && prev.defaultSpeed !== cfg.defaultSpeed) applyStartSpeed(true);
  }
  Y.load().then((c) => { cfg = c; apply(null); });
  NS.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const prev = { ...cfg };
    for (const [k, { newValue }] of Object.entries(changes)) if (k in Y.DEFAULTS) cfg[k] = newValue ?? Y.DEFAULTS[k];
    cfg = { ...cfg, ...Y.sanitize(cfg), shortcuts: { ...Y.DEFAULTS.shortcuts, ...(cfg.shortcuts || {}) } };
    apply(prev);
  });
})();
