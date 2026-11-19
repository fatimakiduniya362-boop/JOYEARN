import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from './googleAuth';
import { getFirestoreDB } from './firestoreService';
import {
  getLocalNotificationPreferences,
  evaluateNotificationDelivery,
  recordDeliveredNotification,
} from './notificationPreferencesService';

export type SessionStatus = 'active' | 'revoked' | 'signed_out' | 'expired';

export interface AccountSessionRecord {
  sessionId: string;
  uid: string;
  deviceLabel: string;
  browserLabel: string;
  timezone: string;
  status: SessionStatus;
  createdAt: string;
  lastActiveAt: string;
  revokedAt?: string;
  revokedBySessionId?: string;
}

export type SecurityEventType =
  | 'new_login'
  | 'session_revoked'
  | 'revoke_all_other_sessions'
  | 'signed_out';

export interface SecurityEventRecord {
  eventId: string;
  uid: string;
  type: SecurityEventType;
  summary: string;
  deviceLabel: string;
  sessionId: string;
  createdAt: string;
}

export interface SecurityCenterSnapshot {
  status: 'loaded' | 'offline_or_unavailable' | 'unauthenticated';
  currentSessionId: string;
  sessions: AccountSessionRecord[];
  recentEvents: SecurityEventRecord[];
  lastSecurityUpdateAt: string | null;
  errorMessage?: string;
}

export interface RevokeResult {
  success: boolean;
  revokedCount: number;
  error?: string;
}

const SESSION_ID_KEY = 'joyearn_device_session_id_v1';
let memorySessionId: string | null = null;

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

/**
 * Returns or creates a non-sensitive device session identifier for this browser/app install.
 * Never stores tokens, passwords, or secrets.
 */
