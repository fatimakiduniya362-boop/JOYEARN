# 🌟 Livestar / JoyEarn — Complete Project Handover Documentation

This package is the complete, independent, standalone source code repository for **JoyEarn / Livestar**, a family-friendly educational rewards platform with native Android App Bundle (.AAB) packaging, PWA support, and interactive analytics.

---

## 📁 Repository Structure Overview

```text
├── src/
│   ├── components/             # All 30+ UI modal & interactive components
│   │   ├── StreakTrendChart.tsx         # 30-day consecutive streak & goal consistency chart (Recharts)
│   │   ├── WeeklyProgressTracker.tsx    # 7-day consistency bar chart & rolling average
│   │   ├── MilestoneComponent.tsx       # Streak badges & milestone claim system
│   │   ├── PersonalDashboardModal.tsx   # User Activity, Analytics & Earnings Dashboard
│   │   ├── ConfettiEffect.tsx           # Celebratory canvas confetti particle system
│   │   ├── LuckyWheelModal.tsx          # Spin-to-learn mini-game
│   │   ├── ScratchCardModal.tsx         # Scratch & earn mini-game
│   │   ├── LearnModal.tsx               # Educational quiz challenge module
│   │   ├── WatchModal.tsx               # Curated educational videos module
│   │   ├── WalletModal.tsx              # Points, ledger & withdrawal request management
│   │   ├── GardenModal.tsx              # Virtual learning garden mini-game
│   │   ├── DailyChestModal.tsx          # Daily mystery bonus chest
│   │   ├── GoogleAuthModal.tsx          # Authentication & Google login modal
│   │   ├── FirstOpenAuthScreen.tsx      # Welcome onboarding & sign-in screen
│   │   ├── SettingsModal.tsx            # Audio, haptics, theme, and language toggles
│   │   ├── PrivacyPolicyModal.tsx       # Safe family privacy policy
│   │   ├── TermsOfServiceModal.tsx      # Terms of service & virtual currency disclaimer
│   │   ├── DownloadReleaseModal.tsx     # In-app production artifact downloader
│   │   └── ...                          # Additional components (Achievements, FAQ, Parental Gate)
│   ├── data/
│   │   ├── quizDatabase.ts     # Curated educational question banks (Math, Science, Geography)
│   │   └── mockData.ts         # User profiles, mock leaders, and reward tiers
│   ├── services/
│   │   ├── googleAuth.ts       # Authentication service wrapper
│   │   ├── soundService.ts     # Web Audio API procedural sound effects synthesizer
│   │   ├── haptics.ts          # Mobile vibration haptic feedback provider
│   │   └── crashlytics.ts      # Client telemetry & error handling
│   ├── hooks/
│   │   ├── useHaptics.ts       # Haptic vibration hook
│   │   ├── usePWAInstall.ts    # PWA install prompt handler
│   │   └── useImmersiveMode.ts # Android full-screen viewport hook
│   ├── types.ts                # TypeScript domain models and state types
│   ├── App.tsx                 # Root application controller & navigation state
│   ├── main.tsx                # React entry point (DOM root)
│   └── index.css               # Global Tailwind CSS styles
├── public/                     # Static production assets
│   ├── icon.svg                # Vector master app icon
│   ├── apple-touch-icon.png    # iOS touch icon
│   ├── pwa-192x192.png         # PWA standard icon
│   ├── pwa-512x512.png         # PWA high-res icon
│   ├── pwa-maskable-512x512.png# Android adaptive maskable icon
│   ├── manifest.webmanifest    # Web App Manifest config
│   └── .well-known/assetlinks.json # Google Play Digital Asset Links
├── android-studio-project/     # Native Android Studio Gradle Project
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml # Android app manifest (SDK 34)
│   │   └── build.gradle        # App module Gradle configuration
│   ├── build.gradle            # Root Gradle project configuration
│   ├── settings.gradle         # Gradle settings file
│   └── gradle.properties       # JVM build flags & AndroidX configuration
├── android-release/            # Production signing & AAB tooling
│   ├── proguard-rules.pro      # R8/ProGuard obfuscation & code shrinking rules
│   ├── twa-manifest.json       # Trusted Web Activity / Play Store configuration
│   └── bundle-metadata.json    # Release bundle metadata
├── package.json                # Project dependencies and script definitions
├── tsconfig.json               # TypeScript compiler options
├── vite.config.ts              # Vite bundling & server configuration
├── metadata.json               # App metadata & permission descriptors
└── .env.example                # Environment variables template
```

---

## 🚀 Getting Started & Local Development

### 1. Requirements
- **Node.js**: v18.0.0 or higher
- **npm** (or **bun** / **yarn** / **pnpm**)

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
The application will launch at `http://localhost:3000`.

### 4. Build Production Web Bundle
```bash
npm run build
```
Compiled output will be placed in the `dist/` directory.

---

## 📱 Building Android Release Package (APK & AAB)

### Option A: Using Android Studio (Recommended for Play Store)
1. Open **Android Studio**.
2. Select **Open an Existing Project** and browse to the `android-studio-project/` folder.
3. Allow Gradle to sync.
4. Go to **Build** > **Generate Signed Bundle / APK**.
5. Select **Android App Bundle (.aab)**.
6. Choose your Keystore and alias.
7. Select **release** build variant and click **Finish**.
8. Your signed `.aab` file will be generated in `app/release/`.

### Option B: Using Gradle Command Line
```bash
cd android-studio-project
./gradlew bundleRelease
```

---

## 🔒 Security, Signing & Secrets
- Never commit release keystores or passwords to public repositories.
- Use environment variables or Android Studio keystore prompts for release signing.
- Template configurations are provided in `android-release/proguard-rules.pro` and `.env.example`.

---

## 🛡️ License & Ownership
Full rights and ownership belong to the repository holder.
