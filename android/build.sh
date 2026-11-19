#!/bin/bash
# Сборка Арми-Android.apk: aapt2 + javac + d8 + zipalign + apksigner
set -e
cd "$(dirname "$0")"
export PATH=~/jdk/bin:$PATH

BT=$(pwd)/android-14
PLAT=$(pwd)/android-34/android.jar
KEYSTORE=armi-release.keystore
KEYPASS="armi-local-build"
OUT_APK="/home/z/my-project/download/Арми-Android.apk"

echo "==> 1/6 aapt2: компиляция ресурсов"
"$BT/aapt2" compile --dir res -o build-res.zip

echo "==> 2/6 aapt2: линковка unsigned.apk"
rm -rf obj out
mkdir -p obj out
"$BT/aapt2" link -o out/unsigned.apk \
  -I "$PLAT" \
  --manifest AndroidManifest.xml \
  -A assets \
  build-res.zip

echo "==> 3/6 javac + d8: компиляция Java -> dex"
javac --release 8 -Xlint:-options -classpath "$PLAT" -d obj src/ru/armi/app/*.java
"$BT/d8" --release --lib "$PLAT" --output out obj/ru/armi/app/*.class
(cd out && zip -q -j unsigned.apk classes.dex)

echo "==> 4/6 zipalign"
"$BT/zipalign" -f 4 out/unsigned.apk out/aligned.apk

echo "==> 5/6 ключ подписи"
if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -keystore "$KEYSTORE" -alias armi -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$KEYPASS" -keypass "$KEYPASS" \
    -dname "CN=Armi, OU=Personal, O=Armi, C=RU"
  echo "Создан новый ключ $KEYSTORE — хранить для будущих обновлений!"
fi

echo "==> 6/6 подпись APK"
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-pass "pass:$KEYPASS" --key-pass "pass:$KEYPASS" \
  --out "$OUT_APK" out/aligned.apk

"$BT/apksigner" verify "$OUT_APK" && echo "Подпись: OK"
echo "==> Готово: $OUT_APK ($(du -h "$OUT_APK" | cut -f1))"
