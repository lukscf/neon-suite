// Neon Suite: preferências separadas por site.
// Cada site (gmail, whatsapp, slack, youtube) enxerga só as próprias chaves: o código de cada um usa
// NS.local / NS.sync / NS.onChanged no lugar de chrome.storage, e aqui as chaves ganham o prefixo
// do site ("gmail:color", "slack:color"...). Assim a cor do Gmail não sobrescreve a do Slack.
(() => {
  if (globalThis.NeonNS) return;

  const SITES = {
    "mail.google.com": "gmail",
    "web.whatsapp.com": "whatsapp",
    "app.slack.com": "slack",
    "www.youtube.com": "youtube",
    "www.primevideo.com": "prime",
    "pluto.tv": "pluto",
    "calendar.google.com": "calendar"
  };
  const siteOfUrl = (url) => {
    try { return SITES[new URL(url).hostname] || null; } catch { return null; }
  };
  function siteFromContext() {
    if (typeof location === "undefined") return null;
    if (location.protocol === "chrome-extension:") {
      const m = location.pathname.match(/^\/sites\/([a-z]+)\//);
      return m ? m[1] : null;
    }
    return SITES[location.hostname] || null;
  }

  function make(site) {
    const P = site + ":";
    const pre = (k) => P + k;
    const strip = (obj) => {
      const out = {};
      for (const [k, v] of Object.entries(obj || {})) if (k.startsWith(P)) out[k.slice(P.length)] = v;
      return out;
    };
    const done = (promise, cb, map = (x) => x) => {
      const p = promise.then(map);
      if (typeof cb === "function") { p.then((v) => cb(v)); return undefined; }
      return p;
    };
    const area = (real) => ({
      get(keys, cb) {
        let req;
        if (keys == null) req = null;
        else if (typeof keys === "string") req = [pre(keys)];
        else if (Array.isArray(keys)) req = keys.map(pre);
        else req = Object.fromEntries(Object.entries(keys).map(([k, v]) => [pre(k), v]));
        return done(real.get(req), cb, strip);
      },
      set(items, cb) {
        return done(real.set(Object.fromEntries(Object.entries(items || {}).map(([k, v]) => [pre(k), v]))), cb, () => undefined);
      },
      remove(keys, cb) {
        return done(real.remove([].concat(keys).map(pre)), cb, () => undefined);
      },
      clear(cb) {
        return done(real.get(null).then((all) => real.remove(Object.keys(all).filter((k) => k.startsWith(P)))), cb, () => undefined);
      }
    });
    const wrapped = new Map();
    return {
      site,
      local: area(chrome.storage.local),
      sync: area(chrome.storage.sync),
      onChanged: {
        addListener(fn) {
          const w = (changes, areaName) => {
            const mine = strip(changes);
            if (Object.keys(mine).length) fn(mine, areaName);
          };
          wrapped.set(fn, w);
          chrome.storage.onChanged.addListener(w);
        },
        removeListener(fn) {
          const w = wrapped.get(fn);
          if (w) chrome.storage.onChanged.removeListener(w);
          wrapped.delete(fn);
        },
        hasListener(fn) { return wrapped.has(fn); }
      }
    };
  }

  globalThis.NeonNS = { make, siteOfUrl, siteFromContext, SITES };
  const site = siteFromContext();
  if (site) globalThis.NS = make(site);
})();
