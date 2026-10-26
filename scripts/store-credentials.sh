#!/usr/bin/env bash
# Writes the signing and store API keys from environment variables into .secrets/
# (gitignored) and creates credentials.json for EAS local credentials.
#
#   ASC_KEY_P8                .p8 App Store Connect key, base64        -> .secrets/asc-api-key.p8
#   PLAY_SERVICE_ACCOUNT_JSON Google service account key (JSON)        -> .secrets/play-service-account.json
#   IOS_CERT_P12_BASE64       Apple Distribution certificate (.p12)    -> .secrets/dist-cert.p12
#   IOS_CERT_PASSWORD         its password
#   ANDROID_KEYSTORE_BASE64   upload keystore; if missing, a new one is generated once
#   ANDROID_KEYSTORE_PASSWORD its password (also used for the key)
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .secrets
chmod 700 .secrets

need() { [ -n "${!1:-}" ] || { echo "Fehlt in der Umgebung: $1" >&2; exit 1; }; }

need ASC_KEY_P8
if grep -q BEGIN <<<"$ASC_KEY_P8"; then printf '%s\n' "$ASC_KEY_P8"; else base64 -d <<<"$ASC_KEY_P8"; fi > .secrets/asc-api-key.p8

need PLAY_SERVICE_ACCOUNT_JSON
printf '%s' "$PLAY_SERVICE_ACCOUNT_JSON" > .secrets/play-service-account.json

need IOS_CERT_P12_BASE64
need IOS_CERT_PASSWORD
base64 -d <<<"$IOS_CERT_P12_BASE64" > .secrets/dist-cert.p12

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  need ANDROID_KEYSTORE_PASSWORD
  base64 -d <<<"$ANDROID_KEYSTORE_BASE64" > .secrets/upload.keystore
elif [ ! -f .secrets/upload.keystore ]; then
  ANDROID_KEYSTORE_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:-$(openssl rand -hex 16)}"
  keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$ANDROID_KEYSTORE_PASSWORD" -keypass "$ANDROID_KEYSTORE_PASSWORD" \
    -keystore .secrets/upload.keystore -alias upload \
    -dname "CN=Josef Gallab, L=St. Johann in Tirol, C=AT" >/dev/null 2>&1
  printf '%s' "$ANDROID_KEYSTORE_PASSWORD" > .secrets/upload.keystore.password
  echo "Neuer Android-Upload-Keystore: .secrets/upload.keystore (Passwort in .secrets/upload.keystore.password)."
  echo "WICHTIG: beides sicher aufbewahren – ohne ihn lassen sich keine Updates hochladen."
fi
ANDROID_KEYSTORE_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:-$(cat .secrets/upload.keystore.password)}"

[ -f .secrets/profile.mobileprovision ] || python3 scripts/asc.py profil --ausfuehren

python3 - "$IOS_CERT_PASSWORD" "$ANDROID_KEYSTORE_PASSWORD" <<'EOF'
import json, sys
cert_pw, ks_pw = sys.argv[1:3]
json.dump({
    'android': {'keystore': {
        'keystorePath': '.secrets/upload.keystore', 'keystorePassword': ks_pw,
        'keyAlias': 'upload', 'keyPassword': ks_pw,
    }},
    'ios': {
        'provisioningProfilePath': '.secrets/profile.mobileprovision',
        'distributionCertificate': {'path': '.secrets/dist-cert.p12', 'password': cert_pw},
    },
}, open('credentials.json', 'w'), indent=2)
EOF
chmod 600 credentials.json .secrets/*
echo "credentials.json und .secrets/ bereit."