export function getOrCreateDeviceSessionId(): string {
  if (typeof localStorage === 'undefined') {
    if (!memorySessionId) {
      memorySessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return memorySessionId;
  }
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing && /^[a-zA-Z0-9_-]{8,80}$/.test(existing)) {
      memorySessionId = existing;
      return existing;
    }
    const created = memorySessionId || `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    memorySessionId = created;
    localStorage.setItem(SESSION_ID_KEY, created);
    return created;
  } catch {
    if (!memorySessionId) {
      memorySessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    }
    return memorySessionId;
  }
}

/**
 * Returns a clean, non-sensitive human-readable device & browser summary.
 */
export function getSafeDeviceSummary(): {
  deviceLabel: string;
  browserLabel: string;
  timezone: string;
} {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  let deviceLabel = 'Web Device';
  if (/Android/i.test(ua)) deviceLabel = 'Android Device';
  else if (/iPhone|iPad|iPod/i.test(ua)) deviceLabel = 'iOS Device';
  else if (/Windows/i.test(ua)) deviceLabel = 'Windows PC';
  else if (/Macintosh|Mac OS/i.test(ua)) deviceLabel = 'Mac';
  else if (/Linux/i.test(ua)) deviceLabel = 'Linux Device';

  let browserLabel = 'Web Browser';
  if (/wv\)|Capacitor/i.test(ua)) browserLabel = 'JoyEarn App';
  else if (/Edg\//i.test(ua)) browserLabel = 'Edge';
  else if (/Chrome\//i.test(ua)) browserLabel = 'Chrome';
  else if (/Firefox\//i.test(ua)) browserLabel = 'Firefox';
  else if (/Safari\//i.test(ua)) browserLabel = 'Safari';

  let timezone = 'Local';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {}

  return { deviceLabel, browserLabel, timezone };
}

/**
 * Registers or refreshes the current device session in Firestore.
 * If this is a new device login, logs an immutable security event and dispatches
 * an essential security alert (deduplicated per sessionId, no sensitive data exposed).
 */
export async function registerCurrentSession(uid: string): Promise<{
  registered: boolean;
  isNewSession: boolean;
  sessionId: string;
}> {
  const sessionId = getOrCreateDeviceSessionId();
  if (!isAuthenticatedUid(uid)) {
    return { registered: false, isNewSession: false, sessionId };
  }

  // Verify live Firebase Auth matches requested uid
  if (!auth.currentUser || auth.currentUser.uid !== uid) {
    return { registered: false, isNewSession: false, sessionId };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { registered: false, isNewSession: false, sessionId };
  }

  try {
    const { deviceLabel, browserLabel, timezone } = getSafeDeviceSummary();
    const nowIso = new Date().toISOString();
    const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
    const existingSnap = await getDoc(sessionRef);
    const existingData = existingSnap.exists() ? existingSnap.data() : null;
    const isNewSession = !existingData || existingData.status !== 'active';

    await setDoc(
      sessionRef,
      {
        sessionId,
        uid,
        deviceLabel,
        browserLabel,
        timezone,
        status: 'active',
        createdAt: existingData?.createdAt || nowIso,
        lastActiveAt: nowIso,
        serverLastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );

    if (isNewSession) {
      const eventId = `evt_login_${sessionId}_${Date.now()}`;
      await setDoc(doc(db, 'users', uid, 'security_events', eventId), {
        eventId,
        uid,
        type: 'new_login',
        summary: `New sign-in on ${deviceLabel} (${browserLabel})`,
        deviceLabel: `${deviceLabel} • ${browserLabel}`,
        sessionId,
        createdAt: nowIso,
        serverCreatedAt: serverTimestamp(),
      });

      // Trigger essential security alert respecting Notification Control Center & deduplication
      const prefs = getLocalNotificationPreferences(uid);
      const dedupeKey = `security_new_login_${sessionId}`;
      const decision = evaluateNotificationDelivery({
        prefs,
        category: 'security_login',
        dedupeKey,
      });
      if (decision.allowed) {
        recordDeliveredNotification('security_login', dedupeKey);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('joyearn_security_alert', {
              detail: {
                title: 'New Account Sign-In',
                body: `A new sign-in was recorded on ${deviceLabel} (${browserLabel}). Review active sessions in Settings if this wasn't you.`,
                dedupeKey,
              },
            })
          );
        }
      }
    }

    return { registered: true, isNewSession, sessionId };
  } catch {
    return { registered: false, isNewSession: false, sessionId };
  }
}

/**
 * Watches the current device's session document in Firestore.
 * If another device revokes this session (`status === 'revoked'`), invokes `onRevoked`
 * immediately so this device signs out cleanly without altering points or wallet data.
 */
export function watchCurrentSessionRevocation(
  uid: string,
  onRevoked: () => void
): () => void {
  if (!isAuthenticatedUid(uid)) return () => {};
  const db = getFirestoreDB();
  if (!db) return () => {};

  const sessionId = getOrCreateDeviceSessionId();
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  let handled = false;

  return onSnapshot(
    sessionRef,
    (snap) => {
      if (handled || !snap.exists()) return;
      const data = snap.data();
      if (data?.status === 'revoked') {
        handled = true;
        onRevoked();
      }
    },
    () => {
      // Ignore transient offline listener errors; never force-logout due to offline state
    }
  );
}

/**
 * Marks the current session cleanly signed out on explicit Logout.
 */
