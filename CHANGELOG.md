# Histórico

## 1.2.3
- **WhatsApp: áudio não toca mais sozinho ao abrir uma conversa.** Para transcrever, a extensão aperta o play do áudio sem som e pausa. O WhatsApp às vezes chamava o play uma segunda vez (áudio ainda baixando) e esse segundo play saía com som.
  - Agora, durante a captura e alguns segundos depois, todo play sem clique seu num balão de áudio fica mudo e é pausado.
  - Play que você mesmo dá num áudio continua tocando normalmente.
  - A captura só pega áudios de voz (blob:).

## 1.2.2
- **Pluto TV:** com o nosso player flutuante aberto (completo ou mínimo), o mini player do próprio Pluto, que aparece ao rolar a página, fica escondido. Ele só mostraria o aviso "Tocando no player flutuante". Volta sozinho quando o flutuante fecha.

## 1.2.1
- **Pluto TV: o tema agora aparece.** O Pluto pinta o site inteiro com os tokens de cor do design system dele, e o tema só mudava o fundo da página, que ficava escondido atrás do preto. Agora os tokens seguem a cor escolhida:
  - fundo e painéis do guia;
  - seleção do canal;
  - links, botões e foco;
  - rodapé.
  A tela de fundo fica transparente para o fundo animado aparecer.

## 1.2.0
- **Pluto TV**, o sexto site da Suite. O menu, o ícone e as preferências são próprios.
  - **Tema neon** com 6 cores, incluindo Bullet. O amarelo do Pluto vira a cor do tema, o guia de canais e o menu brilham e inclinam com o mouse, e há fundo animado atrás do conteúdo.
  - **Player flutuante sempre por cima:** testado com o DRM do Pluto, a imagem aparece. A legenda do Pluto também vai para a janela, e há os modos completo e mínimo.
  - **Volume extra até 400%**, normalização e roda do mouse no volume.
  - **Velocidade** de 0,25x a 4x em filmes e séries. Na TV ao vivo ela fica em 1x, para não sair do sinal ao vivo.
  - **Opcional:** apertar sozinho o "Pular" do próprio Pluto (abertura e recapitulação). Nunca age durante anúncios.

## 1.1.1
- **Prime Video: legenda na janela flutuante.** O Prime desenha a legenda numa camada da página, fora do vídeo. Agora o texto é copiado em tempo real para a janela flutuante (modo completo), com fundo escuro e tamanho proporcional à janela. A legenda sobe quando os controles aparecem. Para ligar e desligar, use o botão de legendas do próprio Prime.

## 1.1.0
- **Prime Video**, o quinto site da Suite. O menu, o ícone e as preferências são próprios.
  - **Tema neon** com 6 cores, incluindo Bullet. O azul do Prime vira a cor do tema, as capas dos títulos brilham e inclinam com o mouse, e há fundo animado fora do player.
  - **Player flutuante sempre por cima:** testado com o DRM do Prime, a imagem aparece. Tem o modo completo, com controles neon e esticar, e o modo mínimo.
  - **Velocidade** de 0,25x a 4x, **volume extra até 400%**, normalização e roda do mouse no volume.
  - **Automático (opcional):** pular abertura, pular recapitulação e ir ao próximo episódio. Só aperta os botões do próprio Prime e nunca age durante anúncios.
  - **Atalhos editáveis** na página de opções do Prime.
- A página inicial da Suite e o "Cor em todos os sites" incluem o Prime Video.

## 1.0.0
- Primeira versão da **Neon Suite**, que junta numa extensão só o GM Neon 1.4.0 (Gmail), o WP Neon 2.3.0 (WhatsApp Web), o SL Neon 1.2.0 (Slack) e o YT Neon 1.0.0 (YouTube).
- **Popup por site:** o ícone abre o menu do site da aba. Fora deles, abre a página inicial com os quatro sites e "Cor em todos os sites".
- **Ícone da barra por aba,** na cor escolhida para cada site.
- **Preferências separadas por site** e uma página de opções com backup (exportar/importar) e restaurar padrão por site.
