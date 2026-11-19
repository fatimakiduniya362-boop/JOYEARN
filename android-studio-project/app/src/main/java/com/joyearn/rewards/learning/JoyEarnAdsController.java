package com.joyearn.rewards.learning;

import android.app.Activity;
import android.content.Context;
import android.util.Log;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdLoader;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.nativead.NativeAd;
import com.google.android.gms.ads.nativead.NativeAdOptions;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Native Google Mobile Ads (AdMob) + Google User Messaging Platform (UMP) controller.
 *
 * Policy & Safety Guarantees:
 * - Single-initialization guard prevents duplicate MobileAds.initialize() calls.
 * - Requests UMP consent information and shows consent form when required before initializing ads.
 * - Uses BuildConfig ad unit IDs (debug=Google test IDs, release=production IDs only).
 * - Rewarded ads NEVER credit withdrawable cash or cash-convertible wallet points;
 *   callbacks are strictly limited to non-transferable in-app perks.
 */
public final class JoyEarnAdsController {

    private static final String TAG = "JoyEarnAdsController";
    private static final JoyEarnAdsController INSTANCE = new JoyEarnAdsController();

    private final AtomicBoolean isMobileAdsInitializeCalled = new AtomicBoolean(false);
    private final AtomicBoolean isFullscreenAdShowing = new AtomicBoolean(false);

    @Nullable
    private ConsentInformation consentInformation;
    @Nullable
    private InterstitialAd interstitialAd;
    @Nullable
    private RewardedAd rewardedAd;
    @Nullable
    private NativeAd activeNativeAd;

    private JoyEarnAdsController() {}

    public static JoyEarnAdsController getInstance() {
        return INSTANCE;
    }

    public interface ConsentCallback {
        void onConsentFlowComplete(boolean canRequestAds, @Nullable String errorMessage);
    }

    public interface NonCashPerkCallback {
        void onPerkUnlocked(@NonNull String perkType, int amount);
        void onAdClosed();
    }

    /**
     * Runs Google UMP consent update, presents consent form if required,
     * and initializes Google Mobile Ads SDK once consent permits.
     */
    public void gatherConsentAndInitialize(@NonNull Activity activity, @Nullable ConsentCallback callback) {
        Context appContext = activity.getApplicationContext();
        consentInformation = UserMessagingPlatform.getConsentInformation(activity);

        ConsentRequestParameters params = new ConsentRequestParameters.Builder()
            .setTagForUnderAgeOfConsent(false)
            .build();

        consentInformation.requestConsentInfoUpdate(
            activity,
            params,
            () -> {
                if (activity.isFinishing() || activity.isDestroyed()) {
                    if (callback != null) {
                        callback.onConsentFlowComplete(canRequestAds(), "Activity no longer active for UMP form");
                    }
                    return;
                }
                UserMessagingPlatform.loadAndShowConsentFormIfRequired(
                    activity,
                    formError -> {
                        if (formError != null) {
                            Log.w(TAG, "UMP consent form error (" + formError.getErrorCode() + "): " + formError.getMessage());
                        }
                        boolean canRequest = canRequestAds();
                        if (canRequest) {
                            initializeMobileAdsOnce(appContext);
                        }
                        if (callback != null) {
                            callback.onConsentFlowComplete(
                                canRequest,
                                formError != null ? formError.getMessage() : null
                            );
                        }
                    }
                );
            },
            requestError -> {
                Log.w(TAG, "UMP consent info update failed (" + requestError.getErrorCode() + "): " + requestError.getMessage());
                boolean canRequest = canRequestAds();
                if (canRequest) {
                    initializeMobileAdsOnce(appContext);
                }
                if (callback != null) {
                    callback.onConsentFlowComplete(canRequest, requestError.getMessage());
                }
            }
        );

        // Returning users who already have valid consent can initialize immediately
        if (canRequestAds()) {
            initializeMobileAdsOnce(appContext);
        }
    }

    public boolean isPrivacyOptionsRequired() {
        return consentInformation != null
            && consentInformation.getPrivacyOptionsRequirementStatus()
                == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }

    public void showPrivacyOptionsForm(@NonNull Activity activity) {
        if (activity.isFinishing() || activity.isDestroyed()) {
            return;
        }
        UserMessagingPlatform.showPrivacyOptionsForm(
            activity,
            formError -> {
                if (formError != null) {
                    Log.w(TAG, "UMP privacy options form error: " + formError.getMessage());
                }
            }
        );
    }

    private void initializeMobileAdsOnce(@NonNull Context appContext) {
        if (!canRequestAds()) {
            Log.w(TAG, "UMP consent not satisfied (canRequestAds=false). Blocking MobileAds.initialize().");
            return;
        }
        if (BuildConfig.ADMOB_APP_ID == null || BuildConfig.ADMOB_APP_ID.isEmpty()) {
            Log.e(TAG, "AdMob App ID is empty. Skipping MobileAds.initialize().");
            return;
        }
        if (isMobileAdsInitializeCalled.getAndSet(true)) {
            return;
        }
        MobileAds.initialize(appContext, initializationStatus -> {
            Log.i(TAG, "Google Mobile Ads SDK initialized. TestMode=" + BuildConfig.IS_ADMOB_TEST_MODE);
            preloadInterstitial(appContext);
            preloadRewarded(appContext);
        });
    }

