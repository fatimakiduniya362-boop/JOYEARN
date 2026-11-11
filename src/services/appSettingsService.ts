import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { getFirestoreDB } from './firestoreService';

export interface AppGeneralSettings {
  appName: string;
  appLogo: string; // Emoji or image URL
  welcomeMessage: string;
  themeColor: string; // 'rose' | 'indigo' | 'emerald' | 'amber' | 'purple' | 'blue'
  ownerEmail: string;
  ownerWhatsApp: string; // e.g. "+923001234567"
}

export interface PointsSettings {
  dailyCheckinPoints: number;
  dailyQuizPoints: number;
  dailyVideoPoints: number;
  luckyWheelMinPoints: number;
  luckyWheelMaxPoints: number;
  ludoWinPoints: number;
  vlogPublishPoints: number;
  dailyMaxPointsCeiling: number; // e.g. 2500
  pointsPerDollar: number; // e.g. 1000 pts = $1
}

export interface WalletSettings {
  minWithdrawUSD: number; // e.g. $100, can be modified by owner
  transferFeePercent: number; // e.g. 2% or 0%
  payoutReviewDaysText: string; // e.g. "up to 7 days"
  enabledMethods: {
    easypaisa: boolean;
    jazzcash: boolean;
    bank: boolean;
    paypal: boolean;
  };
}

export interface FeatureSwitches {
  enableLudo: boolean;
  enableLuckyWheel: boolean;
  enableDailyQuiz: boolean;
  enableWatchSection: boolean;
  enableVlogsSection: boolean;
  enableSponsorsSection: boolean;
  enableSeniorModeToggle: boolean;
}

export interface SponsorPackage {
  id: string;
  name: string; // e.g. "Basic", "Standard", "Premium"
  priceUSD: number; // e.g. 10, 25, 50 USD only
  pricePKR?: number;
  durationDays: number; // 7, 15, or 30 days
  estimatedReach: number; // e.g. 5000, 20000, 50000
  placement: 'banner' | 'featured_card' | 'top_sponsor' | string;
  description: string;
  isPopular?: boolean;
  enabled?: boolean;
}

export interface FullAppSettings {
  general: AppGeneralSettings;
  points: PointsSettings;
  wallet: WalletSettings;
  features: FeatureSwitches;
  packages: SponsorPackage[];
  updatedAt: string;
}

export const DEFAULT_APP_SETTINGS: FullAppSettings = {
  general: {
    appName: 'JoyEarn',
    appLogo: '🌟',
    welcomeMessage: 'Learn, practice daily skills, and earn virtual JoyPoints!',
    themeColor: 'rose',
    ownerEmail: 'fatimakiduniya362@gmail.com',
    ownerWhatsApp: '+923001234567',
  },
  points: {
    dailyCheckinPoints: 50,
    dailyQuizPoints: 100,
    dailyVideoPoints: 100,
    luckyWheelMinPoints: 20,
    luckyWheelMaxPoints: 500,
    ludoWinPoints: 100,
    vlogPublishPoints: 100,
    dailyMaxPointsCeiling: 2500,
    pointsPerDollar: 1000,
  },
  wallet: {
    minWithdrawUSD: 100,
    transferFeePercent: 2,
    payoutReviewDaysText: 'up to 7 days',
    enabledMethods: {
      easypaisa: true,
      jazzcash: true,
      bank: true,
      paypal: true,
    },
  },
  features: {
    enableLudo: true,
    enableLuckyWheel: true,
    enableDailyQuiz: true,
    enableWatchSection: true,
    enableVlogsSection: true,
    enableSponsorsSection: true,
    enableSeniorModeToggle: true,
  },
  packages: [
    {
      id: 'pkg_basic',
      name: 'Basic',
      priceUSD: 10,
      durationDays: 7,
      estimatedReach: 5000,
      placement: 'banner',
      description: 'Reach 5,000 active users over 7 days in the dedicated Sponsors showcase.',
    },
    {
      id: 'pkg_standard',
      name: 'Standard',
      priceUSD: 25,
      durationDays: 15,
      estimatedReach: 20000,
      placement: 'featured_card',
      description: 'Reach 20,000 active users over 15 days with featured card placement and custom link button.',
      isPopular: true,
    },
    {
      id: 'pkg_premium',
      name: 'Premium',
      priceUSD: 50,
      durationDays: 30,
      estimatedReach: 50000,
      placement: 'top_sponsor',
      description: 'Top priority sponsor card with highest visibility across all users for 30 full days (50,000 reach).',
    },
  ],
  updatedAt: new Date().toISOString(),
};

