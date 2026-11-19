# Narrador para Android

App Android (WebView) que empacota `narrador/index.html` e liga a página ao motor
**TextToSpeech nativo** do Android (o WebView não tem `speechSynthesis`).

- Gerar localmente (Ubuntu/Debian):
  `sudo apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange && android/build.sh`
- No GitHub: o workflow **Build Narrador APK** gera o APK como artefato a cada mudança.
  Para manter a mesma assinatura entre versões, salve sua keystore nos secrets
  `NARRADOR_KEYSTORE_B64` (base64) e `NARRADOR_KEYSTORE_PASS`.
- `make_icon.py` regenera os ícones.

Vozes mais naturais: instale as vozes Google em português (Brasil) em
Configurações › Acessibilidade › Saída de texto para fala. As vozes “Online” ★ são as melhores.
Também dá para compartilhar um texto de outro app direto para o Narrador.
