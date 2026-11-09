(() => {
  if (window.__gmNeonLoaded) return;
  window.__gmNeonLoaded = true;

  const DEFAULTS = {
    theme: true, tilt: true, composeFx: true, privacy: false,
    color: "purple", background: "aurora"
  };
  const COLORS = new Set(["purple", "blue", "pink", "cyan", "green", "bullet"]);
  const BACKGROUNDS = new Set(["aurora", "stars", "matrix", "synthwave", "bokeh", "warp", "rain", "fireflies", "orbit", "bullet", "none"]);
  const settings = { ...DEFAULTS };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let fx;
  let activeRow = null;
  let oldTransform = "";
  let pointer = null;
  let tiltFrame = 0;
  let scanTimer = 0;

  function ensureFx() {
    if (fx?.isConnected) return;
    fx = document.createElement("div");
    fx.id = "gmn-fx";
    fx.setAttribute("aria-hidden", "true");
    const shape = document.createElement("div");
    shape.className = "gmn-fx-shape";
    const particles = document.createElement("div");
    particles.className = "gmn-fx-particles";
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
    const body = document.body;
    body.classList.toggle("gmn-theme", !!settings.theme);
    body.classList.toggle("gmn-tilt-on", !!settings.tilt);
    body.classList.toggle("gmn-compose-on", !!settings.composeFx);
    body.classList.toggle("gmn-privacy", !!settings.privacy);
    body.dataset.gmnColor = COLORS.has(settings.color) ? settings.color : "purple";
    body.dataset.gmnBg = settings.theme && BACKGROUNDS.has(settings.background) ? settings.background : "none";
    // fundo Bullet: o bullet-fx.js desenha num canvas dentro de #gmn-fx
    document.documentElement.dataset.bulletFx = body.dataset.gmnBg === "bullet" ? "#gmn-fx" : "off";
    if (!settings.tilt) resetTilt();
    syncPanel();
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

  function resetTilt() {
    if (tiltFrame) cancelAnimationFrame(tiltFrame);
    tiltFrame = 0;
    if (!activeRow) return;
    activeRow.classList.remove("gmn-tilting");
    activeRow.style.transform = oldTransform;
    activeRow.style.removeProperty("--gmn-x");
    activeRow.style.removeProperty("--gmn-y");
    activeRow = null;
  }

  function paintTilt() {
    tiltFrame = 0;
    if (!activeRow?.isConnected || !pointer || !settings.tilt || reducedMotion.matches) return resetTilt();
    const rect = activeRow.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (pointer.x - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (pointer.y - rect.top) / rect.height));
    activeRow.style.setProperty("--gmn-x", (x * 100).toFixed(1) + "%");
    activeRow.style.setProperty("--gmn-y", (y * 100).toFixed(1) + "%");
    activeRow.style.transform = `perspective(850px) rotateX(${((0.5 - y) * 8).toFixed(2)}deg) rotateY(${((x - 0.5) * 10).toFixed(2)}deg) scale(1.012)`;
  }

  // Hover 3D que segue o mouse: inclina o elemento conforme a posição do cursor e desenha
  // um degradê de luz exatamente onde o mouse está (menu lateral, faixa de apps e botões).
  const FOLLOW_SELECTOR = '.TO, [role="navigation"] .V6, [gh="cm"], .T-I-KE, [gh="tm"] .T-I, .G-atb .T-I, .gmn-markread, [role="main"] .amn button, [role="main"] .amn [role="button"]';
  let followEl = null;
  let followSpot = null;
  let followRestorePos = false;
  let followFrame = 0;
  let followPoint = null;

  function endFollow() {
    if (followFrame) cancelAnimationFrame(followFrame);
    followFrame = 0;
    if (!followEl) return;
    followEl.classList.remove("gmn-follow");
    for (const p of ["--gmn-rx", "--gmn-ry", "--gmn-x", "--gmn-y"]) followEl.style.removeProperty(p);
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
    // Itens largos (menu) inclinam menos no eixo Y; botões pequenos inclinam mais.
    const tiltY = r.width > 120 ? 12 : 22;
    const tiltX = r.height > 30 ? 16 : 22;
    followEl.style.setProperty("--gmn-ry", ((x - 0.5) * tiltY).toFixed(2) + "deg");
    followEl.style.setProperty("--gmn-rx", ((0.5 - y) * tiltX).toFixed(2) + "deg");
    followEl.style.setProperty("--gmn-x", (x * 100).toFixed(1) + "%");
    followEl.style.setProperty("--gmn-y", (y * 100).toFixed(1) + "%");
  }

  function followPointer(event) {
    if (!settings.theme) return endFollow();
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
      followSpot.className = "gmn-spot";
      followSpot.setAttribute("aria-hidden", "true");
      target.appendChild(followSpot);
      target.classList.add("gmn-follow");
    }
    followPoint = { x: event.clientX, y: event.clientY };
    if (!followFrame) followFrame = requestAnimationFrame(paintFollow);
  }

  // Conversa aberta: o painel inteiro inclina de leve (no máximo ~1,5°) e o brilho segue o cursor
  // em qualquer ponto da janela, não só com o mouse em cima do painel. Um único pointermove
  // (passive) guarda a posição; o trabalho fica num rAF, com um getBoundingClientRect por quadro.
  let panelEl = null;
  let panelFrame = 0;
  let panelPoint = null;

  function findConversationPanel() {
    const title = document.querySelector('[role="main"] h2.hP');
    const panel = title?.closest('[role="main"] > div > div');
    return panel && panel.getClientRects().length ? panel : null;
  }

  function endPanel() {
    if (panelFrame) cancelAnimationFrame(panelFrame);
    panelFrame = 0;
    if (!panelEl) return;
    panelEl.classList.remove("gmn-panel3d");
    for (const p of ["--gmn-prx", "--gmn-pry", "--gmn-poy", "--gmn-px", "--gmn-py"]) panelEl.style.removeProperty(p);
    panelEl = null;
  }

  function paintPanel() {
    panelFrame = 0;
    if (!panelEl?.isConnected || !panelPoint) return endPanel();
    const r = panelEl.getBoundingClientRect();
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, innerHeight);
    const visibleH = Math.max(1, bottom - top);
    // Posição do cursor relativa ao painel, normalizada pela janela inteira: o painel reage
    // mesmo com o mouse na barra lateral ou no topo, com o máximo nas bordas da tela.
    const span = (lo, hi, v, min, max) => {
      const c = (lo + hi) / 2;
      const reach = v < c ? c - min : max - c;
      return Math.max(-1, Math.min(1, (v - c) / Math.max(1, reach)));
    };
    const nx = span(r.left, r.right, panelPoint.x, 0, innerWidth);
    const ny = span(top, bottom, panelPoint.y, 0, innerHeight);
    panelEl.style.setProperty("--gmn-pry", (nx * 1.5).toFixed(2) + "deg");
    panelEl.style.setProperty("--gmn-prx", (-ny * 1.2).toFixed(2) + "deg");
    panelEl.style.setProperty("--gmn-poy", (top - r.top + visibleH / 2).toFixed(0) + "px");
    // O brilho fica sempre dentro do painel: com o cursor fora (no menu da esquerda, no topo),
    // ele encosta na borda mais próxima e continua acompanhando o outro eixo.
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const inset = 24;
    const gx = clamp(panelPoint.x, r.left + inset, r.right - inset) - r.left;
    const gy = clamp(panelPoint.y, top + inset, bottom - inset) - r.top;
    panelEl.style.setProperty("--gmn-px", gx.toFixed(0) + "px");
    panelEl.style.setProperty("--gmn-py", gy.toFixed(0) + "px");
  }

  function syncPanel() {
    if (!settings.theme || !settings.tilt || reducedMotion.matches) return endPanel();
    const panel = panelEl?.isConnected && panelEl.querySelector("h2.hP") ? panelEl : findConversationPanel();
    if (panel !== panelEl) {
      endPanel();
      if (!panel) return;
      panelEl = panel;
      panel.classList.add("gmn-panel3d");
    }
    if (panelPoint && !panelFrame) panelFrame = requestAnimationFrame(paintPanel);
  }

  function followPanel(event) {
    panelPoint = { x: event.clientX, y: event.clientY };
    if (panelEl?.isConnected) {
      if (!panelFrame) panelFrame = requestAnimationFrame(paintPanel);
    } else {
      syncPanel();
    }
  }

  function centerPanel() {
    // Mouse saiu da janela: o painel volta ao centro suavemente (pela transição do CSS).
    panelPoint = { x: innerWidth / 2, y: innerHeight / 2 };
    if (panelEl && !panelFrame) panelFrame = requestAnimationFrame(paintPanel);
  }

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || !settings.tilt || reducedMotion.matches) return;
    followPointer(event);
    followPanel(event);
    const row = event.target instanceof Element ? event.target.closest("tr.zA") : null;
    if (row !== activeRow) {
      resetTilt();
      if (row) {
        activeRow = row;
        oldTransform = row.style.transform;
        row.classList.add("gmn-tilting");
      }
    }
    if (!activeRow) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!tiltFrame) tiltFrame = requestAnimationFrame(paintTilt);
  }, { passive: true, capture: true });
  document.addEventListener("pointerleave", () => { resetTilt(); endFollow(); centerPanel(); });
  window.addEventListener("blur", () => { resetTilt(); endFollow(); centerPanel(); });
  reducedMotion.addEventListener("change", () => { resetTilt(); syncPanel(); });

  document.addEventListener("keydown", (event) => {
    if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "p") {
      event.preventDefault();
      NS.local.set({ privacy: !settings.privacy });
    }
  });

  function controlName(el) {
    return [el.getAttribute("aria-label"), el.getAttribute("data-tooltip"), el.getAttribute("title"),
      (el.textContent || "").trim().slice(0, 90)].filter(Boolean).join(" ").toLowerCase();
  }

  function isVisible(el) {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden";
  }

  function scanComposers() {
    if (!settings.composeFx) return;
    document.querySelectorAll('[role="dialog"]').forEach((dialog) => {
      if (dialog.classList.contains("gmn-composer")) return;
      const hasRecipients = dialog.querySelector('input[name="to"], [name="to"], [aria-label*="recipient" i], [aria-label*="destinat" i]');
      const hasEditor = dialog.querySelector('[contenteditable="true"], textarea');
      if (hasRecipients && hasEditor) dialog.classList.add("gmn-composer");
    });
  }

  function luminance(color) {
    const m = color.match(/[\d.]+/g);
    if (!m) return 1;
    const [r, g, b] = m.map(Number);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  // Corpo de e-mail com texto escuro fica ilegível sobre o fundo neon: marca para inverter só o conteúdo.
  function scanBodies() {
    document.querySelectorAll(".a3s:not([data-gmn-checked])").forEach((body) => {
      if (!body.textContent.trim()) return;
      body.dataset.gmnChecked = "1";
      // Conta quantos trechos de texto estão escuros (cor inline do próprio e-mail) ou sobre fundo claro.
      let dark = 0, total = 0, lightBg = false;
      for (const el of [body, ...body.querySelectorAll("*")].slice(0, 400)) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        if (!lightBg && !/rgba\(.*, 0\)$/.test(bg) && luminance(bg) > 0.7 && el.getBoundingClientRect().width > 200) lightBg = true;
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
        total++;
        if (luminance(style.color) < 0.45) dark++;
      }
      body.classList.toggle("gmn-invert", lightBg || (total > 0 && dark / total > 0.4));
    });
  }

  // Corretor de contraste: o Gmail mantém superfícies claras (cartão de tradução, campos do compose,
  // chips) enquanto o tema deixa o texto claro. Superfícies claras viram escuras; texto escuro sobre
  // fundo escuro vira claro. Cada elemento é checado uma vez; o corpo dos e-mails fica com o scanBodies.
  const contrastChecked = new WeakSet();


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

  const POPUP_SELECTOR = '[role="menu"], [role="listbox"], .J-M, .SK, .goog-menu, .goog-popupmenu';
  let lastContrast = 0;
  let contrastRetry = 0;
  function fixContrast() {
    if (!settings.theme) return;
    const now = performance.now();
    if (now - lastContrast < 1000) { clearTimeout(contrastRetry); contrastRetry = setTimeout(fixContrast, 1050); return; }
    lastContrast = now;
    let budget = 2500;
    {
      for (const el of document.body.querySelectorAll("*")) {
        if (contrastChecked.has(el)) continue;
        if (!el.getClientRects().length) continue; // oculto: checa de novo quando aparecer
        if (--budget < 0) return;
        contrastChecked.add(el);
        if (el.closest('.a3s:not([contenteditable]), #gmn-fx, .gmn-markread') || el.matches("img,svg,path,video,canvas,iframe,script,style")) continue;
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const bg = style.backgroundColor;
        // Pop-ups e menus com outra estrutura (ex.: Gmail do Workspace, menus Closure .J-M/.SK/.goog-menu):
        // se o painel do menu não tiver fundo próprio, ele recebe o fundo sólido do tema.
        if (el.matches(POPUP_SELECTOR) && (isTransparent(bg) || luminance(bg) > 0.72)) {
          const panel = el.matches('[role="menu"], [role="listbox"]') && isTransparent(bg) ? (el.parentElement?.parentElement || el) : el;
          el.classList.add("gmn-popup");
          if (isTransparent(getComputedStyle(panel).backgroundColor) || luminance(getComputedStyle(panel).backgroundColor) > 0.72) panel.classList.add("gmn-popup");
        }
        if (!isTransparent(bg) && luminance(bg) > 0.72 && style.backgroundImage === "none" &&
            rect.width > 14 && rect.height > 14 && !el.matches('[role="checkbox"], .T-Jo')) {
          el.classList.add("gmn-surface");
        }
        const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || el.matches("input, textarea");
        if (!hasText) continue;
        const fg = luminance(style.color);
        const back = luminance(effectiveBg(el));
        if (back < 0.4 && fg < 0.5) el.classList.add(el.closest("a") ? "gmn-ink-link" : "gmn-ink");
      }
    }
  }

  function ensureMarkReadButton() {
    if (!settings.theme) return;
    const toolbar = [...document.querySelectorAll('[role="main"] [gh="tm"]')].find(isVisible);
    if (!toolbar || toolbar.querySelector(".gmn-markread")) return;
    const refresh = [...toolbar.querySelectorAll('[role="button"]')].find((el) => /refresh|atualizar/i.test(controlName(el)));
    if (!refresh) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gmn-markread";
    button.title = "Marcar todas as mensagens como lidas";
    const icon = document.createElement("b");
    icon.textContent = "✓";
    const text = document.createElement("span");
    text.textContent = "Marcar tudo como lido";
    button.append(icon, text);
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!confirm("Marcar todas as conversas desta caixa como lidas?")) return;
      button.disabled = true;
      try { alert(await markAllRead()); }
      catch (error) { alert(error.message || String(error)); }
      finally { button.disabled = false; }
    });
    const anchor = refresh.closest(".G-Ni") || refresh;
    anchor.after(button);
  }

  const observer = new MutationObserver(() => {
    if (scanTimer) return;
    scanTimer = setTimeout(() => { scanTimer = 0; scanComposers(); scanBodies(); ensureMarkReadButton(); fixContrast(); syncPanel(); }, 250);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  scanComposers();
  scanBodies();
  setTimeout(fixContrast, 600);

  document.addEventListener("click", (event) => {
    if (!settings.composeFx || reducedMotion.matches) return;
    const button = event.target instanceof Element ? event.target.closest('button, [role="button"]') : null;
    const dialog = button?.closest(".gmn-composer");
    if (!dialog || !/^(send|enviar)(\b|$)/i.test(controlName(button))) return;
    const rect = button.getBoundingClientRect();
    const spark = document.createElement("div");
    spark.className = "gmn-send-spark";
    spark.textContent = "✦";
    spark.style.left = (rect.left + rect.width / 2) + "px";
    spark.style.top = (rect.top + rect.height / 2) + "px";
    document.body.appendChild(spark);
    spark.addEventListener("animationend", () => spark.remove(), { once: true });
    setTimeout(() => spark.remove(), 1200);
  }, true);

  function waitFor(find, timeoutMs = 1800) {
    return new Promise((resolve) => {
      const start = Date.now();
      const timer = setInterval(() => {
        const result = find();
        if (result || Date.now() - start > timeoutMs) {
          clearInterval(timer);
          resolve(result || null);
        }
      }, 80);
    });
  }

  function findSelectAll() {
    const toolbar = document.querySelector('[role="main"] [role="toolbar"], .G-atb, [gh="tl"]');
    if (!toolbar) return null;
    const candidates = toolbar.querySelectorAll('[role="checkbox"], [aria-label], [data-tooltip]');
    return [...candidates].find((el) => {
      const name = controlName(el);
      return isVisible(el) && ((el.getAttribute("role") === "checkbox" && /select|selecion/i.test(name)) ||
        /select all|selecionar tudo|selecionar todas/i.test(name));
    }) || null;
  }

  function findAllConversationsLink() {
    const candidates = document.querySelectorAll('a, [role="link"]');
    return [...candidates].find((el) => isVisible(el) &&
      /select all conversations|selecionar todas as conversas|selecionar todas as mensagens/i.test(controlName(el))) || null;
  }

  function findMarkRead() {
    const candidates = document.querySelectorAll('button, [role="button"], [data-tooltip]');
    return [...candidates].find((el) => {
      const name = controlName(el);
      return isVisible(el) && !/unread|não lido|não lida/i.test(name) &&
        /mark as read|marcar como lido|marcar como lida/i.test(name);
    }) || null;
  }

  async function markAllRead() {
    if (!/^#(inbox|category\/)/.test(location.hash)) {
      throw new Error("Abra a Caixa de entrada do Gmail antes de marcar tudo como lido.");
    }
    const select = findSelectAll();
    if (!select) throw new Error("Não encontrei a seleção geral. Abra a caixa de entrada do Gmail e tente de novo.");
    if (select.getAttribute("aria-checked") === "true") {
      throw new Error("Há uma seleção ativa. Desmarque-a para evitar alterar só parte das mensagens.");
    }
    select.click();
    const allLink = await waitFor(findAllConversationsLink, 1000);
    if (allLink) allLink.click();
    if (!allLink && document.querySelectorAll("tr.zA").length >= 50) {
      select.click();
      throw new Error("O Gmail não ofereceu selecionar todas as conversas. Nenhuma mensagem foi alterada.");
    }
    const mark = await waitFor(findMarkRead, 1800);
    if (!mark) {
      throw new Error("Selecionei as mensagens, mas não achei ‘Marcar como lido’. Confira a seleção no Gmail.");
    }
    mark.click();
    return allLink
      ? "Todas as conversas selecionadas pelo Gmail foram marcadas como lidas."
      : "As mensagens selecionadas pelo Gmail foram marcadas como lidas.";
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "ping") {
      sendResponse({
        ok: true,
        version: chrome.runtime.getManifest?.().version,
        account: (location.pathname.match(/\/mail\/u\/(\d+)/) || [])[1] || "0",
        theme: document.body.classList.contains("gmn-theme"),
        menus: document.querySelectorAll('[role="menu"], .J-M').length
      });
      return;
    }
    if (message?.type !== "markAllRead") return;
    markAllRead().then(
      (result) => sendResponse({ ok: true, message: result }),
      (error) => sendResponse({ ok: false, error: error.message || String(error) })
    );
    return true;
  });
})();
