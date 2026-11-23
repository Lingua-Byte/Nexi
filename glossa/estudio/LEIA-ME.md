# Glossa Estúdio: gera os Shorts em MP4 (1080×1920)

Cada vídeo fica numa pasta `videos/<ID>/` (ID = código do roteiro, ex.: A1):
- `narracao.txt` – texto que a voz lê (números por extenso: "século nove", "dez horas").
- `cenas.json` – as cenas e a palavra da narração que dispara cada uma (`"em"`).
- `narracao.mp3` + `narracao.json` – gerados pelo `tts.py` (áudio + tempo de cada palavra).

## Instalar no PC (uma vez)
1. Node.js 18+ (nodejs.org), Python 3 (python.org) e ffmpeg (ffmpeg.org; no Windows: `winget install ffmpeg`).
2. Nesta pasta: `npm install`, depois `npx playwright install chromium` e `pip install edge-tts`.

## Fazer um vídeo
```
python tts.py videos/A1/narracao.txt videos/A1/narracao     # narração grátis (voz pt-BR-AntonioNeural)
node render.js A1                                           # gera saida/A1.mp4
```
- Prévia rápida de quadros: `PREVIEW="2,10,20" node render.js A1` (no Windows PowerShell: `$env:PREVIEW="2,10,20"; node render.js A1`).
- Outra voz: `python tts.py ... pt-BR-FranciscaNeural +4%`.
- Tipos de cena disponíveis (ver `motor.html`): palavra, mapa, digitos, citacao, etimo, transforma, glossario, proximo.