    public boolean canRequestAds() {
        return consentInformation != null && consentInformation.canRequestAds();
    }

    @Nullable
    public AdView attachBannerAd(@NonNull Context context, @NonNull ViewGroup container) {
        if (!canRequestAds() || BuildConfig.ADMOB_BANNER_UNIT_ID.isEmpty()) {
            return null;
        }
        AdView adView = new AdView(context);
        adView.setAdUnitId(BuildConfig.ADMOB_BANNER_UNIT_ID);
        adView.setAdSize(AdSize.BANNER);
        adView.setAdListener(new AdListener() {
            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                Log.w(TAG, "Banner failed to load: " + loadAdError.getMessage());
            }
        });
        container.removeAllViews();
        container.addView(adView);
        adView.loadAd(new AdRequest.Builder().build());
        return adView;
    }

    public void preloadInterstitial(@NonNull Context appContext) {
        if (!canRequestAds() || BuildConfig.ADMOB_INTERSTITIAL_UNIT_ID.isEmpty() || interstitialAd != null) {
            return;
        }
        InterstitialAd.load(
            appContext,
            BuildConfig.ADMOB_INTERSTITIAL_UNIT_ID,
            new AdRequest.Builder().build(),
            new InterstitialAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull InterstitialAd ad) {
                    interstitialAd = ad;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    interstitialAd = null;
                    Log.w(TAG, "Interstitial failed to load: " + loadAdError.getMessage());
                }
            }
        );
    }

    public boolean showInterstitial(@NonNull Activity activity, @Nullable Runnable onDismissed) {
        if (interstitialAd == null || !isFullscreenAdShowing.compareAndSet(false, true)) {
            return false;
        }
        InterstitialAd adToShow = interstitialAd;
        interstitialAd = null;
        adToShow.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                isFullscreenAdShowing.set(false);
                preloadInterstitial(activity.getApplicationContext());
                if (onDismissed != null) onDismissed.run();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                isFullscreenAdShowing.set(false);
                Log.w(TAG, "Interstitial failed to show: " + adError.getMessage());
                if (onDismissed != null) onDismissed.run();
            }
        });
        adToShow.show(activity);
        return true;
    }

    public void preloadRewarded(@NonNull Context appContext) {
        if (!canRequestAds() || BuildConfig.ADMOB_REWARDED_UNIT_ID.isEmpty() || rewardedAd != null) {
            return;
        }
        RewardedAd.load(
            appContext,
            BuildConfig.ADMOB_REWARDED_UNIT_ID,
            new AdRequest.Builder().build(),
            new RewardedAdLoadCallback() {
                @Override
                public void onAdLoaded(@NonNull RewardedAd ad) {
                    rewardedAd = ad;
                }

                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    rewardedAd = null;
                    Log.w(TAG, "Rewarded ad failed to load: " + loadAdError.getMessage());
                }
            }
        );
    }

    /**
     * Shows a rewarded ad for a strictly non-cash in-app perk (e.g., quiz hint or practice shield).
     * Never awards withdrawable cash or cash-convertible wallet points.
     */
    public boolean showRewardedForInAppPerk(@NonNull Activity activity, @NonNull NonCashPerkCallback callback) {
        if (rewardedAd == null || !isFullscreenAdShowing.compareAndSet(false, true)) {
            return false;
        }
        RewardedAd adToShow = rewardedAd;
        rewardedAd = null;
        adToShow.setFullScreenContentCallback(new FullScreenContentCallback() {
            @Override
            public void onAdDismissedFullScreenContent() {
                isFullscreenAdShowing.set(false);
                preloadRewarded(activity.getApplicationContext());
                callback.onAdClosed();
            }

            @Override
            public void onAdFailedToShowFullScreenContent(@NonNull AdError adError) {
                isFullscreenAdShowing.set(false);
                Log.w(TAG, "Rewarded ad failed to show: " + adError.getMessage());
                callback.onAdClosed();
            }
        });
        adToShow.show(activity, rewardItem ->
            callback.onPerkUnlocked("in_app_hint", Math.max(1, rewardItem.getAmount()))
        );
        return true;
    }

    public void loadNativeAd(@NonNull Context context, @NonNull NativeAd.OnNativeAdLoadedListener listener) {
        if (!canRequestAds() || BuildConfig.ADMOB_NATIVE_UNIT_ID.isEmpty()) {
            return;
        }
        AdLoader adLoader = new AdLoader.Builder(context, BuildConfig.ADMOB_NATIVE_UNIT_ID)
            .forNativeAd(nativeAd -> {
                if (activeNativeAd != null) {
                    activeNativeAd.destroy();
                }
                activeNativeAd = nativeAd;
                listener.onNativeAdLoaded(nativeAd);
            })
            .withAdListener(new AdListener() {
                @Override
                public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                    Log.w(TAG, "Native ad failed to load: " + loadAdError.getMessage());
                }
            })
            .withNativeAdOptions(new NativeAdOptions.Builder().build())
            .build();
        adLoader.loadAd(new AdRequest.Builder().build());
    }
}
