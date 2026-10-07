/**
 * ============================================================================
 * 📱 GOOGLE ADMOB CONFIGURATION & SERVICE FOR JOYEARN
 * ============================================================================
 * Replace the test AdMob Unit IDs below with your production IDs from
 * https://apps.admob.com when preparing for final store release.
 */

// Global Ads Killswitch / Toggle (Disabled by default, hides all ad slots)
export const ADS_ENABLED = false;

export const ADMOB_CONFIG = {
  // 1. Google AdMob App ID
  ADMOB_APP_ID: 'ca-app-pub-3940256099942544~3347511713',

  // 2. Small Banner Ad Unit (Home Screen footer/header)
  BANNER_HOME_UNIT_ID: 'ca-app-pub-3940256099942544/6300978111',

  // 3. Interstitial Ad Unit (After completed quizzes only)
  INTERSTITIAL_QUIZ_UNIT_ID: 'ca-app-pub-3940256099942544/1033173712',

  // 4. Rewarded Video Ad Unit ("Watch to double your points")
  REWARDED_POINTS_UNIT_ID: 'ca-app-pub-3940256099942544/5224354917',

  // ============================================================================
  // SAFETY RULES & FREQUENCY CAPPING
  // ============================================================================
  // Interstitial shown after at most every 3rd completed quiz
  QUIZZES_PER_INTERSTITIAL: 3,

  // Strict rate limit: No more than 1 full-screen ad per 2 minutes (120,000 ms)
  MIN_TIME_BETWEEN_FULLSCREEN_MS: 120 * 1000,
};

class AdMobManager {
  private lastInterstitialTimestamp: number = 0;
  private quizzesSinceLastAd: number = 0;
  private isAdShowing: boolean = false;
  private rewardedListeners: Set<(reward: number) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedTime = localStorage.getItem('joyearn_last_ad_time');
      if (savedTime) this.lastInterstitialTimestamp = parseInt(savedTime, 10);
      const savedCount = localStorage.getItem('joyearn_quizzes_since_ad');
      if (savedCount) this.quizzesSinceLastAd = parseInt(savedCount, 10);
    }
  }

  /**
   * Increments the completed quiz counter. Call only on quiz completion, NEVER during a question.
   */
  public onQuizCompleted(): boolean {
    this.quizzesSinceLastAd += 1;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_quizzes_since_ad', String(this.quizzesSinceLastAd));
    }
    return this.shouldShowInterstitial();
  }

  /**
   * Checks if an interstitial ad is eligible to be shown based on both 3-quiz threshold and 2-minute cooldown
   */
  public shouldShowInterstitial(): boolean {
    const now = Date.now();
    const elapsedSinceLastAd = now - this.lastInterstitialTimestamp;

    const meetsQuizThreshold = this.quizzesSinceLastAd >= ADMOB_CONFIG.QUIZZES_PER_INTERSTITIAL;
    const meetsTimeCooldown = elapsedSinceLastAd >= ADMOB_CONFIG.MIN_TIME_BETWEEN_FULLSCREEN_MS;

    return meetsQuizThreshold && meetsTimeCooldown && !this.isAdShowing;
  }

  /**
   * Records that an interstitial ad was displayed and resets counters
   */
  public recordInterstitialShown(): void {
    const now = Date.now();
    this.lastInterstitialTimestamp = now;
    this.quizzesSinceLastAd = 0;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_last_ad_time', String(now));
      localStorage.setItem('joyearn_quizzes_since_ad', '0');
    }
  }

  public setIsAdShowing(showing: boolean) {
    this.isAdShowing = showing;
  }

  public getIsAdShowing(): boolean {
    return this.isAdShowing;
  }
}

export const adMobManager = new AdMobManager();
