# JoyEarn / Livestar — Android Studio Production Build & Signing Guide
**Target SDK**: Android 14 (API level 34)  
**Package Name**: `com.joyearn.rewards.learning`  
**Application Type**: Production Android App Bundle (.aab) with embedded web assets  

---

## 📋 Table of Contents
1. [Prerequisites](#1-prerequisites)
2. [Project Setup & Structure](#2-project-setup--structure)
3. [Key Management & Keystore Creation](#3-key-management--keystore-creation)
4. [Configuring Automated Signing in Gradle](#4-configuring-automated-signing-in-gradle)
5. [Building the Signed .AAB via Android Studio GUI](#5-building-the-signed-aab-via-android-studio-gui)
6. [Building the Signed .AAB via Command Line (CLI)](#6-building-the-signed-aab-via-command-line-cli)
7. [Testing the .AAB with Google bundletool](#7-testing-the-aab-with-google-bundletool)
8. [Google Play Console Upload & AssetLinks Setup](#8-google-play-console-upload--assetlinks-setup)
9. [Troubleshooting & FAQs](#9-troubleshooting--faqs)

---

## 1. Prerequisites

Before starting, ensure your workstation has the following installed:
* **Android Studio**: Android Studio Ladybug (2024.2+), Hedgehog, or Koala.
  * Download: [developer.android.com/studio](https://developer.android.com/studio)
* **Java Development Kit (JDK)**: OpenJDK 17 or JDK 21 (bundled inside Android Studio at `Android Studio/jbr`).
* **Android SDK**:
  * Android SDK Platform 34 (Android 14)
  * Android SDK Build-Tools 34.0.0
  * Android SDK Command-line Tools (latest)
* **Node.js**: v18+ or v20+ LTS (to rebuild client web assets whenever changed).

---

## 2. Project Setup & Structure

The repository includes a ready-to-import native Gradle project located in:
```
android-studio-project/
├── build.gradle                       # Top-level Gradle build configuration
├── settings.gradle                    # Project module registry
├── gradle.properties                  # JVM memory and AndroidX flags
└── app/
    ├── build.gradle                   # App module build script (Target SDK 34, ProGuard)
    ├── proguard-rules.pro             # Release code obfuscation rules
    └── src/
        └── main/
            ├── AndroidManifest.xml    # App manifest with TWA and permission declarations
            ├── java/
            │   └── com/joyearn/rewards/learning/
            │       └── MainActivity.java   # Native launcher activity
            ├── res/
            │   └── values/
            │       ├── strings.xml    # App branding and resource strings
            │       └── styles.xml     # Fullscreen immersion theme
            └── assets/
                └── www/               # Embedded production SPA web application
                    ├── index.html     # Client HTML entry point
                    ├── assets/        # Minified JS, CSS, and vendor bundles
                    ├── manifest.webmanifest
                    ├── icon.svg & PWA icons
                    └── .well-known/assetlinks.json
```

### Opening in Android Studio
1. Launch **Android Studio**.
2. Click **Open** (or **File ➔ Open**).
3. Browse to and select the **`android-studio-project`** folder.
4. Wait 1–2 minutes for Gradle to sync all dependencies (`androidx.browser:browser`, `com.google.androidbrowserhelper:androidbrowserhelper`).

---

## 3. Key Management & Keystore Creation

Google Play requires every release App Bundle to be signed with a cryptographic private key.

### Option A: Generate Keystore via Android Studio (Recommended)
1. In Android Studio, go to the top menu: **Build ➔ Generate Signed Bundle / APK...**
2. Select **● Android App Bundle** and click **Next**.
3. Under **Key store path**, click **Create new...**
4. Set the following fields:
   * **Key store path**: Choose a secure location outside the repository (e.g., `~/joyearn-release.jks`).
   * **Password**: Create a strong password (minimum 12 characters).
   * **Alias**: `joyearn_release_key`
   * **Key Password**: Same as keystore password (recommended).
   * **Validity (years)**: `30` (must be at least 25 years for Google Play).
   * **Certificate details**: Fill in your First and Last Name, Organization (`JoyEarn / Livestar`), and Country Code.
5. Click **OK** to generate your keystore.

### Option B: Generate Keystore via Command Line (Terminal)
Run the standard JDK `keytool` command:
```bash
keytool -genkeypair -v \
  -keystore joyearn-release.jks \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias joyearn_release_key \
  -storetype JKS
```

> ⚠️ **CRITICAL SECURITY NOTICE**:  
> Back up your `joyearn-release.jks` file and passwords in multiple secure locations (e.g., password manager, cold backup). If you lose this key, you cannot update your app on the Google Play Store.

---

## 4. Configuring Automated Signing in Gradle

To avoid typing passwords every build, configure `android-studio-project/app/build.gradle`:

1. Create a file named `keystore.properties` inside `android-studio-project/` (add this file to `.gitignore`):
```properties
storeFile=/absolute/path/to/joyearn-release.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=joyearn_release_key
keyPassword=YOUR_KEY_PASSWORD
```

2. Open `android-studio-project/app/build.gradle` and ensure the signing configuration is active:
```groovy
android {
    ...
    signingConfigs {
        release {
            def propsFile = rootProject.file('keystore.properties')
            if (propsFile.exists()) {
                def props = new Properties()
                props.load(new FileInputStream(propsFile))
                storeFile file(props['storeFile'])
                storePassword props['storePassword']
                keyAlias props['keyAlias']
                keyPassword props['keyPassword']
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 5. Building the Signed .AAB via Android Studio GUI

1. In Android Studio, click: **Build ➔ Generate Signed Bundle / APK...**
2. Choose **● Android App Bundle (.aab)** ➔ click **Next**.
3. Select your `joyearn-release.jks`, enter your keystore password, select alias `joyearn_release_key`, and enter your key password.
4. Check **Remember passwords** (optional, recommended for development).
5. Click **Next**.
6. Select **Build Variants**: **`release`**.
7. Signature Versions: Check both **V1 (JAR Signature)** and **V2 (Full APK Signature)**.
8. Click **Finish**.

Gradle will compile, optimize via ProGuard/R8, package all embedded assets, and sign the bundle.  
Once finished, a popup in the bottom right corner will show:  
`Generate Signed Bundle: App bundle(s) generated successfully.`  
Click **locate** to view the output file:
```
android-studio-project/app/build/outputs/bundle/release/app-release.aab
```

---

## 6. Building the Signed .AAB via Command Line (CLI)

You can build headlessly without opening the Android Studio GUI:

```bash
# Navigate to the Android project folder
cd android-studio-project

# On Linux / macOS:
./gradlew :app:bundleRelease

# On Windows:
gradlew.bat :app:bundleRelease
```

The output bundle will be located at:
`android-studio-project/app/build/outputs/bundle/release/app-release.aab`

---

## 7. Testing the .AAB with Google bundletool

Before uploading to Google Play Console, you can test the bundle locally using Google's official `bundletool`:

```bash
# 1. Download bundletool from GitHub
curl -L -o bundletool.jar https://github.com/google/bundletool/releases/download/1.15.6/bundletool-all-1.15.6.jar

# 2. Generate an APK set (.apks) from your .aab
java -jar bundletool.jar build-apks \
  --bundle=android-studio-project/app/build/outputs/bundle/release/app-release.aab \
  --output=app-release.apks \
  --mode=universal \
  --ks=joyearn-release.jks \
  --ks-pass=pass:YOUR_PASSWORD \
  --ks-key-alias=joyearn_release_key \
  --key-pass=pass:YOUR_PASSWORD

# 3. Install directly onto an attached Android phone or emulator
java -jar bundletool.jar install-apks --apks=app-release.apks
```

---

## 8. Google Play Console Upload & AssetLinks Setup

### Extracting Your SHA-256 Fingerprint
To enable seamless full-screen mode (Trusted Web Activity without the browser address bar), link your Android app signature with the web host:

```bash
keytool -list -v -keystore joyearn-release.jks -alias joyearn_release_key
```

Look for the line:
`SHA256: 14:6D:E9:DE:8F:E2:E7:FE:...`

Ensure this fingerprint matches the entry in your `.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.joyearn.rewards.learning",
      "sha256_cert_fingerprints": [
        "YOUR_SHA256_FINGERPRINT_HERE"
      ]
    }
  }
]
```

### Uploading to Play Console
1. Log in to [Google Play Console](https://play.google.com/console).
2. Create or select your application: **JoyEarn: Global Rewards & Learning**.
3. In the left navigation, go to **Release ➔ Production** (or **Testing ➔ Internal testing** for initial testing).
4. Click **Create new release**.
5. Drag and drop `app-release.aab`.
6. Add Release Notes:
   * *"Initial release of JoyEarn: Global family rewards and learning application with interactive educational quizzes, video hub, daily streak tracking, and secure rewards."*
7. Click **Save ➔ Review release ➔ Start rollout to Production**.

---

## 9. Troubleshooting & FAQs

* **Error: `SDK location not found`**:  
  Create a `local.properties` file in `android-studio-project/`:
  * Windows: `sdk.dir=C\:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk`
  * macOS: `sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk`
  * Linux: `sdk.dir=/home/YOUR_USERNAME/Android/Sdk`

* **How do I update the web code?**:  
  Whenever you modify React files in `src/`, run:
  ```bash
  npm run build
  cp -r dist/* android-studio-project/app/src/main/assets/www/
  ```
  Then rebuild the bundle with `./gradlew :app:bundleRelease`.

* **How to increment the version code for Google Play updates**:  
  In `android-studio-project/app/build.gradle`, increment:
  ```groovy
  versionCode 2      // Increment by 1 for each new release
  versionName "1.0.1" // Human-readable version
  ```
