#!/usr/bin/env bash
# Gera o APK do Narrador sem Gradle, usando as ferramentas do Android SDK
# (Debian/Ubuntu: apt-get install android-sdk-platform-23 aapt apksigner zipalign dalvik-exchange).
set -euo pipefail
cd "$(dirname "$0")"
SDK_JAR="${ANDROID_JAR:-/usr/lib/android-sdk/platforms/android-23/android.jar}"
DX="$(command -v dalvik-exchange || command -v dx)"
OUT=build
rm -rf "$OUT" && mkdir -p "$OUT/gen" "$OUT/classes" "$OUT/assets"

cp ../narrador/index.html ../narrador/manifest.webmanifest "$OUT/assets/"

aapt package -f -m -J "$OUT/gen" -M AndroidManifest.xml -S res -I "$SDK_JAR"
javac -nowarn -Xlint:-options -source 8 -target 8 -bootclasspath "$SDK_JAR" -d "$OUT/classes" \
  $(find src "$OUT/gen" -name '*.java')
"$DX" --dex --output="$OUT/classes.dex" "$OUT/classes"

aapt package -f -M AndroidManifest.xml -S res -A "$OUT/assets" -I "$SDK_JAR" -F "$OUT/unsigned.apk"
(cd "$OUT" && aapt add unsigned.apk classes.dex >/dev/null)
zipalign -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

KS="${KEYSTORE:-narrador.keystore}"
if [ ! -f "$KS" ]; then
  keytool -genkeypair -keystore "$KS" -alias narrador -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass narrador -keypass narrador -dname "CN=Narrador, O=Lingua-Byte, C=BR" >/dev/null 2>&1
fi
apksigner sign --ks "$KS" --ks-key-alias narrador --ks-pass pass:"${KS_PASS:-narrador}" \
  --key-pass pass:"${KS_PASS:-narrador}" --out Narrador.apk "$OUT/aligned.apk"
apksigner verify Narrador.apk && echo "APK pronto: $(pwd)/Narrador.apk ($(du -h Narrador.apk | cut -f1))"
