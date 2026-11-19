# ProGuard / R8 Rules for JoyEarn (Production Release)
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Preserve TWA and Android Browser Helper
-keep class com.google.androidbrowserhelper.** { *; }
-dontwarn com.google.androidbrowserhelper.**
-keep class androidx.browser.customtabs.** { *; }
-dontwarn androidx.browser.customtabs.**

# Preserve Google Mobile Ads SDK (AdMob) & User Messaging Platform (UMP)
-keep class com.google.android.gms.ads.** { *; }
-keep class com.google.ads.** { *; }
-keep class com.google.android.ump.** { *; }
-dontwarn com.google.android.gms.ads.**
-dontwarn com.google.android.ump.**

# Preserve JoyEarn BuildConfig and native Ad/UMP controller
-keep class com.joyearn.rewards.learning.BuildConfig { *; }
-keep class com.joyearn.rewards.learning.JoyEarnAdsController { *; }
