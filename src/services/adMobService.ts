/**
 * ============================================================================
 * 📱 GOOGLE ADMOB CONFIGURATION & SERVICE FOR JOYEARN
 * ============================================================================
 * Supports interstitial frequency capping, daily maximums, cooldowns,
 * native ad item spacing, format impression tracking for admin revenue targets,
 * and owner account exemption.
 */

import {
  ADS_ENABLED as STATIC_ADS_ENABLED,
  AD_AFTER_FEATURE as STATIC_AD_AFTER_FEATURE,
  INTERSTITIAL_COOLDOWN_SECONDS as STATIC_COOLDOWN_SEC,
  MAX_FULLSCREEN_ADS_PER_DAY as STATIC_MAX_DAILY,
  NATIVE_AD_EVERY_N_ITEMS as STATIC_NATIVE_EVERY_N,
  getDynamicAdsConfig,
  saveDynamicAdsConfig,
  DynamicAdsConfig,
} from '../config/adsConfig';

export const ADS_ENABLED = STATIC_ADS_ENABLED;
export const AD_AFTER_FEATURE = STATIC_AD_AFTER_FEATURE;
export const INTERSTITIAL_COOLDOWN_SECONDS = STATIC_COOLDOWN_SEC;
export const MAX_FULLSCREEN_ADS_PER_DAY = STATIC_MAX_DAILY;
export const NATIVE_AD_EVERY_N_ITEMS = STATIC_NATIVE_EVERY_N;

export const ADMOB_CONFIG = {
  ADMOB_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER_HOME_UNIT_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917',
  NATIVE_UNIT_ID: 'ca-app-pub-3940256099942544/2247696110',
  INTERSTITIAL_QUIZ_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_POINTS_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917',
};

export type AdFormat = 'banner' | 'native' | 'interstitial' | 'rewarded';

export interface TodayAdImpressions {
  date: string;
  banner: number;
  native: number;
  interstitial: number;
  rewarded: number;
}

class AdMobManager {
  private lastFullscreenTimestamp: number = 0;
  private isAdShowing: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedTime = localStorage.getItem('joyearn_last_fullscreen_ad_time');
      if (savedTime) this.lastFullscreenTimestamp = parseInt(savedTime, 10);
    }
  }

  public getConfig(): DynamicAdsConfig {
    return getDynamicAdsConfig();
  }

  public updateConfig(partial: Partial<DynamicAdsConfig>): DynamicAdsConfig {
    return saveDynamicAdsConfig(partial);
  }

  private getTodayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
  }

  public getTodayImpressions(): TodayAdImpressions {
    const today = this.getTodayDateStr();
    if (typeof window === 'undefined') {
      return { date: today, banner: 0, native: 0, interstitial: 0, rewarded: 0 };
    }
    try {
      const raw = localStorage.getItem('joyearn_ad_impressions_today');
      if (raw) {
        const parsed: TodayAdImpressions = JSON.parse(raw);
        if (parsed.date === today) {
          return parsed;
        }
      }
    } catch {}
    return { date: today, banner: 0, native: 0, interstitial: 0, rewarded: 0 };
  }

  public recordImpression(format: AdFormat): void {
    if (typeof window === 'undefined') return;
    try {
      const stats = this.getTodayImpressions();
      stats[format] = (stats[format] || 0) + 1;
      localStorage.setItem('joyearn_ad_impressions_today', JSON.stringify(stats));
    } catch {}
  }

  public getFullscreenCountToday(): number {
    const stats = this.getTodayImpressions();
    return (stats.interstitial || 0) + (stats.rewarded || 0);
  }

  /**
   * Checks whether a full-screen interstitial ad is allowed right now:
   * 1. Dynamic adAfterFeature is true
   * 2. Owner account is never shown ads
   * 3. Cooldown has passed (default 90 seconds)
   * 4. Daily maximum fullscreen ads not reached (default 12)
   * 5. No ad currently showing
   */
  public canShowInterstitial(userEmail?: string | null): boolean {
    const config = this.getConfig();
    if (!config.adAfterFeature) return false;

    // Owner account is completely free of ads
    if (userEmail && userEmail.toLowerCase() === 'fatimakiduniya362@gmail.com') {
      return false;
    }

    if (this.isAdShowing) return false;

    // Cooldown check
    const now = Date.now();
    const elapsedSeconds = (now - this.lastFullscreenTimestamp) / 1000;
    if (elapsedSeconds < config.interstitialCooldownSeconds) {
      return false;
    }

    // Daily limit check
    if (this.getFullscreenCountToday() >= config.maxFullscreenAdsPerDay) {
      return false;
    }

    return true;
  }

  /**
   * Records that an interstitial was displayed, updates cooldown timestamp and impression stats
   */
  public recordInterstitialShown(): void {
    const now = Date.now();
    this.lastFullscreenTimestamp = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_last_fullscreen_ad_time', String(now));
    }
    this.recordImpression('interstitial');
  }

  public recordRewardedShown(): void {
    const now = Date.now();
    this.lastFullscreenTimestamp = now;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_last_fullscreen_ad_time', String(now));
    }
    this.recordImpression('rewarded');
  }

  public setIsAdShowing(showing: boolean) {
    this.isAdShowing = showing;
  }

  public getIsAdShowing(): boolean {
    return this.isAdShowing;
  }

  public onQuizCompleted(): boolean {
    return this.canShowInterstitial();
  }

  /**
   * Helper for features returning to home:
   * Daily quiz result, video watched, game finished, wheel, chest, shop, vlogs
   * (Wallet excluded).
   */
  public shouldTriggerAdAfterFeature(featureName: string, userEmail?: string | null): boolean {
    if (featureName === 'wallet' || featureName === 'withdraw') {
      return false; // Excluded by specification
    }
    return this.canShowInterstitial(userEmail);
  }
}

export const adMobManager = new AdMobManager();
