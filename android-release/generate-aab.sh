#!/usr/bin/env bash
set -e

echo "===================================================="
echo "📦 Generating Google Play Store .AAB for JoyEarn"
echo "===================================================="

cd "$(dirname "$0")"

# Check if bubblewrap is installed
if ! command -v bubblewrap &> /dev/null; then
  echo "📥 Installing @bubblewrap/cli globally..."
  npm install -g @bubblewrap/cli
fi

# Ensure keystore exists or generate release upload key
KEYSTORE_FILE="./android.keystore"
if [ ! -f "$KEYSTORE_FILE" ]; then
  echo "🔑 Generating upload keystore (android.keystore)..."
  keytool -genkeypair -v -keystore android.keystore -alias joyearn-release \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=JoyEarn Release, OU=Mobile, O=JoyEarn, L=Mountain View, ST=California, C=US" \
    -storepass joyearn2026! -keypass joyearn2026!
  echo "✅ Keystore created successfully."
fi

echo "🚀 Building Android App Bundle (.aab)..."
bubblewrap build --manifest=twa-manifest.json

echo "===================================================="
echo "🎉 SUCCESS: app-release-bundle.aab is ready!"
echo "Location: $(pwd)/app-release-bundle.aab"
echo "Upload to Google Play Console: Production / Internal Testing"
echo "===================================================="
