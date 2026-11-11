<p align="center"><img src="icons/icon128.png" width="96" alt="Ícone da Neon Suite"></p>

# Neon Suite: tema neon e player flutuante

**Neon Suite** é uma extensão só para Chrome e Edge que junta o GM Neon, o WP Neon, o SL Neon e o YT Neon, e inclui também o Prime Video e o Pluto TV. Ela dá tema neon e recursos extras ao Gmail, ao WhatsApp Web, ao Slack, ao YouTube, ao Prime Video e ao Pluto TV.

**O menu abre conforme o site em que você está.** Clique no ícone da barra:
- no Gmail, abre o menu do Gmail;
- no YouTube, abre o do YouTube;
- em qualquer outro site, abre a página inicial com todos os sites e uma cor para aplicar em todos de uma vez.

O ícone da barra também muda conforme o site da aba, na cor escolhida para ele.

> Projeto independente, sem relação com Google, Meta, Slack/Salesforce, YouTube, Amazon ou Pluto TV. Gmail e YouTube são marcas do Google LLC, WhatsApp da Meta, Slack da Slack Technologies, LLC Prime Video da Amazon.com, Inc. e Pluto TV da Paramount.

## O que cada site ganha

| Site | Recursos |
|---|---|
| **Gmail** | Tema escuro neon, 6 cores, fundos animados, hover 3D que segue o mouse, compose neon, marcar tudo como lido (com confirmação) e modo discreto (Alt+P) |
| **WhatsApp Web** | Transcrição dos áudios recebidos **no seu PC** (Whisper local), tema neon com várias cores, fundos animados, efeitos 3D e fontes |
| **Slack** | Tema neon, fontes (Roboto Mono, Open Sans, Arial), fundos animados, **aviso neon de mensagens** com o Slack em foco e aviso do Windows com o ícone do tema e o botão "Abrir no Slack" |
| **Prime Video** | Tema neon, **player flutuante sempre por cima** (funciona com o DRM do Prime), velocidade de 0,25x a 4x, volume até 400%, normalização, roda do mouse no volume e, se você ligar, pular abertura e recapitulação e ir ao próximo episódio (nunca durante anúncios) |
| **Pluto TV** | Tema neon, **player flutuante sempre por cima com a legenda do Pluto**, volume até 400%, normalização, roda do mouse no volume, velocidade de 0,25x a 4x em filmes e séries (na TV ao vivo fica 1x) e, se você ligar, o "Pular" automático (nunca durante anúncios) |
| **YouTube** | **Player flutuante sempre por cima** (completo, com esticar, ou mínimo, sem barra), velocidade de 0,25x a 4x com memória por canal, volume até 400%, loop A-B, captura de frame, qualidade padrão, retomar de onde parou, modo foco, esconder Shorts e comentários, grade com colunas ajustáveis e atalhos editáveis |

Todos os sites têm a cor Bullet e o fundo "Bullet: balas e cripto".

## Preferências

- **Separadas por site:** a cor do Gmail não muda a do Slack. A página inicial tem "Cor em todos os sites" para igualar tudo de uma vez.
- **Em Opções:** backup de tudo (exportar/importar `.json`), restaurar o padrão de cada site e os atalhos do YouTube.
- **Anúncios e downloads:** o YouTube não tem anúncios alterados nem download de vídeo.

## Instalar (modo desenvolvedor)

1. Remova o GM Neon, o WP Neon, o SL Neon e o YT Neon, se estiverem instalados. Senão, o tema é aplicado duas vezes.
2. Baixe e descompacte `neon-suite-1.0.0.zip`.
3. Abra `chrome://extensions` e ligue o **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e escolha a pasta.
5. Recarregue os sites abertos.

As preferências das extensões antigas não passam para a Suite, então é só escolher de novo.

## Estrutura

```
manifest.json       um manifest para os seis sites
background.js       service worker único: ícone por aba + background de cada site
ns.js               preferências por site (prefixo gmail:, whatsapp:, slack:, youtube:)
popup.*             abre o menu do site da aba; senão, a página inicial
options.*           backup e restaurar padrão
bullet-fx.js        fundo "Bullet: balas e cripto" (compartilhado)
fonts/              Open Sans e Roboto Mono (OFL)
sites/<site>/       código de cada site
```

Detalhes de privacidade em [PRIVACY.md](PRIVACY.md).
