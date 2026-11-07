# NEXI

Câmera com **filtros** e **máscaras de rosto** em tempo real, para web (PWA instalável) e Android (APK).

- 23 filtros (Verão, Dourado, Brisa, Pastel, Cinema, Lomo, Beleza, P&B, Neon, Glitch, Caleidoscópio…), com intensidade ajustável
- 9 máscaras com detecção de rosto (óculos, cachorro, gato, coroa, corações, olhos grandes, blush, bigode, arco-íris), funcionando offline
- Foto e vídeo com som; no Android salva direto na galeria (`Pictures/NEXI`, `Movies/NEXI`) e compartilha para qualquer app

## Estrutura

| Pasta | O que é |
|---|---|
| `www/` | O app (HTML/WebGL). É o que vai para o GitHub Pages e para dentro do APK |
| `www/vendor/mediapipe/` | Detecção de rosto (MediaPipe Face Landmarker, Apache-2.0) |
| `android/` | Projeto Android (Capacitor) + plugin nativo `NexiGalleryPlugin` (galeria e compartilhar) |

## Gerar o APK

Requisitos: Node 22+, JDK 21, Android SDK (plataforma 36).

```sh
npm ci
npm run apk   # → android/app/build/outputs/apk/debug/app-debug.apk
```

O workflow **Build Android APK** (GitHub Actions) gera o APK a cada push e o disponibiliza como artefato `NEXI-apk`.
