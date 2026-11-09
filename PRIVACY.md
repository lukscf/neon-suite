# Política de privacidade da Neon Suite

**Resumo: a extensão não coleta nem envia dados seus.** Não tem servidor, conta, analytics nem telemetria.

## Onde ela roda
Só em `mail.google.com`, `web.whatsapp.com`, `app.slack.com` e `www.youtube.com`.

## O que ela lê e por quê
| Site | O que é lido | Para quê |
|---|---|---|
| Todos | Estrutura da página (nomes de elementos e classes) | Aplicar o tema e pôr os botões |
| Gmail | Nada de e-mails | O "marcar tudo como lido" só aperta o botão do próprio Gmail, depois da sua confirmação |
| WhatsApp | O áudio que você manda transcrever | Transcrição feita **no seu PC** pelo Whisper local; o áudio não sai do computador |
| Slack | Título, texto e foto das notificações que o Slack já ia mostrar | Montar o aviso neon ou o aviso do Windows; não é guardado nem registrado |
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
- **Acesso aos quatro sites:** aplicar o tema e os recursos só neles.

Projeto independente. Gmail e YouTube são marcas do Google LLC, WhatsApp da Meta e Slack da Slack Technologies, LLC.
