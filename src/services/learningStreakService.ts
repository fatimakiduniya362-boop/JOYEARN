import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  getFirestoreDB,
  queueWriteLocally,
  recordPermanentRewardTransaction,
  isQuotaOrResourceExhausted,
  notifyServerBusy,
} from './firestoreService';

export interface StreakMilestone {
  days: number;
  points: number;
  label: string;
}

export const LEARNING_STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, points: 10, label: '3-Day Learner' },
  { days: 7, points: 20, label: '7-Day Consistent' },
  { days: 14, points: 30, label: '14-Day Dedicated' },
  { days: 30, points: 50, label: '30-Day Scholar' },
];

export interface LearningStreakState {
  currentStreak: number;
  bestStreak: number;
  completedDates: string[]; // Local calendar dates in YYYY-MM-DD format
  claimedMilestones: number[];
  completedToday: boolean;
  lastCompletedDate: string | null;
  lastActivityLabel: string | null;
  syncedWithCloud: boolean;
  updatedAt: string;
}

export interface RecordActivityResult {
  state: LearningStreakState;
  alreadyCompletedToday: boolean;
  unlockedMilestone: StreakMilestone | null;
}

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a Date into the user's LOCAL calendar date key (YYYY-MM-DD).
 * Avoids UTC shifts from toISOString() across timezones.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a new local Date key shifted by deltaDays using local noon
 * so Daylight Saving Time transitions never skip or repeat a day.
 */
export function shiftLocalDateKey(dateKey: string, deltaDays: number): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d, 12, 0, 0);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

/**
 * Computes consecutive-day currentStreak and historical bestStreak
 * purely from local YYYY-MM-DD calendar dates.
 * - Missed day resets currentStreak to 0 while preserving bestStreak and history.
 * - Multiple completions on the same day are deduplicated automatically.
 */
export function calculateStreakMetrics(
  rawDates: string[],
  storedBestStreak = 0,
  todayKey: string = getLocalDateKey()
): {
  completedDates: string[];
  currentStreak: number;
  bestStreak: number;
  completedToday: boolean;
  lastCompletedDate: string | null;
} {
  const validUnique = Array.from(
    new Set(
      (Array.isArray(rawDates) ? rawDates : []).filter(
        (d): d is string => typeof d === 'string' && DATE_KEY_REGEX.test(d)
      )
    )
  ).sort();

  const dateSet = new Set(validUnique);
  const completedToday = dateSet.has(todayKey);
  const yesterdayKey = shiftLocalDateKey(todayKey, -1);

  // Current streak: active if user completed today OR yesterday (grace until end of today)
  let currentStreak = 0;
  let cursor: string | null = completedToday
    ? todayKey
    : dateSet.has(yesterdayKey)
      ? yesterdayKey
      : null;

  while (cursor && dateSet.has(cursor)) {
    currentStreak += 1;
    cursor = shiftLocalDateKey(cursor, -1);
  }

  // Longest consecutive run across all historical completed dates
  let longestRun = 0;
  let running = 0;
  for (let i = 0; i < validUnique.length; i++) {
    if (i === 0) {
      running = 1;
    } else {
      const expectedNext = shiftLocalDateKey(validUnique[i - 1], 1);
      if (validUnique[i] === expectedNext) {
        running += 1;
      } else {
        running = 1;
      }
    }
    if (running > longestRun) longestRun = running;
  }

  const bestStreak = Math.max(
    typeof storedBestStreak === 'number' && Number.isFinite(storedBestStreak) ? storedBestStreak : 0,
    longestRun,
    currentStreak
  );

  return {
    completedDates: validUnique,
    currentStreak,
    bestStreak,
    completedToday,
    lastCompletedDate: validUnique.length > 0 ? validUnique[validUnique.length - 1] : null,
  };
}

function getStorageKey(uid: string): string {
  return `joyearn_learning_streak_v1_${uid || 'local'}`;
}

export function getLocalLearningStreak(uid: string): LearningStreakState {
  const todayKey = getLocalDateKey();
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      const metrics = calculateStreakMetrics(
        parsed.completedDates || [],
        parsed.bestStreak || 0,
        todayKey
      );
      return {
        ...metrics,
        claimedMilestones: Array.isArray(parsed.claimedMilestones)
          ? Array.from(new Set(parsed.claimedMilestones.filter((n: unknown) => typeof n === 'number')))
          : [],
        lastActivityLabel: typeof parsed.lastActivityLabel === 'string' ? parsed.lastActivityLabel : null,
        syncedWithCloud: Boolean(parsed.syncedWithCloud),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      };
    }
  } catch {}

  return {
    currentStreak: 0,
    bestStreak: 0,
    completedDates: [],
    claimedMilestones: [],
    completedToday: false,
    lastCompletedDate: null,
    lastActivityLabel: null,
    syncedWithCloud: false,
    updatedAt: new Date().toISOString(),
  };
}

