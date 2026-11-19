/**
 * ============================================================================
 * GOOGLE ADMOB CONFIGURATION, DIAGNOSTICS & POLICY-COMPLIANT SERVICE
 * ============================================================================
 * - Reads production AdMob App ID & Ad Unit IDs from VITE_ADMOB_* env vars
 *   (falls back to official Google Test IDs and flags test mode clearly).
 * - Detects real native Android AdMob bridge (Capacitor/Cordova) or Web AdSense.
 * - Tracks real ad lifecycle events: requests, matched, impressions, NO_FILL,
 *   load errors, and show failures per ad format — NEVER fabricates revenue.
 * - Enforces Google AdMob compensation policy: Google-served ads NEVER reward
 *   withdrawable cash or cash-convertible wallet points.
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

const env = (import.meta as any).env || {};

const TEST_IDS = {
  ADMOB_APP_ID: 'ca-app-pub-3940256099942544~3347511713',
  BANNER_HOME_UNIT_ID: 'ca-app-pub-3940256099942544/6300978111',
  INTERSTITIAL_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',
  REWARDED_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917',
  NATIVE_UNIT_ID: 'ca-app-pub-3940256099942544/2247696110',
};

export const ADMOB_CONFIG = {
  ADMOB_APP_ID: env.VITE_ADMOB_APP_ID || TEST_IDS.ADMOB_APP_ID,
  BANNER_HOME_UNIT_ID: env.VITE_ADMOB_BANNER_UNIT_ID || TEST_IDS.BANNER_HOME_UNIT_ID,
  INTERSTITIAL_UNIT_ID: env.VITE_ADMOB_INTERSTITIAL_UNIT_ID || TEST_IDS.INTERSTITIAL_UNIT_ID,
  REWARDED_UNIT_ID: env.VITE_ADMOB_REWARDED_UNIT_ID || TEST_IDS.REWARDED_UNIT_ID,
  NATIVE_UNIT_ID: env.VITE_ADMOB_NATIVE_UNIT_ID || TEST_IDS.NATIVE_UNIT_ID,
  INTERSTITIAL_QUIZ_UNIT_ID: env.VITE_ADMOB_INTERSTITIAL_UNIT_ID || TEST_IDS.INTERSTITIAL_UNIT_ID,
  REWARDED_BENEFIT_UNIT_ID: env.VITE_ADMOB_REWARDED_UNIT_ID || TEST_IDS.REWARDED_UNIT_ID,
  REWARDED_POINTS_UNIT_ID: env.VITE_ADMOB_REWARDED_UNIT_ID || TEST_IDS.REWARDED_UNIT_ID,
};

export type AdFormat = 'banner' | 'native' | 'interstitial' | 'rewarded';

export type AdSdkStatus =
  | 'uninitialized'
  | 'native_bridge_ready'
  | 'web_adsense_ready'
  | 'web_preview_no_native_sdk'
  | 'offline';

export type ConsentStatus = 'unknown' | 'personalized' | 'non_personalized' | 'not_required';

export interface FormatAnalytics {
  requests: number;
  matched: number;
  impressions: number;
  noFillErrors: number;
  loadErrors: number;
  showErrors: number;
  reportedRevenueUsd: number; // Only populated from real AdMob Reporting API / mediation callbacks
}

export interface AdMobAnalyticsReport {
  date: string;
  month: string;
  sdkStatus: AdSdkStatus;
  isUsingTestIds: boolean;
  consentStatus: ConsentStatus;
  regionLocale: string;
  networkOnline: boolean;
  lastError: string | null;
  lastUpdatedAt: string;
  formats: Record<AdFormat, FormatAnalytics>;
  monthlyReportedRevenueUsd: number;
  reportingApiConnected: boolean;
}

export interface TodayAdImpressions {
  date: string;
  banner: number;
  native: number;
  interstitial: number;
  rewarded: number;
}

const ANALYTICS_STORAGE_KEY = 'joyearn_admob_real_analytics_v1';
const CONSENT_STORAGE_KEY = 'joyearn_privacy_consent_v1';

function emptyFormatStats(): FormatAnalytics {
  return {
    requests: 0,
    matched: 0,
    impressions: 0,
    noFillErrors: 0,
    loadErrors: 0,
    showErrors: 0,
    reportedRevenueUsd: 0,
  };
}

class AdMobManager {
  private lastFullscreenTimestamp: number = 0;
  private isAdShowing: boolean = false;
  private sdkStatus: AdSdkStatus = 'uninitialized';
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const savedTime = localStorage.getItem('joyearn_last_fullscreen_ad_time');
      if (savedTime) this.lastFullscreenTimestamp = parseInt(savedTime, 10);
      this.initializeAdMob();
    }
  }

  public isUsingTestAdUnits(): boolean {
    return (
      ADMOB_CONFIG.ADMOB_APP_ID.includes('3940256099942544') ||
      ADMOB_CONFIG.BANNER_HOME_UNIT_ID.includes('3940256099942544') ||
      ADMOB_CONFIG.INTERSTITIAL_UNIT_ID.includes('3940256099942544')
    );
  }

  public getRegionLocale(): string {
    if (typeof navigator === 'undefined') return 'en-US';
    return navigator.language || 'en-US';
  }

  public getConsentStatus(): ConsentStatus {
    if (typeof window === 'undefined') return 'unknown';
    try {
      const saved = localStorage.getItem(CONSENT_STORAGE_KEY) as ConsentStatus | null;
      if (saved) return saved;
    } catch {}
    return 'non_personalized';
  }

  public setConsentStatus(status: ConsentStatus): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, status);
    } catch {}
  }

  /**
   * Initializes Google Mobile Ads SDK if running inside an Android Capacitor/Cordova wrapper,
   * or detects Web AdSense if configured. Never fakes SDK readiness in plain browser mode.
   */
  public initializeAdMob(): AdSdkStatus {
    if (typeof window === 'undefined') return 'uninitialized';
    if (!navigator.onLine) {
      this.sdkStatus = 'offline';
      return this.sdkStatus;
    }

    const w = window as any;
    const nativeBridge = w.Capacitor?.Plugins?.AdMob || w.admob || w.AdMob;
    if (nativeBridge) {
      try {
        if (typeof nativeBridge.initialize === 'function' && !this.initialized) {
          nativeBridge.initialize({
            requestTrackingAuthorization: false,
            initializeForTesting: this.isUsingTestAdUnits(),
          });
        }
        this.initialized = true;
        this.sdkStatus = 'native_bridge_ready';
        return this.sdkStatus;
      } catch (err: any) {
        this.recordAdError('interstitial', 'LOAD_ERROR', err?.message || 'Native AdMob init failed');
      }
    }

    if (Array.isArray(w.adsbygoogle)) {
      this.initialized = true;
      this.sdkStatus = 'web_adsense_ready';
      return this.sdkStatus;
    }

    // Running in standard web browser without native Android AdMob SDK
    this.sdkStatus = 'web_preview_no_native_sdk';
    return this.sdkStatus;
  }

  public getSdkStatus(): AdSdkStatus {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
    if (this.sdkStatus === 'uninitialized') return this.initializeAdMob();
    return this.sdkStatus;
  }

  /**
   * Policy Compliance Guard (Google AdMob Compensation Program Policy):
   * Google-served ads MUST NEVER grant withdrawable cash or cash-convertible wallet points.
   * Only non-transferable in-app perks (e.g. quiz hint, theme preview, practice shield) are permitted.
   */
  public isRewardPolicyCompliant(rewardType: 'withdrawable_points' | 'cash' | 'in_app_hint' | 'cosmetic_perk'): boolean {
    return rewardType === 'in_app_hint' || rewardType === 'cosmetic_perk';
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

  private getCurrentMonthStr(): string {
    return new Date().toISOString().slice(0, 7);
  }

  public getAnalyticsReport(): AdMobAnalyticsReport {
    const today = this.getTodayDateStr();
    const month = this.getCurrentMonthStr();
    const fallback: AdMobAnalyticsReport = {
      date: today,
      month,
      sdkStatus: this.getSdkStatus(),
      isUsingTestIds: this.isUsingTestAdUnits(),
      consentStatus: this.getConsentStatus(),
      regionLocale: this.getRegionLocale(),
      networkOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      lastError: null,
      lastUpdatedAt: new Date().toISOString(),
      formats: {
        banner: emptyFormatStats(),
        native: emptyFormatStats(),
        interstitial: emptyFormatStats(),
        rewarded: emptyFormatStats(),
      },
      monthlyReportedRevenueUsd: 0,
      reportingApiConnected: Boolean(env.VITE_ADMOB_REPORTING_ENDPOINT),
    };

    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (raw) {
        const parsed: AdMobAnalyticsReport = JSON.parse(raw);
        const sameDay = parsed.date === today;
        const sameMonth = parsed.month === month;
        return {
          ...fallback,
          formats: sameDay && parsed.formats ? parsed.formats : fallback.formats,
          lastError: sameDay ? parsed.lastError : null,
          monthlyReportedRevenueUsd: sameMonth ? parsed.monthlyReportedRevenueUsd || 0 : 0,
          sdkStatus: this.getSdkStatus(),
          isUsingTestIds: this.isUsingTestAdUnits(),
          consentStatus: this.getConsentStatus(),
          networkOnline: navigator.onLine,
        };
      }
    } catch {}
    return fallback;
  }

  private saveAnalyticsReport(report: AdMobAnalyticsReport): void {
    if (typeof window === 'undefined') return;
    try {
      report.lastUpdatedAt = new Date().toISOString();
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(report));
    } catch {}
  }

  public recordAdRequest(format: AdFormat): void {
    const report = this.getAnalyticsReport();
    report.formats[format].requests += 1;
    this.saveAnalyticsReport(report);
  }

  public recordAdMatched(format: AdFormat): void {
    const report = this.getAnalyticsReport();
    report.formats[format].matched += 1;
    this.saveAnalyticsReport(report);
  }

  public recordAdError(
    format: AdFormat,
    kind: 'NO_FILL' | 'LOAD_ERROR' | 'SHOW_ERROR',
    message?: string
  ): void {
    const report = this.getAnalyticsReport();
    if (kind === 'NO_FILL') report.formats[format].noFillErrors += 1;
    else if (kind === 'LOAD_ERROR') report.formats[format].loadErrors += 1;
    else report.formats[format].showErrors += 1;
    report.lastError = `[${format.toUpperCase()} ${kind}] ${message || 'Ad inventory unavailable'}`;
    this.saveAnalyticsReport(report);
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

      const report = this.getAnalyticsReport();
      report.formats[format].impressions += 1;
      this.saveAnalyticsReport(report);
    } catch {}
  }

  public getFullscreenCountToday(): number {
    const stats = this.getTodayImpressions();
    return (stats.interstitial || 0) + (stats.rewarded || 0);
  }

  public canShowInterstitial(userEmail?: string | null): boolean {
    const config = this.getConfig();
    if (!config.adAfterFeature) return false;

    // Owner account is completely free of ads
    if (userEmail && userEmail.toLowerCase() === 'romeelajutt23@gmail.com') {
      return false;
    }

    if (this.isAdShowing) return false;

    const now = Date.now();
    const elapsedSeconds = (now - this.lastFullscreenTimestamp) / 1000;
    if (elapsedSeconds < config.interstitialCooldownSeconds) {
      return false;
    }

    if (this.getFullscreenCountToday() >= config.maxFullscreenAdsPerDay) {
      return false;
    }

    return true;
  }

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

  public shouldTriggerAdAfterFeature(featureName: string, userEmail?: string | null): boolean {
    if (featureName === 'wallet' || featureName === 'withdraw') {
      return false;
    }
    return this.canShowInterstitial(userEmail);
  }
}

export const adMobManager = new AdMobManager();
