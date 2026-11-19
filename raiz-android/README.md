# RAIZ · APK Android

O APK do RAIZ é um app Android (Capacitor) que abre o caderno publicado em
`https://lingua-byte.github.io/Nexi/linguas/`. Por isso:

- **O conteúdo se atualiza sozinho.** Toda mudança publicada no `main` chega ao app
  na próxima vez que ele for aberto, sem reinstalar.
- **Funciona offline** depois da primeira abertura (service worker do app web).
- **A cada publicação sai um APK novo** (`linguas/RAIZ.apk` no site), com número de
  versão maior e a mesma assinatura, então instala por cima do anterior sem perder nada.

## Baixar

`https://lingua-byte.github.io/Nexi/linguas/RAIZ.apk` — ou pelo botão “Baixar APK” no app.

## Quando é preciso reinstalar o APK

Só quando a parte nativa muda (ícone, permissões, configuração do Capacitor). Nesse caso,
aumente o número em `native-version.txt`: o app instalado mostra um aviso “Novo APK do RAIZ”.

## Gerar localmente

Requisitos: Node 22+, JDK 21, Android SDK (plataforma 36).

```sh
npm ci
npm run apk   # → android/app/build/outputs/apk/debug/app-debug.apk
```

A chave `android/app/raiz-debug.keystore` é de depuração (senha `android`), não é segredo.
Para a Play Store, use uma chave de release privada, fora do repositório.