export async function markCurrentSessionSignedOut(uid?: string): Promise<void> {
  if (!isAuthenticatedUid(uid)) return;
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const db = getFirestoreDB();
  if (!db) return;

  const sessionId = getOrCreateDeviceSessionId();
  const { deviceLabel, browserLabel } = getSafeDeviceSummary();
  const nowIso = new Date().toISOString();

  try {
    await setDoc(
      doc(db, 'users', uid, 'sessions', sessionId),
      {
        sessionId,
        uid,
        status: 'signed_out',
        lastActiveAt: nowIso,
        serverLastActiveAt: serverTimestamp(),
      },
      { merge: true }
    );
    const eventId = `evt_logout_${Date.now()}`;
    await setDoc(doc(db, 'users', uid, 'security_events', eventId), {
      eventId,
      uid,
      type: 'signed_out',
      summary: `Signed out from ${deviceLabel} (${browserLabel})`,
      deviceLabel: `${deviceLabel} • ${browserLabel}`,
      sessionId,
      createdAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking on logout
  }
}

/**
 * Loads real active sessions and recent security events from Firestore for the authenticated user.
 * Never returns fake or mock sessions when offline or unauthenticated.
 */
export async function loadAccountSecuritySnapshot(uid?: string): Promise<SecurityCenterSnapshot> {
  const currentSessionId = getOrCreateDeviceSessionId();
  if (!isAuthenticatedUid(uid) || !auth.currentUser || auth.currentUser.uid !== uid) {
    return {
      status: 'unauthenticated',
      currentSessionId,
      sessions: [],
      recentEvents: [],
      lastSecurityUpdateAt: null,
      errorMessage: 'Sign in with Google to view active sessions and security activity.',
    };
  }

  const db = getFirestoreDB();
  if (!db) {
    return {
      status: 'offline_or_unavailable',
      currentSessionId,
      sessions: [],
      recentEvents: [],
      lastSecurityUpdateAt: null,
      errorMessage: 'Cannot reach account security service right now. Check your connection and retry.',
    };
  }

  try {
    const [sessionsSnap, eventsSnap] = await Promise.all([
      getDocs(
        query(
          collection(db, 'users', uid, 'sessions'),
          orderBy('lastActiveAt', 'desc'),
          limit(20)
        )
      ),
      getDocs(
        query(
          collection(db, 'users', uid, 'security_events'),
          orderBy('createdAt', 'desc'),
          limit(10)
        )
      ),
    ]);

    const sessions: AccountSessionRecord[] = sessionsSnap.docs.map((d) => {
      const data = d.data();
      return {
        sessionId: String(data.sessionId || d.id),
        uid: String(data.uid || uid),
        deviceLabel: String(data.deviceLabel || 'Device'),
        browserLabel: String(data.browserLabel || 'Browser'),
        timezone: String(data.timezone || 'Local'),
        status: (data.status as SessionStatus) || 'active',
        createdAt: String(data.createdAt || ''),
        lastActiveAt: String(data.lastActiveAt || ''),
        revokedAt: typeof data.revokedAt === 'string' ? data.revokedAt : undefined,
        revokedBySessionId:
          typeof data.revokedBySessionId === 'string' ? data.revokedBySessionId : undefined,
      };
    });

    const recentEvents: SecurityEventRecord[] = eventsSnap.docs.map((d) => {
      const data = d.data();
      return {
        eventId: String(data.eventId || d.id),
        uid: String(data.uid || uid),
        type: (data.type as SecurityEventType) || 'new_login',
        summary: String(data.summary || 'Account activity'),
        deviceLabel: String(data.deviceLabel || 'Device'),
        sessionId: String(data.sessionId || ''),
        createdAt: String(data.createdAt || ''),
      };
    });

    const lastSecurityUpdateAt =
      recentEvents.length > 0
        ? recentEvents[0].createdAt
        : sessions.length > 0
          ? sessions[0].lastActiveAt
          : null;

    return {
      status: 'loaded',
      currentSessionId,
      sessions,
      recentEvents,
      lastSecurityUpdateAt,
    };
  } catch (err: any) {
    return {
      status: 'offline_or_unavailable',
      currentSessionId,
      sessions: [],
      recentEvents: [],
      lastSecurityUpdateAt: null,
      errorMessage:
        err?.code === 'permission-denied'
          ? 'Session authorization expired. Please sign in again.'
          : 'Unable to load security sessions right now. Please check your connection and retry.',
    };
  }
}

/**
 * Revokes a single selected OTHER session in Firestore.
 * Keeps the current session active and only reports success after backend confirmation.
 */
export async function revokeOtherSession(
  uid: string,
  targetSessionId: string
): Promise<RevokeResult> {
  const currentSessionId = getOrCreateDeviceSessionId();
  if (!isAuthenticatedUid(uid) || !auth.currentUser || auth.currentUser.uid !== uid) {
    return { success: false, revokedCount: 0, error: 'Authorization required. Please sign in again.' };
  }
  if (!targetSessionId || targetSessionId === currentSessionId) {
    return { success: false, revokedCount: 0, error: 'Use Log Out to end your current session.' };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: false, revokedCount: 0, error: 'Internet connection required to sign out another device.' };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { success: false, revokedCount: 0, error: 'Security backend unavailable.' };
  }

  try {
    const nowIso = new Date().toISOString();
    const { deviceLabel, browserLabel } = getSafeDeviceSummary();
    const targetRef = doc(db, 'users', uid, 'sessions', targetSessionId);

    await setDoc(
      targetRef,
      {
        sessionId: targetSessionId,
        uid,
        status: 'revoked',
        revokedAt: nowIso,
        revokedBySessionId: currentSessionId,
        serverRevokedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const eventId = `evt_revoke_${Date.now()}`;
    await setDoc(doc(db, 'users', uid, 'security_events', eventId), {
      eventId,
      uid,
      type: 'session_revoked',
      summary: 'Signed out another device session',
      deviceLabel: `${deviceLabel} • ${browserLabel}`,
      sessionId: currentSessionId,
      createdAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    });

    return { success: true, revokedCount: 1 };
  } catch (err: any) {
    return {
      success: false,
      revokedCount: 0,
      error: err?.message || 'Could not confirm session removal with server.',
    };
  }
}

/**
 * Revokes ALL other active sessions for this user in Firestore while keeping
 * the current device's valid session active.
 */
export async function revokeAllOtherSessions(uid: string): Promise<RevokeResult> {
  const currentSessionId = getOrCreateDeviceSessionId();
  if (!isAuthenticatedUid(uid) || !auth.currentUser || auth.currentUser.uid !== uid) {
    return { success: false, revokedCount: 0, error: 'Authorization required. Please sign in again.' };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { success: false, revokedCount: 0, error: 'Internet connection required to sign out other devices.' };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { success: false, revokedCount: 0, error: 'Security backend unavailable.' };
  }

  try {
    const snap = await getDocs(collection(db, 'users', uid, 'sessions'));
    const otherActive = snap.docs.filter((d) => {
      const data = d.data();
      const sid = String(data.sessionId || d.id);
      return sid !== currentSessionId && data.status === 'active';
    });

    if (otherActive.length === 0) {
      return { success: true, revokedCount: 0 };
    }

    const nowIso = new Date().toISOString();
    const { deviceLabel, browserLabel } = getSafeDeviceSummary();
    const batch = writeBatch(db);

    for (const sDoc of otherActive) {
      const sid = String(sDoc.data().sessionId || sDoc.id);
      batch.set(
        sDoc.ref,
        {
          sessionId: sid,
          uid,
          status: 'revoked',
          revokedAt: nowIso,
          revokedBySessionId: currentSessionId,
          serverRevokedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }

    const eventId = `evt_revoke_all_${Date.now()}`;
    batch.set(doc(db, 'users', uid, 'security_events', eventId), {
      eventId,
      uid,
      type: 'revoke_all_other_sessions',
      summary: `Signed out ${otherActive.length} other active ${otherActive.length === 1 ? 'device' : 'devices'}`,
      deviceLabel: `${deviceLabel} • ${browserLabel}`,
      sessionId: currentSessionId,
      createdAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    });

    await batch.commit();
    return { success: true, revokedCount: otherActive.length };
  } catch (err: any) {
    return {
      success: false,
      revokedCount: 0,
      error: err?.message || 'Could not confirm sign-out of other devices with server.',
    };
  }
}

export function filterActiveOtherSessions(
  sessions: AccountSessionRecord[],
  currentSessionId: string
): AccountSessionRecord[] {
  return sessions.filter((s) => s.status === 'active' && s.sessionId !== currentSessionId);
}
