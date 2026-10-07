# ======================================================================
# JoyEarn Android App Bundle (.aab) - ProGuard & R8 Obfuscation Rules
# Target SDK: 34 (Android 14) / Min SDK: 21
# Package: com.joyearn.rewards.learning
# ======================================================================

# Optimization & Obfuscation Directives
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
-printmapping mapping.txt

# Preserve essential Android components & entry points
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Application
-keep public class * extends android.app.Service
-keep public class * extends android.content.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.app.backup.BackupAgentHelper
-keep public class * extends android.preference.Preference

# AndroidX and Support Library
-keep class androidx.** { *; }
-dontwarn androidx.**

# Trusted Web Activity (TWA) & Custom Tabs
-keep class androidx.browser.customtabs.** { *; }
-keep class androidx.browser.trusted.** { *; }
-keep class com.google.androidbrowserhelper.** { *; }

# Google Play In-App Billing (Play Billing Library v6/v7)
-keep class com.android.billingclient.api.** { *; }
-keep class com.google.android.gms.internal.play_billing.** { *; }
-dontwarn com.android.billingclient.api.**

# WebKit & JavaScript Interface Bridge
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep Parcelable creators
-keepclassmembers class * implements android.os.Parcelable {
    static ** CREATOR;
}

# Keep enum methods for resource resolution
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# R8 Resource Shrinking
-keepattributes SourceFile,LineNumberTable,*Annotation*,Signature,InnerClasses,EnclosingMethod
