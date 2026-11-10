// Pluto Neon: recursos do player do Pluto TV.
// Velocidade fina (0,25x a 4x, só em filmes e séries; a TV ao vivo fica em 1x), volume extra (Web Audio)
// e normalização, roda do mouse no volume e, se ligado, apertar o "Pular" do próprio Pluto.
// Nada disso age durante anúncios: com um anúncio na tela, velocidade e cliques automáticos param.
(() => {
  if (window.__plnPlayer) return;
  window.__plnPlayer = true;

  const Y = globalThis.PLN;
  const root = document.documentElement;
  const PLAYER = "#alwaysOnPlayerContainer";
  let cfg = { ...Y.DEFAULTS };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const playerEl = () => document.querySelector(PLAYER);
  const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";

  function getVideo() {
    const floating = window.__plnFloat?.video?.();
    if (floating?.isConnected) return floating;
    const vids = [...document.querySelectorAll(`${PLAYER} video`)].filter((v) => v.readyState > 0 && v.getClientRects().length);
    return vids.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0] || null;
  }

  // Anúncio na tela? O player do Pluto mostra o painel .ad-info-manager (sem a classe "remove")
  // ou a contagem .mini-player-ad-countdown enquanto um anúncio toca.
  function adShowing() {
    const p = playerEl();
    if (!p) return false;
    const info = p.querySelector(".ad-info-manager");
    if (info && !info.classList.contains("remove") && visible(info)) return true;
    const mini = p.querySelector(".mini-player-ad-countdown");
    return !!(mini && visible(mini) && mini.textContent.trim());
  }
  let adState = false;
  function syncAd() {
    const now = adShowing();
    if (now !== adState) { adState = now; root.classList.toggle("pln-ad", now); }
    return now;
  }

  // ---------- Aviso na tela (OSD) ----------
  let osdTimer = 0;
  function osd(text) {
    const host = playerEl() || document.body;
    let el = document.getElementById("pln-osd");
    if (!el || el.parentNode !== host) { el?.remove(); el = document.createElement("div"); el.id = "pln-osd"; el.setAttribute("role", "status"); host.appendChild(el); }
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
  const isLive = (v) => !isFinite(v.duration) || v.duration === 0;
  function setSpeed(rate) {
    const v = getVideo();
    if (!v || syncAd()) return;
    if (isLive(v)) return osd("TV ao vivo: velocidade fixa em 1x");
    rate = Math.round(clamp(rate, 0.25, 4) * 100) / 100;
    v.playbackRate = rate;
    osd(`Velocidade ${fmtRate(rate)}x`);
  }
  let speedFor = null;
  function applyStartSpeed(force) {
    const v = getVideo();
    if (!v || syncAd() || isLive(v)) return;
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
      console.warn("Pluto Neon: volume extra indisponível", error);
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

  // ---------- Apertar o "Pular" do Pluto ----------
  // O botão .skip-button aparece (sem "button_disabled") na abertura e na recapitulação de filmes e séries.
  const clicked = new WeakSet();
  const AD_WORD = /an[uú]ncio|propaganda|publicidade/i;
  function autoClick() {
    if (!cfg.skipIntro) return;
    const p = playerEl();
    if (!p || syncAd()) return;
    const b = p.querySelector(".skip-button:not(.button_disabled)");
    if (!b || clicked.has(b) || !visible(b) || AD_WORD.test(b.textContent)) return;
    clicked.add(b);
    b.click();
    osd("Pulado");
    setTimeout(() => clicked.delete(b), 15000); // o mesmo botão volta a valer no próximo trecho
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
    float: () => window.__plnFloat?.toggle("atalho-pagina")
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
      reply({ video: !!v, speed: v?.playbackRate || 1, boost: cfg.boost, ad: adState, live: v ? isLive(v) : false });
    }
  });

  // ---------- Eventos ----------
  const inPlayer = (e) => e.target instanceof HTMLVideoElement && (e.target.closest(PLAYER) || e.target === window.__plnFloat?.video?.());
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
    window.__plnFloat?.setMode(cfg.floatMode);
    window.__plnFloat?.setFill(cfg.floatFill);
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
