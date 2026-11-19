/**
 * ============================================================================
 * JOYEARN MULTI-LAYER CONNECTIVITY & STARTUP RELIABILITY SERVICE
 * ============================================================================
 * Eliminates false "No Internet Connection" errors on Android & mobile browsers by:
 * 1. Checking actual internet reachability via lightweight HEAD probe + timeout
 *    (never blindly trusting stale navigator.onLine during Wi-Fi <-> 4G switches).
 * 2. Independently checking Firebase/Firestore server reachability via getDocFromServer.
 * 3. Reporting distinct states: 'online' | 'firebase_unavailable' | 'offline'
 *    so a temporary Firebase/server hiccup NEVER shows a false "No Internet" message.
 * 4. Automatically listening to online/offline, visibilitychange, and
 *    navigator.connection (Wi-Fi <-> mobile data handoff) events.
 */

import { testFirestoreConnection, flushOfflineWriteQueue, getPendingWriteQueueCount } from './firestoreService';

export type ConnectivityMode = 'online' | 'firebase_unavailable' | 'offline';

export interface ConnectivitySnapshot {
  mode: ConnectivityMode;
  internetOnline: boolean;
  firebaseOnline: boolean;
  connectionType: string;
  pendingSyncCount: number;
  checking: boolean;
  lastCheckedAt: string | null;
  lastReason: string | null;
}

class ConnectivityService {
  private listeners = new Set<(snap: ConnectivitySnapshot) => void>();
  private snapshot: ConnectivitySnapshot = {
    mode: 'online',
    internetOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    firebaseOnline: true,
    connectionType: this.readConnectionType(),
    pendingSyncCount: getPendingWriteQueueCount(),
    checking: false,
    lastCheckedAt: null,
    lastReason: null,
  };
  private started = false;
  private checkInFlight: Promise<ConnectivitySnapshot> | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  private readConnectionType(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn) {
      return conn.type || conn.effectiveType || 'unknown';
    }
    return 'unknown';
  }

  public getSnapshot(): ConnectivitySnapshot {
    return { ...this.snapshot, pendingSyncCount: getPendingWriteQueueCount() };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch {}
    });
  }

  public subscribe(listener: (snap: ConnectivitySnapshot) => void): () => void {
    this.listeners.add(listener);
    this.startMonitoring();
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public startMonitoring() {
    if (this.started || typeof window === 'undefined') return;
    this.started = true;

    const scheduleCheck = (delayMs = 350) => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        void this.verifyConnectivity();
      }, delayMs);
    };

    window.addEventListener('online', () => scheduleCheck(250));
    window.addEventListener('offline', () => scheduleCheck(500));

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        scheduleCheck(300);
      }
    });

    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    if (conn && typeof conn.addEventListener === 'function') {
      conn.addEventListener('change', () => {
        this.snapshot.connectionType = this.readConnectionType();
        // Wait 800ms for Wi-Fi <-> Mobile Data handoff to stabilize before probing
        scheduleCheck(800);
      });
    }

    // Non-blocking startup verification
    scheduleCheck(400);
  }

  /**
   * Probes actual HTTP reachability with a 5-second AbortController timeout.
   * Prevents false offline alerts when navigator.onLine lags behind mobile handoffs.
   */
  private async probeInternetReachability(): Promise<boolean> {
    if (typeof window === 'undefined' || typeof fetch !== 'function') {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const url = `${window.location.origin}/?connectivity_ping=${Date.now()}`;
      await fetch(url, {
        method: 'HEAD',
        cache: 'no-store',
        signal: controller.signal,
      });
      return true;
    } catch {
      // Fallback: if navigator.onLine is explicitly false, treat as offline;
      // if fetch aborted due to strict CORS/proxy while browser reports online, verify via Firestore check next.
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Runs a real two-step connectivity check:
   * 1. Internet reachability probe
   * 2. Independent Firebase/Firestore reachability check
   * Automatically flushes queued offline writes when both are reachable.
   */
  public async verifyConnectivity(): Promise<ConnectivitySnapshot> {
    if (this.checkInFlight) return this.checkInFlight;

    this.checkInFlight = (async () => {
      this.snapshot = {
        ...this.snapshot,
        checking: true,
        connectionType: this.readConnectionType(),
      };
      this.emit();

      const httpReachable = await this.probeInternetReachability();
      const browserOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // Test Firestore independently so we never confuse a Firebase error with "No Internet"
      const fbCheck = await testFirestoreConnection();

      // If either HTTP probe OR Firestore succeeded, internet is definitely working
      const internetOnline = httpReachable || fbCheck.online || (browserOnline && httpReachable);
      const firebaseOnline = fbCheck.online;

      let mode: ConnectivityMode = 'online';
      let lastReason: string | null = null;

      if (!internetOnline) {
        mode = 'offline';
        lastReason = 'No active internet connection detected.';
      } else if (!firebaseOnline) {
        mode = 'firebase_unavailable';
        lastReason = fbCheck.reason || 'Cloud service temporarily unreachable.';
      }

      if (mode === 'online' && getPendingWriteQueueCount() > 0) {
        await flushOfflineWriteQueue().catch(() => {});
      }

      this.snapshot = {
        mode,
        internetOnline,
        firebaseOnline,
        connectionType: this.readConnectionType(),
        pendingSyncCount: getPendingWriteQueueCount(),
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        lastReason,
      };
      this.emit();
      return this.getSnapshot();
    })().finally(() => {
      this.checkInFlight = null;
    });

    return this.checkInFlight;
  }
}

export const connectivityService = new ConnectivityService();
