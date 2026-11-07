# android/

Apps Android nativos. Cada subpasta (`android/<nome>/`) é um projeto Gradle.

Ao fazer push na `main`, o workflow **Build Android apps** compila todos e publica cada APK em:

```
https://github.com/lingua-byte/nexi/releases/download/<nome>-android/<nome>.apk
```

Depois, adicione o app no `catalog.json` da raiz (tipo `"android"`, com `package` e `apk`) para ele aparecer no Nexi.

## Assinatura (importante para atualizar apps)

O Android só instala uma atualização se ela for assinada com a **mesma chave**. Sem chave configurada, o workflow usa uma chave de debug nova a cada build, e você teria que desinstalar antes de atualizar.

Crie uma chave uma vez (guarde o arquivo e as senhas, sem enviar para o repositório):

```bash
keytool -genkeypair -v -keystore nexi-release.jks -alias nexi -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 nexi-release.jks   # copie a saída
```

Em **Settings → Secrets and variables → Actions** do repositório, crie:

| Secret | Valor |
|---|---|
| `NEXI_KEYSTORE_BASE64` | a saída do `base64` |
| `NEXI_KEYSTORE_PASSWORD` | senha do keystore |
| `NEXI_KEY_ALIAS` | `nexi` |
| `NEXI_KEY_PASSWORD` | senha da chave |

## Compilar localmente

```bash
cd android/nexi
./gradlew assembleRelease   # precisa do Android SDK (ANDROID_HOME)
```