function saveLocalLearningStreak(uid: string, state: LearningStreakState): void {
  try {
    localStorage.setItem(getStorageKey(uid), JSON.stringify(state));
  } catch {}
}

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

/**
 * Loads the user's learning streak from local storage and merges with Firestore
 * using a set-union of completed dates so logout/login and multi-device use
 * never lose progress.
 */
export async function loadLearningStreak(uid: string): Promise<LearningStreakState> {
  const local = getLocalLearningStreak(uid);
  if (!isAuthenticatedUid(uid)) {
    return local;
  }

  const db = getFirestoreDB();
  if (!db) {
    return local;
  }

  try {
    const streakRef = doc(db, 'users', uid, 'learning_streak', 'state');
    const snap = await getDoc(streakRef);

    if (!snap.exists()) {
      // If user already has local learning days before first cloud sync, upload them now
      if (local.completedDates.length > 0) {
        await setDoc(
          streakRef,
          {
            uid,
            completedDates: local.completedDates,
            bestStreak: local.bestStreak,
            claimedMilestones: local.claimedMilestones,
            lastCompletedDate: local.lastCompletedDate,
            lastActivityLabel: local.lastActivityLabel || 'Daily Learning',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        const syncedState = { ...local, syncedWithCloud: true };
        saveLocalLearningStreak(uid, syncedState);
        return syncedState;
      }
      return { ...local, syncedWithCloud: true };
    }

    const cloud = snap.data();
    const cloudDates: string[] = Array.isArray(cloud.completedDates) ? cloud.completedDates : [];
    const cloudBest = typeof cloud.bestStreak === 'number' ? cloud.bestStreak : 0;
    const cloudMilestones: number[] = Array.isArray(cloud.claimedMilestones) ? cloud.claimedMilestones : [];

    const mergedDates = Array.from(new Set([...local.completedDates, ...cloudDates])).sort();
    const mergedMilestones = Array.from(new Set([...local.claimedMilestones, ...cloudMilestones])).sort((a, b) => a - b);
    const metrics = calculateStreakMetrics(mergedDates, Math.max(local.bestStreak, cloudBest));

    const mergedState: LearningStreakState = {
      ...metrics,
      claimedMilestones: mergedMilestones,
      lastActivityLabel: local.lastActivityLabel || cloud.lastActivityLabel || null,
      syncedWithCloud: true,
      updatedAt: new Date().toISOString(),
    };

    saveLocalLearningStreak(uid, mergedState);

    // If local had dates not yet stored in cloud, push the union back to Firestore
    const cloudSet = new Set(cloudDates);
    const hasLocalOnlyDates = local.completedDates.some((d) => !cloudSet.has(d));
    if (hasLocalOnlyDates || mergedState.bestStreak > cloudBest || mergedMilestones.length > cloudMilestones.length) {
      await setDoc(
        streakRef,
        {
          uid,
          completedDates: mergedState.completedDates,
          bestStreak: mergedState.bestStreak,
          claimedMilestones: mergedState.claimedMilestones,
          lastCompletedDate: mergedState.lastCompletedDate,
          lastActivityLabel: mergedState.lastActivityLabel || 'Daily Learning',
          updatedAt: mergedState.updatedAt,
        },
        { merge: true }
      );
    }

    return mergedState;
  } catch (err) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    return local;
  }
}

/**
 * Records a completed daily learning activity for today's local date.
 * - Prevents duplicate streak credits on the same day.
 * - Persists locally immediately and syncs to Firestore (or queues offline).
 * - Awards a one-time small in-app learning bonus at 3, 7, 14, and 30 day milestones.
 */
export async function recordDailyLearningActivity(
  uid: string,
  activityLabel: string
): Promise<RecordActivityResult> {
  const todayKey = getLocalDateKey();
  const current = getLocalLearningStreak(uid);

  if (current.completedDates.includes(todayKey)) {
    return {
      state: current,
      alreadyCompletedToday: true,
      unlockedMilestone: null,
    };
  }

  const nextDates = Array.from(new Set([...current.completedDates, todayKey])).sort();
  const metrics = calculateStreakMetrics(nextDates, current.bestStreak, todayKey);

  let unlockedMilestone: StreakMilestone | null = null;
  const nextClaimedMilestones = [...current.claimedMilestones];

  // Check if a milestone was reached for the first time
  const eligibleMilestone = LEARNING_STREAK_MILESTONES.find(
    (m) => metrics.currentStreak >= m.days && !nextClaimedMilestones.includes(m.days)
  );

  if (eligibleMilestone) {
    const txId = `learning_streak_milestone_${eligibleMilestone.days}`;
    const ledgerRes = await recordPermanentRewardTransaction(
      uid,
      txId,
      eligibleMilestone.points,
      `Learning Streak Milestone: ${eligibleMilestone.days} Days (${eligibleMilestone.label})`,
      'learning_streak'
    );
    nextClaimedMilestones.push(eligibleMilestone.days);
    if (ledgerRes.recorded && !ledgerRes.alreadyClaimed) {
      unlockedMilestone = eligibleMilestone;
    }
  }

  const nextState: LearningStreakState = {
    ...metrics,
    claimedMilestones: Array.from(new Set(nextClaimedMilestones)).sort((a, b) => a - b),
    lastActivityLabel: activityLabel,
    syncedWithCloud: false,
    updatedAt: new Date().toISOString(),
  };

  saveLocalLearningStreak(uid, nextState);

  if (isAuthenticatedUid(uid)) {
    const db = getFirestoreDB();
    if (db) {
      try {
        const streakRef = doc(db, 'users', uid, 'learning_streak', 'state');
        const snap = await getDoc(streakRef);
        const cloudData = snap.exists() ? snap.data() : {};
        const cloudDates: string[] = Array.isArray(cloudData.completedDates) ? cloudData.completedDates : [];
        const cloudBest = typeof cloudData.bestStreak === 'number' ? cloudData.bestStreak : 0;
        const cloudMilestones: number[] = Array.isArray(cloudData.claimedMilestones) ? cloudData.claimedMilestones : [];

        const unionDates = Array.from(new Set([...cloudDates, ...nextState.completedDates])).sort();
        const unionMilestones = Array.from(new Set([...cloudMilestones, ...nextState.claimedMilestones])).sort((a, b) => a - b);
        const mergedMetrics = calculateStreakMetrics(unionDates, Math.max(cloudBest, nextState.bestStreak), todayKey);

        const syncedState: LearningStreakState = {
          ...mergedMetrics,
          claimedMilestones: unionMilestones,
          lastActivityLabel: activityLabel,
          syncedWithCloud: true,
          updatedAt: new Date().toISOString(),
        };

        await setDoc(
          streakRef,
          {
            uid,
            completedDates: syncedState.completedDates,
            bestStreak: syncedState.bestStreak,
            claimedMilestones: syncedState.claimedMilestones,
            lastCompletedDate: syncedState.lastCompletedDate,
            lastActivityLabel: activityLabel,
            updatedAt: syncedState.updatedAt,
          },
          { merge: true }
        );

        saveLocalLearningStreak(uid, syncedState);
        return {
          state: syncedState,
          alreadyCompletedToday: false,
          unlockedMilestone,
        };
      } catch (err) {
        if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
        queueWriteLocally({
          type: 'syncLearningStreak',
          payload: {
            uid,
            completedDates: nextState.completedDates,
            bestStreak: nextState.bestStreak,
            claimedMilestones: nextState.claimedMilestones,
            lastActivityLabel: activityLabel,
          },
          timestamp: Date.now(),
        });
      }
    } else {
      queueWriteLocally({
        type: 'syncLearningStreak',
        payload: {
          uid,
          completedDates: nextState.completedDates,
          bestStreak: nextState.bestStreak,
          claimedMilestones: nextState.claimedMilestones,
          lastActivityLabel: activityLabel,
        },
        timestamp: Date.now(),
      });
    }
  }

  return {
    state: nextState,
    alreadyCompletedToday: false,
    unlockedMilestone,
  };
}

export function getNextStreakMilestone(currentStreak: number, claimedMilestones: number[]): StreakMilestone | null {
  return (
    LEARNING_STREAK_MILESTONES.find(
      (m) => currentStreak < m.days || !claimedMilestones.includes(m.days)
    ) || null
  );
}
