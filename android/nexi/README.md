# Nexi (Android)

App central: abre a página do Nexi (`https://lingua-byte.github.io/nexi/`) e permite:

- abrir os web apps dentro do app (com progresso salvo);
- baixar e instalar os APKs do catálogo (pede uma vez a permissão "instalar apps desconhecidos");
- ver quais apps já estão instalados e abri-los.

A página conversa com o app pelo objeto `window.NexiAndroid`
(`version()`, `installedVersion(pkg)`, `openApp(pkg)`, `download(url)`).

Código: `app/src/main/java/com/linguabyte/nexi/MainActivity.java`.
