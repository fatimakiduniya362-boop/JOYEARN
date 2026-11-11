// ============================================================================
// 📱 JOYEARN ADMOB & ADS CONFIGURATION (EDITABLE & DYNAMIC)
// ============================================================================

export const DEFAULT_ADS_CONFIG = {
  ADS_ENABLED: false,
  AD_AFTER_FEATURE: true,
  INTERSTITIAL_COOLDOWN_SECONDS: 90,
  MAX_FULLSCREEN_ADS_PER_DAY: 12,
  NATIVE_AD_EVERY_N_ITEMS: 4,
  DEFAULT_ECPM: 1.5,
  DEFAULT_DAILY_REVENUE_TARGET: 100,
  DEFAULT_ADS_PER_USER_DAY: 5,
};

export const ADS_ENABLED = DEFAULT_ADS_CONFIG.ADS_ENABLED;
export const AD_AFTER_FEATURE = DEFAULT_ADS_CONFIG.AD_AFTER_FEATURE;
export const INTERSTITIAL_COOLDOWN_SECONDS = DEFAULT_ADS_CONFIG.INTERSTITIAL_COOLDOWN_SECONDS;
export const MAX_FULLSCREEN_ADS_PER_DAY = DEFAULT_ADS_CONFIG.MAX_FULLSCREEN_ADS_PER_DAY;
export const NATIVE_AD_EVERY_N_ITEMS = DEFAULT_ADS_CONFIG.NATIVE_AD_EVERY_N_ITEMS;

export interface DynamicAdsConfig {
  adsEnabled: boolean;
  adAfterFeature: boolean;
  interstitialCooldownSeconds: number;
  maxFullscreenAdsPerDay: number;
  nativeAdEveryNItems: number;
  dailyRevenueTargetUSD: number;
  averageECPMUSD: number;
  averageAdsPerUserDay: number;
}

const STORAGE_KEY = 'joyearn_dynamic_ads_config';

export function getDynamicAdsConfig(): DynamicAdsConfig {
  if (typeof window === 'undefined') {
    return {
      adsEnabled: DEFAULT_ADS_CONFIG.ADS_ENABLED,
      adAfterFeature: DEFAULT_ADS_CONFIG.AD_AFTER_FEATURE,
      interstitialCooldownSeconds: DEFAULT_ADS_CONFIG.INTERSTITIAL_COOLDOWN_SECONDS,
      maxFullscreenAdsPerDay: DEFAULT_ADS_CONFIG.MAX_FULLSCREEN_ADS_PER_DAY,
      nativeAdEveryNItems: DEFAULT_ADS_CONFIG.NATIVE_AD_EVERY_N_ITEMS,
      dailyRevenueTargetUSD: DEFAULT_ADS_CONFIG.DEFAULT_DAILY_REVENUE_TARGET,
      averageECPMUSD: DEFAULT_ADS_CONFIG.DEFAULT_ECPM,
      averageAdsPerUserDay: DEFAULT_ADS_CONFIG.DEFAULT_ADS_PER_USER_DAY,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adsEnabled: typeof parsed.adsEnabled === 'boolean' ? parsed.adsEnabled : DEFAULT_ADS_CONFIG.ADS_ENABLED,
        adAfterFeature: typeof parsed.adAfterFeature === 'boolean' ? parsed.adAfterFeature : DEFAULT_ADS_CONFIG.AD_AFTER_FEATURE,
        interstitialCooldownSeconds: Number(parsed.interstitialCooldownSeconds) || DEFAULT_ADS_CONFIG.INTERSTITIAL_COOLDOWN_SECONDS,
        maxFullscreenAdsPerDay: Number(parsed.maxFullscreenAdsPerDay) || DEFAULT_ADS_CONFIG.MAX_FULLSCREEN_ADS_PER_DAY,
        nativeAdEveryNItems: Number(parsed.nativeAdEveryNItems) || DEFAULT_ADS_CONFIG.NATIVE_AD_EVERY_N_ITEMS,
        dailyRevenueTargetUSD: Number(parsed.dailyRevenueTargetUSD) || DEFAULT_ADS_CONFIG.DEFAULT_DAILY_REVENUE_TARGET,
        averageECPMUSD: Number(parsed.averageECPMUSD) || DEFAULT_ADS_CONFIG.DEFAULT_ECPM,
        averageAdsPerUserDay: Number(parsed.averageAdsPerUserDay) || DEFAULT_ADS_CONFIG.DEFAULT_ADS_PER_USER_DAY,
      };
    }
  } catch {}

  return {
    adsEnabled: DEFAULT_ADS_CONFIG.ADS_ENABLED,
    adAfterFeature: DEFAULT_ADS_CONFIG.AD_AFTER_FEATURE,
    interstitialCooldownSeconds: DEFAULT_ADS_CONFIG.INTERSTITIAL_COOLDOWN_SECONDS,
    maxFullscreenAdsPerDay: DEFAULT_ADS_CONFIG.MAX_FULLSCREEN_ADS_PER_DAY,
    nativeAdEveryNItems: DEFAULT_ADS_CONFIG.NATIVE_AD_EVERY_N_ITEMS,
    dailyRevenueTargetUSD: DEFAULT_ADS_CONFIG.DEFAULT_DAILY_REVENUE_TARGET,
    averageECPMUSD: DEFAULT_ADS_CONFIG.DEFAULT_ECPM,
    averageAdsPerUserDay: DEFAULT_ADS_CONFIG.DEFAULT_ADS_PER_USER_DAY,
  };
}

export function saveDynamicAdsConfig(newConfig: Partial<DynamicAdsConfig>): DynamicAdsConfig {
  const current = getDynamicAdsConfig();
  const merged: DynamicAdsConfig = { ...current, ...newConfig };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch {}
  return merged;
}
