import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getFirestoreDB,
  queueWriteLocally,
  isQuotaOrResourceExhausted,
  notifyServerBusy,
} from './firestoreService';
import { getLocalDateKey } from './learningStreakService';

export type NotificationCategory =
  | 'learning'
  | 'tasks'
  | 'account'
  | 'maintenance'
  | 'promo'
  | 'security_login'
  | 'payment_status';

/**
 * Temporary Zero-Notification Mode:
 * Pauses all optional, promotional, and repetitive notifications (badge & push activity = 0)
 * while preserving user preferences/history and keeping essential security, login,
 * and payment-status notifications functional.
 */
export const OPTIONAL_NOTIFICATIONS_TEMPORARILY_PAUSED = true;

export type SystemNotificationPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface NotificationPreferences {
  // Essential security & login alerts (kept separate from optional notifications)
  securityAndLoginAlerts: boolean;

  // Master toggle for optional notifications
  masterEnabled: boolean;

  // Individual optional categories
  newLearningContent: boolean;
  availableTasks: boolean;
  importantAccountUpdates: boolean;
  appMaintenanceAnnouncements: boolean;
  promotionalNotifications: boolean;

  // Schedule & focus controls (local time)
  preferredHoursEnabled: boolean;
  preferredStart: string; // HH:MM (24h local)
  preferredEnd: string;   // HH:MM (24h local)

  quietHoursEnabled: boolean;
  quietStart: string;     // HH:MM (24h local)
  quietEnd: string;       // HH:MM (24h local)

  doNotInterruptLearning: boolean;

  // Timezone & sync metadata
  timezone: string;
  updatedAt: string;
}

export interface DeliveryCheckResult {
  allowed: boolean;
  reason?:
    | 'master_disabled'
    | 'category_disabled'
    | 'security_disabled'
    | 'active_learning_session'
    | 'quiet_hours'
    | 'outside_preferred_hours'
    | 'duplicate'
    | 'rate_limited'
    | 'temporarily_paused';
}

const PREFS_EVENT = 'joyearn_notification_prefs_changed';
const DEDUPE_STORAGE_KEY = 'joyearn_notif_dedupe_v1';
const OPTIONAL_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between optional notifications
const MAX_OPTIONAL_PER_DAY = 6;

export function getDetectedTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {
    return 'Local';
  }
}

export function getDefaultNotificationPreferences(): NotificationPreferences {
  let legacyEnabled = true;
  try {
    legacyEnabled = localStorage.getItem('joyearn_notifications_enabled') !== 'false';
  } catch {}

  return {
    securityAndLoginAlerts: true,
    masterEnabled: legacyEnabled,
    newLearningContent: true,
    availableTasks: true,
    importantAccountUpdates: true,
    appMaintenanceAnnouncements: true,
    promotionalNotifications: false,
    preferredHoursEnabled: false,
    preferredStart: '09:00',
    preferredEnd: '20:00',
    quietHoursEnabled: true,
    quietStart: '22:00',
    quietEnd: '07:00',
    doNotInterruptLearning: true,
    timezone: getDetectedTimezone(),
    updatedAt: new Date(0).toISOString(),
  };
}

function getPrefsStorageKey(uid?: string): string {
  return `joyearn_notification_prefs_v1_${uid || 'local'}`;
}

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

function sanitizeTimeHHMM(val: unknown, fallback: string): string {
  if (typeof val === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(val)) {
    return val;
  }
  return fallback;
}

function normalizePreferences(raw: Partial<NotificationPreferences> | null | undefined): NotificationPreferences {
  const defaults = getDefaultNotificationPreferences();
  if (!raw || typeof raw !== 'object') return defaults;

  return {
    securityAndLoginAlerts:
      typeof raw.securityAndLoginAlerts === 'boolean'
        ? raw.securityAndLoginAlerts
        : defaults.securityAndLoginAlerts,
    masterEnabled:
      typeof raw.masterEnabled === 'boolean' ? raw.masterEnabled : defaults.masterEnabled,
    newLearningContent:
      typeof raw.newLearningContent === 'boolean'
        ? raw.newLearningContent
        : defaults.newLearningContent,
    availableTasks:
      typeof raw.availableTasks === 'boolean' ? raw.availableTasks : defaults.availableTasks,
    importantAccountUpdates:
      typeof raw.importantAccountUpdates === 'boolean'
        ? raw.importantAccountUpdates
        : defaults.importantAccountUpdates,
    appMaintenanceAnnouncements:
      typeof raw.appMaintenanceAnnouncements === 'boolean'
        ? raw.appMaintenanceAnnouncements
        : defaults.appMaintenanceAnnouncements,
    promotionalNotifications:
      typeof raw.promotionalNotifications === 'boolean'
        ? raw.promotionalNotifications
        : defaults.promotionalNotifications,
    preferredHoursEnabled:
      typeof raw.preferredHoursEnabled === 'boolean'
        ? raw.preferredHoursEnabled
        : defaults.preferredHoursEnabled,
    preferredStart: sanitizeTimeHHMM(raw.preferredStart, defaults.preferredStart),
    preferredEnd: sanitizeTimeHHMM(raw.preferredEnd, defaults.preferredEnd),
    quietHoursEnabled:
      typeof raw.quietHoursEnabled === 'boolean'
        ? raw.quietHoursEnabled
        : defaults.quietHoursEnabled,
    quietStart: sanitizeTimeHHMM(raw.quietStart, defaults.quietStart),
    quietEnd: sanitizeTimeHHMM(raw.quietEnd, defaults.quietEnd),
    doNotInterruptLearning:
      typeof raw.doNotInterruptLearning === 'boolean'
        ? raw.doNotInterruptLearning
        : defaults.doNotInterruptLearning,
    timezone: getDetectedTimezone(),
    updatedAt:
      typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : defaults.updatedAt,
  };
}

