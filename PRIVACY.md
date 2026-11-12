# Política de privacidade da Neon Suite

**Resumo: a extensão não coleta nem envia dados seus.** Não tem servidor, conta, analytics nem telemetria.

## Onde ela roda
Só em `mail.google.com`, `web.whatsapp.com`, `app.slack.com`, `www.youtube.com`, `www.primevideo.com`, `pluto.tv` e `calendar.google.com`.

## O que ela lê e por quê
| Site | O que é lido | Para quê |
|---|---|---|
| Todos | Estrutura da página (nomes de elementos e classes) | Aplicar o tema e pôr os botões |
| Gmail | Nada de e-mails | O "marcar tudo como lido" só aperta o botão do próprio Gmail, depois da sua confirmação |
| Calendar | Estrutura da página e o elemento sob o mouse (nenhum título ou detalhe de compromisso é lido) | Aplicar o tema, o brilho que segue o mouse nos compromissos e botões, e o "modo discreto" (Alt+P), que só borra o que já está na tela |
| WhatsApp | O áudio que você manda transcrever | Transcrição feita **no seu PC** pelo Whisper local; o áudio não sai do computador |
| Slack | Título, texto e foto das notificações que o Slack já ia mostrar | Montar o aviso neon ou o aviso do Windows; não é guardado nem registrado |
| Prime Video | O vídeo do player e os botões que o próprio Prime mostra (pular abertura, próximo episódio) | Player flutuante, velocidade, volume e, se ligado, apertar esses botões; nada é guardado |
| Pluto TV | O vídeo do player, o texto da legenda que o Pluto mostra e o botão "Pular" | Player flutuante (com a legenda), velocidade, volume e, se ligado, apertar o "Pular"; nada é guardado |
| YouTube | O vídeo da página, o código do vídeo e o endereço do canal | Player flutuante, velocidade, loops, captura, retomar de onde parou e velocidade por canal |

## O que fica guardado
| O quê | Onde |
|---|---|
| Preferências de cada site | `chrome.storage.local` / `chrome.storage.sync`, que acompanha a conta do navegador se a sincronização estiver ligada |
| YouTube: ponto em que parou (até 400 vídeos) e velocidade por canal | `chrome.storage.local`, só neste navegador; dá para apagar em Opções |
| WhatsApp: modelo Whisper e transcrições já feitas | Armazenamento local da extensão, só neste PC |
| Slack: vínculo aviso → aba, para o clique abrir a conversa | `chrome.storage.session`, apagado ao fechar o navegador |

## Conexões de rede
Só uma: na primeira transcrição do WhatsApp, o modelo Whisper é baixado do Hugging Face (huggingface.co). Fica guardado no PC e não envia nenhum áudio. Fora isso, a extensão não faz conexões de rede.

## Permissões
- **`storage` e `unlimitedStorage`:** preferências e o modelo Whisper local, que é grande.
- **`offscreen`:** rodar o Whisper num documento oculto da extensão.
- **`notifications`:** o aviso do Windows das mensagens do Slack.
- **`scripting`:** o atalho global e o popup abrem o player flutuante do YouTube.
- **`activeTab`:** o popup confere se a extensão está ativa na aba aberta.
- **Acesso aos sete sites:** aplicar o tema e os recursos só neles.

Projeto independente. Gmail, Calendar e YouTube são marcas do Google LLC, WhatsApp da Meta, Slack da Slack Technologies, LLC Prime Video da Amazon.com, Inc. e Pluto TV da Paramount.
