/**
 * JoyEarn Firebase Crashlytics Service
 * Real-time Crash Monitoring & Diagnostic Logging
 * 
 * Works across both:
 * 1. Web / PWA runtime (persists crash traces, breadcrumbs & device state)
 * 2. Native Android TWA / WebView / Capacitor runtime (bridges to FirebaseCrashlytics.recordException)
 */

export interface CrashReport {
  id: string;
  timestamp: string;
  type: 'fatal' | 'non-fatal' | 'unhandled-promise';
  message: string;
  stack?: string;
  componentStack?: string;
  breadcrumbs: string[];
  customKeys: Record<string, string | number | boolean>;
  userId?: string;
  deviceInfo: {
    userAgent: string;
    screenResolution: string;
    language: string;
    online: boolean;
    memoryMB?: number;
  };
}

class FirebaseCrashlyticsService {
  private breadcrumbs: string[] = [];
  private customKeys: Record<string, string | number | boolean> = {
    appVersion: '1.2.0',
    targetSdk: 34,
    platform: 'Android-TWA/Web',
  };
  private userId: string | undefined;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined' || this.isInitialized) return;
    this.isInitialized = true;

    // 1. Global unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordError(event.error || new Error(event.message), {
        type: 'fatal',
        source: `${event.filename}:${event.lineno}:${event.colno}`,
      });
    });

    // 2. Global unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.recordError(error, {
        type: 'unhandled-promise',
      });
    });

    this.log('Firebase Crashlytics initialized');
  }

  /**
   * Set user identifier for crash attribution
   */
  public setUserId(uid: string) {
    this.userId = uid;
    // Native bridge if running in hybrid container
    if ((window as any).FirebaseCrashlytics?.setUserId) {
      (window as any).FirebaseCrashlytics.setUserId(uid);
    }
  }

  /**
   * Set custom key-value pairs to provide context in crash reports
   */
  public setCustomKey(key: string, value: string | number | boolean) {
    this.customKeys[key] = value;
    if ((window as any).FirebaseCrashlytics?.setCustomKey) {
      (window as any).FirebaseCrashlytics.setCustomKey(key, value);
    }
  }

  /**
   * Add breadcrumb trail for reproducing sequence of user actions
   */
  public log(message: string) {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${message}`;
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs.shift(); // keep last 50 breadcrumbs
    }

    if ((window as any).FirebaseCrashlytics?.log) {
      (window as any).FirebaseCrashlytics.log(message);
    }
  }

  /**
   * Record a fatal or non-fatal exception
   */
  public recordError(
    error: Error | string,
    context?: {
      type?: 'fatal' | 'non-fatal' | 'unhandled-promise';
      componentStack?: string;
      source?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const errObj = typeof error === 'string' ? new Error(error) : error;
    const report: CrashReport = {
      id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      type: context?.type || 'non-fatal',
      message: errObj.message || 'Unknown Error',
      stack: errObj.stack,
      componentStack: context?.componentStack,
      breadcrumbs: [...this.breadcrumbs],
      customKeys: {
        ...this.customKeys,
        ...(context?.metadata || {}),
        source: context?.source || 'app-runtime',
      },
      userId: this.userId,
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        screenResolution:
          typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'N/A',
        language: typeof navigator !== 'undefined' ? navigator.language : 'en',
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
        memoryMB: (performance as any)?.memory
          ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
          : undefined,
      },
    };

    console.warn('[Firebase Crashlytics Recorded]', report);

    // Save report in persistent localStorage queue for crash triage
    this.persistReport(report);

    // Native Android Firebase Crashlytics Bridge
    if ((window as any).FirebaseCrashlytics?.recordException) {
      (window as any).FirebaseCrashlytics.recordException(errObj);
    }
  }

  private persistReport(report: CrashReport) {
    try {
      if (typeof window === 'undefined') return;
      const key = 'joyearn_crash_logs';
      const existingStr = localStorage.getItem(key);
      const existing: CrashReport[] = existingStr ? JSON.parse(existingStr) : [];
      existing.unshift(report);
      // Keep up to 20 most recent crash logs
      if (existing.length > 20) {
        existing.length = 20;
      }
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // Storage quota or disabled
    }
  }

  public getCrashLogs(): CrashReport[] {
    try {
      if (typeof window === 'undefined') return [];
      const data = localStorage.getItem('joyearn_crash_logs');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public clearCrashLogs() {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem('joyearn_crash_logs');
    } catch {
      // Ignore
    }
  }
}

export const crashlytics = new FirebaseCrashlyticsService();