export function getLocalNotificationPreferences(uid?: string): NotificationPreferences {
  try {
    const raw = localStorage.getItem(getPrefsStorageKey(uid));
    if (raw) {
      return normalizePreferences(JSON.parse(raw));
    }
  } catch {}
  return getDefaultNotificationPreferences();
}

function writeLocalNotificationPreferences(uid: string | undefined, prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(getPrefsStorageKey(uid), JSON.stringify(prefs));
    // Keep legacy key in sync for any older listeners
    localStorage.setItem('joyearn_notifications_enabled', String(prefs.masterEnabled));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PREFS_EVENT, { detail: { uid, prefs } }));
      window.dispatchEvent(
        new CustomEvent('joyearn_notifications_setting_changed', { detail: prefs.masterEnabled })
      );
    }
  } catch {}
}

export function subscribeNotificationPreferences(
  callback: (prefs: NotificationPreferences) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.prefs) {
      callback(normalizePreferences(detail.prefs));
    }
  };
  window.addEventListener(PREFS_EVENT, handler);
  return () => window.removeEventListener(PREFS_EVENT, handler);
}

/**
 * Loads notification preferences from local storage and syncs with Firestore.
 * Uses updatedAt timestamp so changes made on another device restore accurately.
 */
export async function loadNotificationPreferences(
  uid?: string
): Promise<{ prefs: NotificationPreferences; syncedWithCloud: boolean }> {
  const local = getLocalNotificationPreferences(uid);
  if (!isAuthenticatedUid(uid)) {
    return { prefs: local, syncedWithCloud: false };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { prefs: local, syncedWithCloud: false };
  }

  try {
    const prefRef = doc(db, 'users', uid, 'notification_settings', 'preferences');
    const snap = await getDoc(prefRef);

    if (!snap.exists()) {
      // Push local preferences if user has already customized them
      if (Date.parse(local.updatedAt) > 0) {
        await setDoc(prefRef, { ...local, uid }, { merge: true });
      }
      return { prefs: local, syncedWithCloud: true };
    }

    const cloud = normalizePreferences(snap.data() as Partial<NotificationPreferences>);
    const localTime = Date.parse(local.updatedAt) || 0;
    const cloudTime = Date.parse(cloud.updatedAt) || 0;

    if (cloudTime >= localTime) {
      writeLocalNotificationPreferences(uid, cloud);
      return { prefs: cloud, syncedWithCloud: true };
    } else {
      await setDoc(prefRef, { ...local, uid }, { merge: true });
      return { prefs: local, syncedWithCloud: true };
    }
  } catch (err) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    return { prefs: local, syncedWithCloud: false };
  }
}

/**
 * Saves updated notification preferences locally and persists them to Firestore
 * (or queues offline if the device is currently offline).
 */
export async function saveNotificationPreferences(
  uid: string | undefined,
  updates: Partial<NotificationPreferences>
): Promise<{ prefs: NotificationPreferences; syncedWithCloud: boolean }> {
  const current = getLocalNotificationPreferences(uid);
  const next: NotificationPreferences = normalizePreferences({
    ...current,
    ...updates,
    timezone: getDetectedTimezone(),
    updatedAt: new Date().toISOString(),
  });

  writeLocalNotificationPreferences(uid, next);

  if (!isAuthenticatedUid(uid)) {
    return { prefs: next, syncedWithCloud: false };
  }

  const db = getFirestoreDB();
  if (!db) {
    queueWriteLocally({
      type: 'syncNotificationPreferences',
      payload: { uid, prefs: next },
      timestamp: Date.now(),
    });
    return { prefs: next, syncedWithCloud: false };
  }

  try {
    const prefRef = doc(db, 'users', uid, 'notification_settings', 'preferences');
    await setDoc(prefRef, { ...next, uid }, { merge: true });
    return { prefs: next, syncedWithCloud: true };
  } catch (err) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    queueWriteLocally({
      type: 'syncNotificationPreferences',
      payload: { uid, prefs: next },
      timestamp: Date.now(),
    });
    return { prefs: next, syncedWithCloud: false };
  }
}

