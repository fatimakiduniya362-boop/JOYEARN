# ProGuard / R8 Obfuscation Rules for JoyEarn (Production Release)
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve TWA and Android Browser Helper
-keep class com.google.androidbrowserhelper.** { *; }
-dontwarn com.google.androidbrowserhelper.**
-keep class androidx.browser.customtabs.** { *; }
-dontwarn androidx.browser.customtabs.**

# Optimization & Obfuscation
-repackageclasses 'com.joyearn.rewards.learning.internal'
-allowaccessmodification
