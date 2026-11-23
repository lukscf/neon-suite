// slack: aprende o vínculo endereço do workspace → ID do workspace (ex.: minhaempresa.slack.com → T0123),
// para o background redirecionar links de <workspace>.slack.com direto para app.slack.com.
// Sem isso, esses links abrem a página "Iniciando..." do Slack, que pede ao Windows o app do Slack.
// Só endereço e ID são guardados; nada de mensagens, nomes ou usuário.
(() => {
  if (window.__slNeonLinks) return;
  window.__slNeonLinks = true;
  const NS = NeonNS.make("slack");
  const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.slack\.com$/;
  const ID = /^[TE][A-Z0-9]{4,}$/;

  function readTeams() {
    const found = {};
    try {
      const cfg = JSON.parse(localStorage.getItem("localConfig_v2") || "{}");
      for (const t of Object.values(cfg.teams || {})) {
        let host = "";
        try { host = t.url ? new URL(t.url).hostname : ""; } catch {}
        if (!host && t.domain) host = `${t.domain}.slack.com`;
        host = host.toLowerCase();
        if (HOST.test(host) && host !== "app.slack.com" && ID.test(t.id || "")) found[host] = t.id;
      }
    } catch {}
    return found;
  }

  let timer = 0;
  async function sync() {
    try {
      const found = readTeams();
      if (!Object.keys(found).length) return;
      const { teams = {} } = await NS.local.get({ teams: {} });
      const merged = { ...teams, ...found };
      if (JSON.stringify(merged) !== JSON.stringify(teams)) await NS.local.set({ teams: merged });
    } catch {
      // extensão recarregada ou removida com a aba aberta: o contexto antigo morreu, para de tentar
      clearInterval(timer);
    }
  }

  sync();
  // o Slack grava o localConfig depois do boot e quando você entra em outro workspace
  setTimeout(sync, 5000);
  timer = setInterval(sync, 60000);
})();