/**
 * Converts HH:MM to minutes since local midnight (0..1439).
 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '00:00').split(':').map((n) => parseInt(n, 10) || 0);
  return Math.max(0, Math.min(23, h)) * 60 + Math.max(0, Math.min(59, m));
}

/**
 * Checks whether a local minute-of-day falls inside [startHHMM, endHHMM).
 * Correctly handles overnight windows such as 22:00 -> 07:00.
 */
export function isMinutesInWindow(
  currentMinutes: number,
  startHHMM: string,
  endHHMM: string
): boolean {
  const start = timeToMinutes(startHHMM);
  const end = timeToMinutes(endHHMM);
  if (start === end) return false;
  if (start < end) {
    return currentMinutes >= start && currentMinutes < end;
  }
  // Overnight window (e.g. 22:00 to 07:00)
  return currentMinutes >= start || currentMinutes < end;
}

export function isWithinQuietHours(
  prefs: NotificationPreferences,
  now: Date = new Date()
): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  return isMinutesInWindow(mins, prefs.quietStart, prefs.quietEnd);
}

export function isWithinPreferredHours(
  prefs: NotificationPreferences,
  now: Date = new Date()
): boolean {
  if (!prefs.preferredHoursEnabled) return true;
  const mins = now.getHours() * 60 + now.getMinutes();
  return isMinutesInWindow(mins, prefs.preferredStart, prefs.preferredEnd);
}

export function isCategoryAllowedByPrefs(
  prefs: NotificationPreferences,
  category: NotificationCategory
): DeliveryCheckResult {
  // Essential security, login, and payment-status alerts remain functional even during temporary pause
  if (category === 'security_login' || category === 'payment_status') {
    return prefs.securityAndLoginAlerts
      ? { allowed: true }
      : { allowed: false, reason: 'security_disabled' };
  }

  // Temporarily pause all unnecessary/optional/promotional notifications without deleting user settings
  if (OPTIONAL_NOTIFICATIONS_TEMPORARILY_PAUSED) {
    return { allowed: false, reason: 'temporarily_paused' };
  }

  if (!prefs.masterEnabled) {
    return { allowed: false, reason: 'master_disabled' };
  }

  switch (category) {
    case 'learning':
      return prefs.newLearningContent
        ? { allowed: true }
        : { allowed: false, reason: 'category_disabled' };
    case 'tasks':
      return prefs.availableTasks
        ? { allowed: true }
        : { allowed: false, reason: 'category_disabled' };
    case 'account':
      return prefs.importantAccountUpdates
        ? { allowed: true }
        : { allowed: false, reason: 'category_disabled' };
    case 'maintenance':
      return prefs.appMaintenanceAnnouncements
        ? { allowed: true }
        : { allowed: false, reason: 'category_disabled' };
    case 'promo':
      return prefs.promotionalNotifications
        ? { allowed: true }
        : { allowed: false, reason: 'category_disabled' };
    default:
      return { allowed: false, reason: 'category_disabled' };
  }
}

interface DedupeLedger {
  dateKey: string;
  sentKeys: Record<string, number>;
  lastOptionalAt: number;
  optionalCountToday: number;
}

function readDedupeLedger(todayKey: string): DedupeLedger {
  try {
    const raw = localStorage.getItem(DEDUPE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DedupeLedger;
      if (parsed && parsed.dateKey === todayKey) {
        return {
          dateKey: todayKey,
          sentKeys: parsed.sentKeys || {},
          lastOptionalAt: typeof parsed.lastOptionalAt === 'number' ? parsed.lastOptionalAt : 0,
          optionalCountToday:
            typeof parsed.optionalCountToday === 'number' ? parsed.optionalCountToday : 0,
        };
      }
    }
  } catch {}
  return {
    dateKey: todayKey,
    sentKeys: {},
    lastOptionalAt: 0,
    optionalCountToday: 0,
  };
}

function writeDedupeLedger(ledger: DedupeLedger): void {
  try {
    localStorage.setItem(DEDUPE_STORAGE_KEY, JSON.stringify(ledger));
  } catch {}
}

/**
 * Evaluates whether a notification should be delivered right now.
 * Enforces category settings, quiet hours, preferred hours, active learning session
 * protection, duplicate suppression, and anti-spam rate limits.
 */