const LOCAL_STORAGE_SETTINGS_KEY = 'joyearn_live_app_settings';

class AppSettingsService {
  private currentSettings: FullAppSettings = DEFAULT_APP_SETTINGS;
  private listeners: Array<(settings: FullAppSettings) => void> = [];
  private unsubscribeSnapshot: (() => void) | null = null;
  private initialized = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentSettings = {
          ...DEFAULT_APP_SETTINGS,
          ...parsed,
          general: { ...DEFAULT_APP_SETTINGS.general, ...(parsed.general || {}) },
          points: { ...DEFAULT_APP_SETTINGS.points, ...(parsed.points || {}) },
          wallet: {
            ...DEFAULT_APP_SETTINGS.wallet,
            ...(parsed.wallet || {}),
            enabledMethods: {
              ...DEFAULT_APP_SETTINGS.wallet.enabledMethods,
              ...(parsed.wallet?.enabledMethods || {}),
            },
          },
          features: { ...DEFAULT_APP_SETTINGS.features, ...(parsed.features || {}) },
          packages: Array.isArray(parsed.packages) && parsed.packages.length > 0
            ? parsed.packages
            : DEFAULT_APP_SETTINGS.packages,
        };
      }
    } catch (e) {
      console.warn('Could not read cached app settings:', e);
    }
  }

  public initRealtimeSync() {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const db = getFirestoreDB();
      if (!db) return;
      const settingsDocRef = doc(db, 'config', 'app_settings');
      this.unsubscribeSnapshot = onSnapshot(
        settingsDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as Partial<FullAppSettings>;
            this.currentSettings = {
              ...DEFAULT_APP_SETTINGS,
              ...data,
              general: { ...DEFAULT_APP_SETTINGS.general, ...(data.general || {}) },
              points: { ...DEFAULT_APP_SETTINGS.points, ...(data.points || {}) },
              wallet: {
                ...DEFAULT_APP_SETTINGS.wallet,
                ...(data.wallet || {}),
                enabledMethods: {
                  ...DEFAULT_APP_SETTINGS.wallet.enabledMethods,
                  ...(data.wallet?.enabledMethods || {}),
                },
              },
              features: { ...DEFAULT_APP_SETTINGS.features, ...(data.features || {}) },
              packages: Array.isArray(data.packages) && data.packages.length > 0
                ? data.packages
                : DEFAULT_APP_SETTINGS.packages,
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
            this.saveToLocalStorage();
            this.notifyListeners();
          }
        },
        (err) => {
          console.warn('Firestore real-time settings snapshot listener notice:', err);
        }
      );
    } catch (err) {
      console.warn('Failed to start settings Firestore listener:', err);
    }
  }

  public getSettings(): FullAppSettings {
    return this.currentSettings;
  }

  public subscribe(callback: (settings: FullAppSettings) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentSettings);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l(this.currentSettings);
      } catch (err) {
        console.error('Error notifying settings listener:', err);
      }
    });
  }

  private saveToLocalStorage() {
    try {
      localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(this.currentSettings));
    } catch {}
  }

  public async saveSettings(newSettings: FullAppSettings): Promise<boolean> {
    const payload = {
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    this.currentSettings = payload;
    this.saveToLocalStorage();
    this.notifyListeners();

    try {
      const db = getFirestoreDB();
      if (!db) return true;
      const settingsDocRef = doc(db, 'config', 'app_settings');
      await setDoc(settingsDocRef, payload, { merge: true });
      return true;
    } catch (err) {
      console.warn('Could not save settings to cloud Firestore, cached locally:', err);
      return true;
    }
  }

  public async updatePartialSettings(
    section: 'general' | 'points' | 'wallet' | 'features' | 'packages',
    data: any
  ): Promise<boolean> {
    const updated = {
      ...this.currentSettings,
      [section]: data,
      updatedAt: new Date().toISOString(),
    };
    return this.saveSettings(updated);
  }
}

export const appSettingsService = new AppSettingsService();
