# Glossa Estúdio: gera os Shorts em MP4 (1080×1920, 30 fps)

## Como funciona
- `roteiros/dia-N.js`: os 7 vídeos do dia. Cada vídeo tem:
  - `narr`: a narração em trechos. Um número entre trechos é uma **pausa** em segundos; sem número, a pausa padrão é de 0,28 s. Um trecho `{t, voz}` lê uma palavra estrangeira com outra voz.
  - `cta`: a chamada final, falada e na tela (comentar `?`, salvar `↓`, seguir `+`, enviar `→`).
  - `cenas`: cada cena entra quando a narração fala a palavra indicada em `em`.
- `plano.js`: lê o plano editorial (`../conteudo`) e completa sozinho o número do termo do Glossário e o cartão "a seguir".
- `tts.py`: gera a narração com voz neural grátis (Edge, pt-BR) e o tempo de cada palavra, para a legenda.
- `motor.html`: as cenas na identidade visual (palavra, texto, cena, lugar, mapa, etimo, transforma, quiz, tribunal, pistas, contagem, pares, compara, desmonte, linha, glossario, fim).
- `render.js`: desenha quadro a quadro e grava o MP4 com o ffmpeg.

## Instalar no PC (uma vez)
1. Node.js 18+, Python 3 e ffmpeg (no Windows: `winget install ffmpeg`).
2. Nesta pasta: `npm install`, depois `npx playwright install chromium` e `pip install edge-tts`.

## Gerar vídeos
```
node semana.js 1          # dia 1 inteiro → saida/A1.mp4, saida/B3.mp4 …
node semana.js A1 C1      # vídeos específicos
```
- `PARALELO=3`: quantos vídeos renderizar ao mesmo tempo.
- `SO_TTS=1`: só gera as narrações.
- `PREVIEW="5,15,25"`: só salva quadros PNG para conferir.
- A narração só é refeita quando o texto muda. Para trocar a voz, use `voz: 'pt-BR-FranciscaNeural'` no roteiro.
- O texto do post (legenda e fonte) de cada vídeo fica em `videos/<ID>/post.txt`.

## Trilhas (música clássica em domínio público)
- `python musica.py`: gera a biblioteca `trilhas/` com interpretações próprias de partituras em domínio público (corpus aberto do music21). Composição e gravação ficam livres. Requer `pip install music21 numpy scipy`.
- `python baixar_trilhas.py`: troca as trilhas por gravações reais do Wikimedia Commons, só com licença domínio público ou CC0 (a licença é conferida automaticamente). Rode no PC.
- `node remixar.js 1 2 3`: aplica as trilhas em vídeos já renderizados, sem renderizar a imagem de novo. Os vídeos novos já saem com trilha.
- A música-tema de cada quadro fica em `trilhas.js` (TEMAS). O crédito vai no `post.txt` e no `posts.txt` do ZIP.