export function evaluateNotificationDelivery(params: {
  prefs: NotificationPreferences;
  category: NotificationCategory;
  dedupeKey?: string;
  isLearningSessionActive?: boolean;
  now?: Date;
  bypassRateLimit?: boolean;
}): DeliveryCheckResult {
  const {
    prefs,
    category,
    dedupeKey,
    isLearningSessionActive = false,
    now = new Date(),
    bypassRateLimit = false,
  } = params;

  const catCheck = isCategoryAllowedByPrefs(prefs, category);
  if (!catCheck.allowed) return catCheck;

  const isSecurity = category === 'security_login';

  // Protect active learning sessions from non-security interruptions
  if (!isSecurity && isLearningSessionActive && prefs.doNotInterruptLearning) {
    return { allowed: false, reason: 'active_learning_session' };
  }

  // Respect quiet hours & preferred hours for optional notifications
  if (!isSecurity) {
    if (isWithinQuietHours(prefs, now)) {
      return { allowed: false, reason: 'quiet_hours' };
    }
    if (!isWithinPreferredHours(prefs, now)) {
      return { allowed: false, reason: 'outside_preferred_hours' };
    }
  }

  // Deduplication & anti-spam rate limiting (local calendar date)
  if (typeof localStorage !== 'undefined') {
    const todayKey = getLocalDateKey(now);
    const ledger = readDedupeLedger(todayKey);

    if (dedupeKey && ledger.sentKeys[dedupeKey]) {
      return { allowed: false, reason: 'duplicate' };
    }

    if (!isSecurity && !bypassRateLimit) {
      if (ledger.optionalCountToday >= MAX_OPTIONAL_PER_DAY) {
        return { allowed: false, reason: 'rate_limited' };
      }
      if (ledger.lastOptionalAt > 0 && now.getTime() - ledger.lastOptionalAt < OPTIONAL_COOLDOWN_MS) {
        return { allowed: false, reason: 'rate_limited' };
      }
    }
  }

  return { allowed: true };
}

/**
 * Records a delivered notification so duplicates and excessive alerts are prevented.
 */
export function recordDeliveredNotification(
  category: NotificationCategory,
  dedupeKey?: string,
  now: Date = new Date()
): void {
  if (typeof localStorage === 'undefined') return;
  const todayKey = getLocalDateKey(now);
  const ledger = readDedupeLedger(todayKey);
  if (dedupeKey) {
    ledger.sentKeys[dedupeKey] = now.getTime();
  }
  if (category !== 'security_login') {
    ledger.lastOptionalAt = now.getTime();
    ledger.optionalCountToday += 1;
  }
  writeDedupeLedger(ledger);
}

/**
 * Checks real Android/Capacitor or Web Notification permission state.
 */
export async function getSystemNotificationPermission(): Promise<SystemNotificationPermission> {
  if (typeof window === 'undefined') return 'unsupported';

  // Check native Android/Capacitor LocalNotifications or PushNotifications plugin if present
  const capPlugins = (window as any).Capacitor?.Plugins;
  try {
    if (capPlugins?.LocalNotifications?.checkPermissions) {
      const res = await capPlugins.LocalNotifications.checkPermissions();
      if (res?.display === 'granted') return 'granted';
      if (res?.display === 'denied') return 'denied';
      return 'default';
    }
    if (capPlugins?.PushNotifications?.checkPermissions) {
      const res = await capPlugins.PushNotifications.checkPermissions();
      if (res?.receive === 'granted') return 'granted';
      if (res?.receive === 'denied') return 'denied';
      return 'default';
    }
  } catch {}

  if ('Notification' in window) {
    return Notification.permission as SystemNotificationPermission;
  }
  return 'unsupported';
}

/**
 * Requests real Android/Capacitor or Web Notification permission.
 */
export async function requestSystemNotificationPermission(): Promise<SystemNotificationPermission> {
  if (typeof window === 'undefined') return 'unsupported';

  const capPlugins = (window as any).Capacitor?.Plugins;
  try {
    if (capPlugins?.LocalNotifications?.requestPermissions) {
      const res = await capPlugins.LocalNotifications.requestPermissions();
      if (res?.display === 'granted') return 'granted';
      if (res?.display === 'denied') return 'denied';
      return 'default';
    }
    if (capPlugins?.PushNotifications?.requestPermissions) {
      const res = await capPlugins.PushNotifications.requestPermissions();
      if (res?.receive === 'granted') return 'granted';
      if (res?.receive === 'denied') return 'denied';
      return 'default';
    }
  } catch {}

  if ('Notification' in window) {
    try {
      const res = await Notification.requestPermission();
      return res as SystemNotificationPermission;
    } catch {
      return 'denied';
    }
  }
  return 'unsupported';
}
