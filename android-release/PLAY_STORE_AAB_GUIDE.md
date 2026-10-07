# 🚀 JoyEarn Google Play Store Production Release Guide (.AAB)

**Package Name:** `com.joyearn.rewards.learning`  
**Version Code:** `2`  
**Version Name:** `1.2.0`  
**Target SDK:** `34` (Android 14)  
**Min SDK:** `21` (Android 5.0 Lollipop)  
**Architecture:** Full 64-bit & 32-bit universal support (via Google Play Dynamic Feature & Asset Delivery)  
**Output Bundle Path:** `android-release/app-release-bundle.aab`  
**Live PWA URL:** `https://ais-pre-yu4imjtkrbbrtd3hcg63dd-498458785197.asia-east1.run.app`  

---

## 🛠️ Option 1: 1-Click Instant .AAB Generation (No Android SDK Required)

If you don't have the Android SDK or Java installed locally, you can generate your signed `.aab` in 1 minute using Google & Microsoft's official **PWABuilder**:

1. Go to **[PWABuilder.com](https://www.pwabuilder.com)**.
2. Enter your live app URL:
   `https://ais-pre-yu4imjtkrbbrtd3hcg63dd-498458785197.asia-east1.run.app`
3. Click **Start**. The builder will inspect the manifest, service worker, and icons (all 100% green/ready).
4. Click **Package for Stores** → Select **Android**.
5. In Options:
   - **Package ID:** `com.joyearn.rewards.learning`
   - **App name:** `JoyEarn: Global Rewards & Learning`
   - **Launcher name:** `JoyEarn`
   - **Target SDK:** `34`
   - **Play Billing:** Enabled
6. Click **Generate Package**.
7. Download the `.zip` archive. Inside you will find:
   - `app-release-bundle.aab` (Signed Android App Bundle ready to upload to Google Play Console!)
   - `assetlinks.json` (Pre-configured Digital Asset Links)
   - `signing.keystore`

---

## 🛠️ Option 2: Build with Bubblewrap CLI (Automated Script)

If you prefer building from your terminal with Google's official Bubblewrap CLI:

```bash
# 1. Ensure you are in the project root
chmod +x android-release/generate-aab.sh

# 2. Run the build script
./android-release/generate-aab.sh
```

Or manually:
```bash
npm install -g @bubblewrap/cli
cd android-release
bubblewrap build --manifest=twa-manifest.json
```

Output file: `android-release/app-release-bundle.aab`

---

## 📲 Step 3: Google Play Console Upload (Step-by-Step)

### A. Internal Testing Track (Recommended First Step)
1. Log in to [Google Play Console](https://play.google.com/console).
2. Select your app: **JoyEarn: Global Rewards & Learning**.
3. In the left navigation, go to **Testing → Internal testing**.
4. Click **Create new release** (top right).
5. Drag and drop `app-release-bundle.aab`.
6. Enter Release Name: `1.2.0 (Build 2)`.
7. Enter Release Notes (English):
   ```
   • Initial global release of JoyEarn
   • Family-friendly educational quizzes and videos
   • Policy-compliant virtual JoyPoints (no monetary value)
   • Sticky high-contrast policy disclosures
   • Edge-to-edge immersive full-screen mode
   • Enhanced tactile haptic feedback
   ```
8. Click **Save** → **Review Release** → **Start rollout to Internal testing**.
9. Add your tester email to install and test directly on your Android phone.

---

### B. Production Release Track (Publish to the World)
1. In the Play Console left menu, go to **Release → Production**.
2. Click **Create new release**.
3. Select `app-release-bundle.aab` (or add from internal testing library).
4. Review the declaration:
   - **Content Rating:** Everyone (PEGI 3 / ESRB Everyone)
   - **Target Audience:** Families & General Audience
   - **Deceptive Behavior / Virtual Currency Policy:** JoyPoints are in-app virtual entertainment currency with no cash redemption.
   - **Financial Features Declaration:** Select "No financial or cash withdrawal features".
   - **Data Safety:** Zero sensitive data sold; standard TLS encryption.
5. Click **Save** → **Review Release** → **Start rollout to Production**.

---

## 🌐 Countries & Distribution Settings
- In Play Console, go to **Production → Countries/regions**.
- Ensure **"All 177+ countries and regions"** are enabled for global reach.
