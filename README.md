# Nexi — central dos meus programas

Nexi é ao mesmo tempo:

- **uma página web** → https://lingua-byte.github.io/nexi/
- **um app Android** → [baixar nexi.apk](https://github.com/lingua-byte/nexi/releases/download/nexi-android/nexi.apk)

Pelos dois dá para abrir todos os meus web apps e baixar/instalar todos os meus apps Android.
A lista de programas vem do arquivo [`catalog.json`](catalog.json).

## Estrutura

| Pasta | Para quê |
|---|---|
| `index.html`, `catalog.json` | A página Nexi e a lista de programas. |
| `apps/` | Web apps (publicados no GitHub Pages em `/apps/<nome>/`). |
| `android/` | Apps Android. Cada um vira um APK automaticamente ([detalhes](android/README.md)). |
| `tools/` | Scripts e utilitários. |
| `experiments/` | Protótipos e testes rápidos. |
| `templates/` | Modelos para começar um projeto novo. |

## Adicionar um programa

**Web app**
1. `cp -r templates/web-app apps/meu-app` e edite.
2. Adicione no `catalog.json`:
   ```json
   { "id": "meu-app", "name": "Meu App", "icon": "✨", "description": "…", "type": "web", "url": "apps/meu-app/" }
   ```

**App Android**
1. Crie o projeto em `android/meu-app/` (pode copiar `android/nexi` como base e trocar o `applicationId`).
2. Adicione no `catalog.json`:
   ```json
   { "id": "meu-app", "name": "Meu App", "icon": "🤖", "description": "…", "type": "android",
     "package": "com.linguabyte.meuapp",
     "apk": "https://github.com/lingua-byte/nexi/releases/download/meu-app-android/meu-app.apk" }
   ```

Faça push na `main`: a página é publicada e os APKs são compilados sozinhos.

## Regras simples

- Um projeto = uma pasta, cada uma com seu `README.md`.
- Nomes de pasta em minúsculas com hífen: `meu-app`.
- Nunca faça commit de chaves de API, senhas ou keystores.
