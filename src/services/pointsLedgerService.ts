import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  orderBy,
  limit,
  runTransaction,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  getFirestoreDB,
  queueWriteLocally,
  isQuotaOrResourceExhausted,
  notifyServerBusy,
  registerAtomicPointsTxHandler,
} from './firestoreService';
import { getLocalDateKey } from './learningStreakService';
import {
  MIN_WITHDRAW_USD,
  clampPointsPerDollar,
  getConfiguredPointsPerDollar,
} from '../config/paymentConfig';

export const ELIGIBLE_ACTIVITY_REWARD_POINTS = 1;

export type LedgerTxStatus = 'verified' | 'pending_sync' | 'reconciled' | 'admin_adjustment';
export type PointCategory = 'eligible_activity' | 'daily_reward' | 'referral' | 'general';

export interface DollarConversionRecord {
  conversionId: string;
  uid: string;
  pointsConverted: number;
  thresholdUsed: number;
  dollarsAdded: number;
  remainingPointsCarriedForward: number;
  dollarBalanceAfter: number;
  createdAt: string;
}

export interface PointsLedgerEntry {
  txId: string;
  uid: string;
  points: number; // positive for earn, negative for deduction
  balanceAfter?: number;
  reason: string;
  activityRef: string;
  category?: PointCategory;
  status: LedgerTxStatus;
  createdAt: string;
  adminEmail?: string;
}

export interface LocalPointsVault {
  uid: string;
  points: number;
  todayPoints: number;
  todayDateKey: string;
  totalEarned: number;
  streakDays: number;
  approvedBalanceUSD: number;
  // Separate Category A: Eligible non-ad activity points & automatic USD conversion wallet
  eligiblePoints: number;
  totalEligiblePointsEarned: number;
  convertedDollarBalance: number;
  conversionCount: number;
  conversionTxs: DollarConversionRecord[];
  // Separate Category B: Daily Rewards (NEVER mixed into eligiblePoints or USD conversion counter)
  dailyRewardPoints: number;
  dailyRewardTxs: PointsLedgerEntry[];
  // Separate Category C: Referral Rewards (permanent, NEVER mixed into Daily Rewards)
  referralPoints: number;
  referralTxs: PointsLedgerEntry[];
  lastVerifiedAt: string | null;
  pendingTxs: PointsLedgerEntry[];
  verifiedTxs: PointsLedgerEntry[];
  pointsResetMigrationId?: string;
  pointsResetAt?: string;
  updatedAt?: string;
}

export interface AtomicTxResult {
  status: 'committed' | 'duplicate' | 'queued_offline' | 'rejected';
  txId: string;
  balance: number;
  totalEarned: number;
  category?: PointCategory;
  eligiblePoints?: number;
  convertedDollarBalance?: number;
  dollarsConvertedNow?: number;
  dailyRewardPoints?: number;
  referralPoints?: number;
  entry?: PointsLedgerEntry;
  conversion?: DollarConversionRecord;
  reason?: string;
}

export interface VerifiedBalanceLoadResult {
  syncStatus: 'verified' | 'reconciled' | 'new_account' | 'cached_unverified';
  points: number;
  todayPoints: number;
  totalEarned: number;
  streakDays: number;
  approvedBalanceUSD: number;
  pendingSyncCount: number;
  transactions: PointsLedgerEntry[];
  reconciledDiff?: number;
  pointsResetMigrationId?: string;
  pointsResetAt?: string;
  errorReason?: string;
}

export interface ReconciliationDecision {
  action: 'none' | 'reconcile_upward' | 'flag_for_review';
  trustedBalance: number;
  ledgerNetTotal: number;
  duplicateCount: number;
  diff: number;
  note: string;
}

const VAULT_PREFIX = 'joyearn_points_vault_v2_';
const BACKUP_PREFIX = 'joyearn_points_backup_v2_';
const MAX_SINGLE_EARN = 2500;

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

export function sanitizeTxId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
}

export function generatePointsTxId(activityRef: string, dateKey: string = getLocalDateKey()): string {
  const cleanRef = activityRef.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 48);
  const rand = Math.random().toString(36).slice(2, 8);
  return sanitizeTxId(`ptx_${dateKey}_${cleanRef}_${Date.now()}_${rand}`);
}

export function isAdMobActivity(activityRef = '', reason = ''): boolean {
  const combined = `${activityRef} ${reason}`.toLowerCase();
  return /\b(admob|rewarded_ad|partner_ad|watch.*ad|ad_click|interstitial_ad|banner_ad)\b/.test(combined);
}

export function classifyPointCategory(activityRef = '', reason = ''): PointCategory {
  const combined = `${activityRef} ${reason}`.toLowerCase();
  if (
    /\b(daily_checkin|daily_login|daily_bonus|daily_reward|daily_chest|treasure_chest|lucky_wheel|free_spin|spin_wheel|check-in|check in|login bonus)\b/.test(
      combined
    )
  ) {
    return 'daily_reward';
  }
  if (/\b(referral|invite_friend|invite friend|ref_bonus)\b/.test(combined)) {
    return 'referral';
  }
  return 'eligible_activity';
}

export function evaluateDollarConversion(
  eligiblePoints: number,
  threshold?: number
): {
  dollarsEarned: number;
  remainingPoints: number;
  pointsConverted: number;
  thresholdUsed: number;
} {
  const thresholdUsed = clampPointsPerDollar(threshold ?? getConfiguredPointsPerDollar());
  const safePts = Math.max(0, Math.floor(eligiblePoints));
  if (safePts < thresholdUsed) {
    return {
      dollarsEarned: 0,
      remainingPoints: safePts,
      pointsConverted: 0,
      thresholdUsed,
    };
  }
  const dollarsEarned = Math.floor(safePts / thresholdUsed);
  const pointsConverted = dollarsEarned * thresholdUsed;
  const remainingPoints = safePts - pointsConverted;
  return {
    dollarsEarned,
    remainingPoints,
    pointsConverted,
    thresholdUsed,
  };
}

export function canWithdrawFromDollarWallet(dollarBalance: number): boolean {
  return typeof dollarBalance === 'number' && Number.isFinite(dollarBalance) && dollarBalance >= MIN_WITHDRAW_USD;
}

function applyCategoryBalances(
  vault: LocalPointsVault,
  category: PointCategory,
  cleanDelta: number,
  entry: PointsLedgerEntry,
  nowIso: string,
  conversionThresholdOverride?: number
): {
  eligiblePoints: number;
  totalEligiblePointsEarned: number;
  convertedDollarBalance: number;
  conversionCount: number;
  conversionTxs: DollarConversionRecord[];
  dailyRewardPoints: number;
  dailyRewardTxs: PointsLedgerEntry[];
  referralPoints: number;
  referralTxs: PointsLedgerEntry[];
  conversionRecord?: DollarConversionRecord;
} {
  let eligiblePoints = vault.eligiblePoints;
  let totalEligiblePointsEarned = vault.totalEligiblePointsEarned;
  let convertedDollarBalance = vault.convertedDollarBalance;
  let conversionCount = vault.conversionCount;
  let conversionTxs = [...vault.conversionTxs];
  let dailyRewardPoints = vault.dailyRewardPoints;
  let dailyRewardTxs = [...vault.dailyRewardTxs];
  let referralPoints = vault.referralPoints;
  let referralTxs = [...vault.referralTxs];
  let conversionRecord: DollarConversionRecord | undefined;

  if (category === 'daily_reward') {
    // STRICT SEPARATION: Daily Rewards NEVER touch eligiblePoints or USD conversion counter
    dailyRewardPoints = Math.max(0, dailyRewardPoints + cleanDelta);
    dailyRewardTxs = [entry, ...dailyRewardTxs.filter((t) => t.txId !== entry.txId)].slice(0, 200);
  } else if (category === 'referral') {
    // STRICT SEPARATION: Referral Rewards stored permanently in referral category (never mixed with Daily Rewards)
    referralPoints = Math.max(0, referralPoints + cleanDelta);
    referralTxs = [entry, ...referralTxs.filter((t) => t.txId !== entry.txId)].slice(0, 200);
  } else if (category === 'eligible_activity') {
    if (cleanDelta > 0) {
      eligiblePoints += cleanDelta;
      totalEligiblePointsEarned += cleanDelta;
      const conv = evaluateDollarConversion(eligiblePoints, conversionThresholdOverride);
      if (conv.dollarsEarned > 0) {
        const nextConversionIndex = conversionCount + 1;
        const conversionId = sanitizeTxId(
          `conv_${vault.uid}_${nextConversionIndex}_${conv.thresholdUsed}_${entry.txId}`
        );
        if (!conversionTxs.some((c) => c.conversionId === conversionId)) {
          eligiblePoints = conv.remainingPoints;
          convertedDollarBalance = +(convertedDollarBalance + conv.dollarsEarned).toFixed(2);
          conversionCount = nextConversionIndex;
          conversionRecord = {
            conversionId,
            uid: vault.uid,
            pointsConverted: conv.pointsConverted,
            thresholdUsed: conv.thresholdUsed,
            dollarsAdded: conv.dollarsEarned,
            remainingPointsCarriedForward: conv.remainingPoints,
            dollarBalanceAfter: convertedDollarBalance,
            createdAt: nowIso,
          };
          conversionTxs = [conversionRecord, ...conversionTxs].slice(0, 200);
        }
      }
    } else if (cleanDelta < 0) {
      eligiblePoints = Math.max(0, eligiblePoints + cleanDelta);
    }
  }

  return {
    eligiblePoints,
    totalEligiblePointsEarned,
    convertedDollarBalance,
    conversionCount,
    conversionTxs,
    dailyRewardPoints,
    dailyRewardTxs,
    referralPoints,
    referralTxs,
    conversionRecord,
  };
}

export function readLocalPointsVault(uid?: string): LocalPointsVault {
  const key = `${VAULT_PREFIX}${uid || 'local'}`;
  const todayKey = getLocalDateKey();

  // Read any legacy/existing permanent point balances so migration or day rollover NEVER drops points to 0
  let legacyPoints = 0;
  let legacyTotal = 0;
  try {
    const uidPts = uid ? parseInt(localStorage.getItem(`joyearn_points_${uid}`) || '', 10) : NaN;
    const globalPts = parseInt(localStorage.getItem('joyearn_points') || '', 10);
    const uidLife = uid ? parseInt(localStorage.getItem(`joyearn_lifetime_points_${uid}`) || '', 10) : NaN;
    const globalLife = parseInt(localStorage.getItem('joyearn_lifetime_points') || '', 10);
    if (!Number.isNaN(uidPts) && uidPts > 0) legacyPoints = Math.max(legacyPoints, uidPts);
    if (!Number.isNaN(globalPts) && globalPts > 0 && !uid) legacyPoints = Math.max(legacyPoints, globalPts);
    if (!Number.isNaN(uidLife) && uidLife > 0) legacyTotal = Math.max(legacyTotal, uidLife);
    if (!Number.isNaN(globalLife) && globalLife > 0 && !uid) legacyTotal = Math.max(legacyTotal, globalLife);
  } catch {}

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalPointsVault>;
      const sameDay = parsed.todayDateKey === todayKey;
      const vaultPoints =
        typeof parsed.points === 'number' && Number.isFinite(parsed.points) ? Math.max(0, parsed.points) : 0;
      const hasControlledReset = typeof parsed.pointsResetMigrationId === 'string' && parsed.pointsResetMigrationId.length > 0;
      const safePoints = hasControlledReset ? vaultPoints : Math.max(vaultPoints, legacyPoints);
      const vaultTotal =
        typeof parsed.totalEarned === 'number' && Number.isFinite(parsed.totalEarned)
          ? Math.max(0, parsed.totalEarned)
          : 0;
      const safeTotal = hasControlledReset ? Math.max(vaultTotal, safePoints) : Math.max(vaultTotal, legacyTotal, safePoints);
      return {
        uid: uid || 'local',
        // LIFETIME POINTS NEVER RESET AT MIDNIGHT
        points: safePoints,
        // ONLY daily counter resets when local date changes
        todayPoints: sameDay && typeof parsed.todayPoints === 'number' ? Math.max(0, parsed.todayPoints) : 0,
        todayDateKey: todayKey,
        totalEarned: safeTotal,
        streakDays: typeof parsed.streakDays === 'number' ? Math.max(0, parsed.streakDays) : 0,
        approvedBalanceUSD: typeof parsed.approvedBalanceUSD === 'number' ? Math.max(0, parsed.approvedBalanceUSD) : 0,
        eligiblePoints: typeof parsed.eligiblePoints === 'number' && Number.isFinite(parsed.eligiblePoints) ? Math.max(0, parsed.eligiblePoints) : 0,
        totalEligiblePointsEarned:
          typeof parsed.totalEligiblePointsEarned === 'number' && Number.isFinite(parsed.totalEligiblePointsEarned)
            ? Math.max(0, parsed.totalEligiblePointsEarned)
            : 0,
        convertedDollarBalance:
          typeof parsed.convertedDollarBalance === 'number' && Number.isFinite(parsed.convertedDollarBalance)
            ? Math.max(0, parsed.convertedDollarBalance)
            : 0,
        conversionCount: typeof parsed.conversionCount === 'number' ? Math.max(0, parsed.conversionCount) : 0,
        conversionTxs: Array.isArray(parsed.conversionTxs) ? parsed.conversionTxs : [],
        dailyRewardPoints: typeof parsed.dailyRewardPoints === 'number' ? Math.max(0, parsed.dailyRewardPoints) : 0,
        dailyRewardTxs: Array.isArray(parsed.dailyRewardTxs) ? parsed.dailyRewardTxs : [],
        referralPoints: typeof parsed.referralPoints === 'number' ? Math.max(0, parsed.referralPoints) : 0,
        referralTxs: Array.isArray(parsed.referralTxs) ? parsed.referralTxs : [],
        lastVerifiedAt: typeof parsed.lastVerifiedAt === 'string' ? parsed.lastVerifiedAt : null,
        pendingTxs: Array.isArray(parsed.pendingTxs) ? parsed.pendingTxs : [],
        verifiedTxs: Array.isArray(parsed.verifiedTxs) ? parsed.verifiedTxs : [],
        pointsResetMigrationId: typeof parsed.pointsResetMigrationId === 'string' ? parsed.pointsResetMigrationId : undefined,
        pointsResetAt: typeof parsed.pointsResetAt === 'string' ? parsed.pointsResetAt : undefined,
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : undefined,
      };
    }
  } catch {}

  return {
    uid: uid || 'local',
    points: legacyPoints,
    todayPoints: 0,
    todayDateKey: todayKey,
    totalEarned: Math.max(legacyTotal, legacyPoints),
    streakDays: 0,
    approvedBalanceUSD: 0,
    eligiblePoints: 0,
    totalEligiblePointsEarned: 0,
    convertedDollarBalance: 0,
    conversionCount: 0,
    conversionTxs: [],
    dailyRewardPoints: 0,
    dailyRewardTxs: [],
    referralPoints: 0,
    referralTxs: [],
    lastVerifiedAt: null,
    pendingTxs: [],
    verifiedTxs: [],
  };
}

export function saveLocalPointsVault(uid: string | undefined, vault: LocalPointsVault): void {
  try {
    localStorage.setItem(`${VAULT_PREFIX}${uid || 'local'}`, JSON.stringify(vault));
  } catch {}
}

/**
 * Saves an immutable point-in-time local backup snapshot before reconciliation or migration.
 */
export function savePointsBackupSnapshot(uid: string, vault: LocalPointsVault, label: string): void {
  try {
    const backup = {
      label,
      capturedAt: new Date().toISOString(),
      uid,
      points: vault.points,
      totalEarned: vault.totalEarned,
      approvedBalanceUSD: vault.approvedBalanceUSD,
      verifiedTxCount: vault.verifiedTxs.length,
      pendingTxCount: vault.pendingTxs.length,
    };
    localStorage.setItem(`${BACKUP_PREFIX}${uid}`, JSON.stringify(backup));
  } catch {}
}

/**
 * Pure, deterministic reconciliation evaluator:
 * - Deduplicates ledger entries by txId.
 * - Computes net points from verified ledger entries.
 * - Never invents points and never silently removes legitimate pre-ledger balances.
 * - If verified ledger total exceeds saved balance (e.g. interrupted write), reconciles upward.
 * - If saved balance exceeds ledger total (e.g. legacy pre-ledger points), preserves saved balance
 *   and flags for authorized review without wiping user points.
 */
export function evaluateLedgerReconciliation(
  serverPoints: number,
  ledgerEntries: PointsLedgerEntry[],
  hasLegacyPreLedgerBalance = false
): ReconciliationDecision {
  const seen = new Set<string>();
  let duplicateCount = 0;
  let ledgerNetTotal = 0;

  for (const entry of ledgerEntries) {
    if (!entry || !entry.txId || typeof entry.points !== 'number' || !Number.isFinite(entry.points)) {
      continue;
    }
    if (seen.has(entry.txId)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(entry.txId);
    if (entry.status === 'verified' || entry.status === 'reconciled' || entry.status === 'admin_adjustment') {
      ledgerNetTotal += entry.points;
    }
  }

  const safeServer = Math.max(0, Math.round(serverPoints));
  const safeLedger = Math.max(0, Math.round(ledgerNetTotal));
  const diff = safeLedger - safeServer;

  if (seen.size === 0 || diff === 0) {
    return {
      action: 'none',
      trustedBalance: safeServer,
      ledgerNetTotal: safeLedger,
      duplicateCount,
      diff: 0,
      note: 'Balance matches verified ledger.',
    };
  }

  if (diff > 0) {
    return {
      action: 'reconcile_upward',
      trustedBalance: safeLedger,
      ledgerNetTotal: safeLedger,
      duplicateCount,
      diff,
      note: `Recovered +${diff} verified ledger points that were missing from user balance document.`,
    };
  }

  // safeServer > safeLedger: preserve user's existing balance (could include legacy pre-ledger points)
  return {
    action: hasLegacyPreLedgerBalance ? 'none' : 'flag_for_review',
    trustedBalance: safeServer,
    ledgerNetTotal: safeLedger,
    duplicateCount,
    diff,
    note: 'Saved balance exceeds ledger sum (likely includes pre-ledger history); balance preserved and flagged for audit review.',
  };
}

/**
 * Commits a single points earn or deduction atomically to Firestore:
 * 1. Enforces idempotency via `/users/{uid}/reward_ledger/{txId}` inside `runTransaction`.
 * 2. Computes `nextBalance = serverPoints + pointsDelta` atomically on the server document
 *    so simultaneous multi-device updates NEVER overwrite each other.
 * 3. If offline or Firestore is temporarily unreachable, queues the exact idempotent delta
 *    locally (`pending_sync`) and replays it safely on reconnect.
 */
export async function commitAtomicPointsTransaction(params: {
  uid?: string;
  txId: string;
  pointsDelta: number;
  reason: string;
  activityRef: string;
  category?: PointCategory;
  conversionThresholdOverride?: number;
  email?: string | null;
  displayName?: string | null;
  streakDays?: number;
}): Promise<AtomicTxResult> {
  const {
    uid,
    pointsDelta,
    reason,
    activityRef,
    conversionThresholdOverride,
    email = null,
    displayName = null,
    streakDays,
  } = params;

  // Strict AdMob separation: advertising activity can NEVER credit cash-convertible points
  if (isAdMobActivity(activityRef, reason)) {
    return {
      status: 'rejected',
      txId: params.txId,
      balance: 0,
      totalEarned: 0,
      reason: 'AdMob advertising activity is strictly separate from cash-convertible rewards.',
    };
  }

  const category: PointCategory = params.category || classifyPointCategory(activityRef, reason);

  const cleanDelta = Math.round(pointsDelta);
  if (!Number.isFinite(cleanDelta) || cleanDelta === 0) {
    return { status: 'rejected', txId: params.txId, balance: 0, totalEarned: 0, reason: 'Invalid points amount.' };
  }
  if (cleanDelta > MAX_SINGLE_EARN) {
    return { status: 'rejected', txId: params.txId, balance: 0, totalEarned: 0, reason: 'Exceeds single-transaction ceiling.' };
  }

  const cleanTxId = sanitizeTxId(params.txId);
  const nowIso = new Date().toISOString();
  const todayKey = getLocalDateKey();
  const vault = readLocalPointsVault(uid);

  // Local idempotency check (prevents double clicks, duplicate retries, and duplicate conversions)
  const alreadyInLocal =
    vault.verifiedTxs.some((t) => t.txId === cleanTxId) ||
    vault.pendingTxs.some((t) => t.txId === cleanTxId) ||
    vault.dailyRewardTxs.some((t) => t.txId === cleanTxId) ||
    vault.referralTxs.some((t) => t.txId === cleanTxId);
  if (alreadyInLocal) {
    return {
      status: 'duplicate',
      txId: cleanTxId,
      balance: vault.points,
      totalEarned: vault.totalEarned,
      category,
      eligiblePoints: vault.eligiblePoints,
      convertedDollarBalance: vault.convertedDollarBalance,
      dollarsConvertedNow: 0,
      dailyRewardPoints: vault.dailyRewardPoints,
      referralPoints: vault.referralPoints,
    };
  }

  if (cleanDelta < 0 && vault.points + cleanDelta < 0) {
    return {
      status: 'rejected',
      txId: cleanTxId,
      balance: vault.points,
      totalEarned: vault.totalEarned,
      reason: 'Insufficient points balance.',
    };
  }

  const optimisticBalance = Math.max(0, vault.points + cleanDelta);
  const optimisticTotal = cleanDelta > 0 ? Math.max(vault.totalEarned, vault.points) + cleanDelta : Math.max(vault.totalEarned, vault.points);
  const optimisticToday = cleanDelta > 0 ? vault.todayPoints + cleanDelta : vault.todayPoints;

  const localEntry: PointsLedgerEntry = {
    txId: cleanTxId,
    uid: uid || 'local',
    points: cleanDelta,
    balanceAfter: optimisticBalance,
    reason: reason.slice(0, 200),
    activityRef: activityRef.slice(0, 100),
    category,
    status: isAuthenticatedUid(uid) ? 'pending_sync' : 'verified',
    createdAt: nowIso,
  };

  const catUpdate = applyCategoryBalances(
    vault,
    category,
    cleanDelta,
    localEntry,
    nowIso,
    conversionThresholdOverride
  );

  // Unauthenticated / local-only session
  if (!isAuthenticatedUid(uid)) {
    const nextVault: LocalPointsVault = {
      ...vault,
      points: optimisticBalance,
      todayPoints: optimisticToday,
      todayDateKey: todayKey,
      totalEarned: optimisticTotal,
      streakDays: typeof streakDays === 'number' ? Math.max(vault.streakDays, streakDays) : vault.streakDays,
      eligiblePoints: catUpdate.eligiblePoints,
      totalEligiblePointsEarned: catUpdate.totalEligiblePointsEarned,
      convertedDollarBalance: catUpdate.convertedDollarBalance,
      conversionCount: catUpdate.conversionCount,
      conversionTxs: catUpdate.conversionTxs,
      dailyRewardPoints: catUpdate.dailyRewardPoints,
      dailyRewardTxs: catUpdate.dailyRewardTxs,
      referralPoints: catUpdate.referralPoints,
      referralTxs: catUpdate.referralTxs,
      verifiedTxs: [localEntry, ...vault.verifiedTxs].slice(0, 200),
    };
    saveLocalPointsVault(uid, nextVault);
    return {
      status: 'committed',
      txId: cleanTxId,
      balance: optimisticBalance,
      totalEarned: optimisticTotal,
      category,
      eligiblePoints: catUpdate.eligiblePoints,
      convertedDollarBalance: catUpdate.convertedDollarBalance,
      dollarsConvertedNow: catUpdate.conversionRecord?.dollarsAdded || 0,
      dailyRewardPoints: catUpdate.dailyRewardPoints,
      referralPoints: catUpdate.referralPoints,
      entry: localEntry,
      conversion: catUpdate.conversionRecord,
    };
  }

  // Authenticated user: execute atomic Firestore transaction
  const db = getFirestoreDB();
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const ledgerRef = doc(db, 'users', uid, 'reward_ledger', cleanTxId);

      const txOutcome = await runTransaction(db, async (tx) => {
        const [existingLedgerSnap, userSnap] = await Promise.all([
          tx.get(ledgerRef),
          tx.get(userRef),
        ]);

        const serverData = userSnap.exists() ? userSnap.data() : {};
        const serverPoints = typeof serverData.points === 'number' ? Math.max(0, serverData.points) : 0;
        const serverTotal = typeof serverData.totalEarned === 'number' ? Math.max(serverData.totalEarned, serverPoints) : serverPoints;
        const serverToday =
          serverData.lastActiveDate === todayKey && typeof serverData.todayPoints === 'number'
            ? Math.max(0, serverData.todayPoints)
            : 0;
        const serverStreak = typeof serverData.streakDays === 'number' ? Math.max(0, serverData.streakDays) : 0;

        // Idempotency guard on server: never double-award the same txId
        if (existingLedgerSnap.exists()) {
          return {
            duplicate: true as const,
            balance: serverPoints,
            totalEarned: serverTotal,
            todayPoints: serverToday,
            streakDays: serverStreak,
          };
        }

        if (cleanDelta < 0 && serverPoints + cleanDelta < 0) {
          throw new Error('INSUFFICIENT_SERVER_POINTS');
        }

        const nextServerBalance = Math.max(0, serverPoints + cleanDelta);
        const nextServerTotal = cleanDelta > 0 ? serverTotal + cleanDelta : serverTotal;
        const nextServerToday = cleanDelta > 0 ? serverToday + cleanDelta : serverToday;
        const nextServerStreak =
          typeof streakDays === 'number' ? Math.max(serverStreak, streakDays) : serverStreak;

        tx.set(ledgerRef, {
          txId: cleanTxId,
          uid,
          points: cleanDelta,
          balanceAfter: nextServerBalance,
          reason: reason.slice(0, 200),
          activityRef: activityRef.slice(0, 100),
          category,
          status: 'verified',
          createdAt: nowIso,
          serverCreatedAt: serverTimestamp(),
        });

        const userPatch: Record<string, any> = {
          uid,
          points: nextServerBalance,
          totalEarned: nextServerTotal,
          todayPoints: nextServerToday,
          streakDays: nextServerStreak,
          eligiblePoints: catUpdate.eligiblePoints,
          totalEligiblePointsEarned: catUpdate.totalEligiblePointsEarned,
          convertedDollarBalance: catUpdate.convertedDollarBalance,
          dailyRewardPoints: catUpdate.dailyRewardPoints,
          referralPoints: catUpdate.referralPoints,
          lastActiveDate: todayKey,
          updatedAt: nowIso,
          serverUpdatedAt: serverTimestamp(),
        };
        if (email) userPatch.email = email;
        if (displayName) userPatch.displayName = displayName;
        if (!userSnap.exists()) {
          userPatch.approvedBalanceUSD = 0;
          userPatch.role = 'member';
        }

        tx.set(userRef, userPatch, { merge: true });

        return {
          duplicate: false as const,
          balance: nextServerBalance,
          totalEarned: nextServerTotal,
          todayPoints: nextServerToday,
          streakDays: nextServerStreak,
        };
      });

      if (txOutcome.duplicate) {
        return {
          status: 'duplicate',
          txId: cleanTxId,
          balance: txOutcome.balance,
          totalEarned: txOutcome.totalEarned,
        };
      }

      const verifiedEntry: PointsLedgerEntry = {
        ...localEntry,
        balanceAfter: txOutcome.balance,
        status: 'verified',
      };

      const nextVault: LocalPointsVault = {
        ...vault,
        points: txOutcome.balance,
        todayPoints: txOutcome.todayPoints,
        todayDateKey: todayKey,
        totalEarned: txOutcome.totalEarned,
        streakDays: txOutcome.streakDays,
        eligiblePoints: catUpdate.eligiblePoints,
        totalEligiblePointsEarned: catUpdate.totalEligiblePointsEarned,
        convertedDollarBalance: catUpdate.convertedDollarBalance,
        conversionCount: catUpdate.conversionCount,
        conversionTxs: catUpdate.conversionTxs,
        dailyRewardPoints: catUpdate.dailyRewardPoints,
        dailyRewardTxs: catUpdate.dailyRewardTxs,
        referralPoints: catUpdate.referralPoints,
        referralTxs: catUpdate.referralTxs,
        lastVerifiedAt: nowIso,
        pendingTxs: vault.pendingTxs.filter((t) => t.txId !== cleanTxId),
        verifiedTxs: [verifiedEntry, ...vault.verifiedTxs.filter((t) => t.txId !== cleanTxId)].slice(0, 200),
      };
      saveLocalPointsVault(uid, nextVault);

      return {
        status: 'committed',
        txId: cleanTxId,
        balance: txOutcome.balance,
        totalEarned: txOutcome.totalEarned,
        category,
        eligiblePoints: catUpdate.eligiblePoints,
        convertedDollarBalance: catUpdate.convertedDollarBalance,
        dollarsConvertedNow: catUpdate.conversionRecord?.dollarsAdded || 0,
        dailyRewardPoints: catUpdate.dailyRewardPoints,
        referralPoints: catUpdate.referralPoints,
        entry: verifiedEntry,
        conversion: catUpdate.conversionRecord,
      };
    } catch (err: any) {
      if (err?.message === 'INSUFFICIENT_SERVER_POINTS') {
        return {
          status: 'rejected',
          txId: cleanTxId,
          balance: vault.points,
          totalEarned: vault.totalEarned,
          reason: 'Insufficient verified balance.',
        };
      }
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
      }
      // Fall through to safe offline queuing — NEVER lose the transaction or zero out balance
    }
  }

  // Offline / transient backend failure: save as pending_sync and queue for automatic replay
  const queuedVault: LocalPointsVault = {
    ...vault,
    points: optimisticBalance,
    todayPoints: optimisticToday,
    todayDateKey: todayKey,
    totalEarned: optimisticTotal,
    streakDays: typeof streakDays === 'number' ? Math.max(vault.streakDays, streakDays) : vault.streakDays,
    eligiblePoints: catUpdate.eligiblePoints,
    totalEligiblePointsEarned: catUpdate.totalEligiblePointsEarned,
    convertedDollarBalance: catUpdate.convertedDollarBalance,
    conversionCount: catUpdate.conversionCount,
    conversionTxs: catUpdate.conversionTxs,
    dailyRewardPoints: catUpdate.dailyRewardPoints,
    dailyRewardTxs: catUpdate.dailyRewardTxs,
    referralPoints: catUpdate.referralPoints,
    referralTxs: catUpdate.referralTxs,
    pendingTxs: [localEntry, ...vault.pendingTxs].slice(0, 100),
  };
  saveLocalPointsVault(uid, queuedVault);

  queueWriteLocally({
    type: 'atomicPointsTx',
    payload: {
      uid,
      txId: cleanTxId,
      pointsDelta: cleanDelta,
      reason: reason.slice(0, 200),
      activityRef: activityRef.slice(0, 100),
      category,
      email,
      displayName,
      streakDays,
    },
    timestamp: Date.now(),
  });

  return {
    status: 'queued_offline',
    txId: cleanTxId,
    balance: optimisticBalance,
    totalEarned: optimisticTotal,
    category,
    eligiblePoints: catUpdate.eligiblePoints,
    convertedDollarBalance: catUpdate.convertedDollarBalance,
    dollarsConvertedNow: catUpdate.conversionRecord?.dollarsAdded || 0,
    dailyRewardPoints: catUpdate.dailyRewardPoints,
    referralPoints: catUpdate.referralPoints,
    entry: localEntry,
    conversion: catUpdate.conversionRecord,
  };
}

/**
 * Records exactly +1 automatic point for a successfully completed eligible non-ad activity.
 * - Rejects AdMob/ad activities.
 * - Prevents duplicate txIds.
 * - Automatically converts to USD at the configured threshold (default 8,000, configurable 10,000)
 *   and carries forward remaining points.
 */
export async function recordEligibleActivityPoint(params: {
  uid?: string;
  txId: string;
  reason: string;
  activityRef: string;
  conversionThresholdOverride?: number;
  email?: string | null;
  displayName?: string | null;
}): Promise<AtomicTxResult> {
  return commitAtomicPointsTransaction({
    ...params,
    pointsDelta: ELIGIBLE_ACTIVITY_REWARD_POINTS,
    category: 'eligible_activity',
  });
}

/**
 * Loads the authoritative server points balance and recent verified ledger history.
 * - NEVER returns a false zero balance when Firestore is temporarily unavailable.
 * - Keeps approvedBalanceUSD strictly separate from points.
 * - Automatically detects & safely reconciles verified ledger mismatches with audit logging.
 */
export async function loadVerifiedUserBalance(uid: string): Promise<VerifiedBalanceLoadResult> {
  const vault = readLocalPointsVault(uid);
  const todayKey = getLocalDateKey();

  if (!isAuthenticatedUid(uid)) {
    return {
      syncStatus: 'cached_unverified',
      points: vault.points,
      todayPoints: vault.todayPoints,
      totalEarned: vault.totalEarned,
      streakDays: vault.streakDays,
      approvedBalanceUSD: vault.approvedBalanceUSD,
      pendingSyncCount: vault.pendingTxs.length,
      transactions: [...vault.pendingTxs, ...vault.verifiedTxs].slice(0, 150),
    };
  }

  const db = getFirestoreDB();
  if (!db) {
    return {
      syncStatus: 'cached_unverified',
      points: vault.points,
      todayPoints: vault.todayPoints,
      totalEarned: vault.totalEarned,
      streakDays: vault.streakDays,
      approvedBalanceUSD: vault.approvedBalanceUSD,
      pendingSyncCount: vault.pendingTxs.length,
      transactions: [...vault.pendingTxs, ...vault.verifiedTxs].slice(0, 150),
      errorReason: 'Cloud database unavailable; showing last verified balance.',
    };
  }

  try {
    const userRef = doc(db, 'users', uid);
    const [userSnap, ledgerSnap] = await Promise.all([
      getDoc(userRef),
      getDocs(
        query(
          collection(db, 'users', uid, 'reward_ledger'),
          orderBy('createdAt', 'desc'),
          limit(150)
        )
      ).catch(() => null),
    ]);

    const serverLedger: PointsLedgerEntry[] = ledgerSnap
      ? ledgerSnap.docs.map((d) => {
          const data = d.data();
          return {
            txId: String(data.txId || d.id),
            uid: String(data.uid || uid),
            points: typeof data.points === 'number' ? data.points : 0,
            balanceAfter: typeof data.balanceAfter === 'number' ? data.balanceAfter : undefined,
            reason: String(data.reason || 'Reward transaction'),
            activityRef: String(data.activityRef || data.source || 'activity'),
            status: (data.status as LedgerTxStatus) || 'verified',
            createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
            adminEmail: typeof data.adminEmail === 'string' ? data.adminEmail : undefined,
          };
        })
      : vault.verifiedTxs;

    if (!userSnap.exists()) {
      return {
        syncStatus: 'new_account',
        points: vault.points,
        todayPoints: vault.todayPoints,
        totalEarned: Math.max(vault.totalEarned, vault.points),
        streakDays: vault.streakDays,
        approvedBalanceUSD: 0,
        pendingSyncCount: vault.pendingTxs.length,
        transactions: [...vault.pendingTxs, ...serverLedger].slice(0, 150),
      };
    }

    const data = userSnap.data();
    let serverPoints = typeof data.points === 'number' ? Math.max(0, data.points) : 0;
    const serverTotal = typeof data.totalEarned === 'number' ? Math.max(data.totalEarned, serverPoints) : serverPoints;
    const serverToday =
      data.lastActiveDate === todayKey && typeof data.todayPoints === 'number'
        ? Math.max(0, data.todayPoints)
        : 0;
    const serverStreak = typeof data.streakDays === 'number' ? Math.max(0, data.streakDays) : 0;
    const approvedBalanceUSD =
      typeof data.approvedBalanceUSD === 'number' ? Math.max(0, data.approvedBalanceUSD) : 0;

    const serverResetMigrationId =
      typeof data.pointsResetMigrationId === 'string' ? data.pointsResetMigrationId : undefined;
    const serverResetAt =
      typeof data.pointsResetAt === 'string' ? data.pointsResetAt : undefined;

    // Remove any local pendingTxs that are already present in serverLedger
    const serverTxIds = new Set(serverLedger.map((t) => t.txId));
    const stillPending = vault.pendingTxs.filter((t) => {
      if (serverTxIds.has(t.txId)) return false;
      // Ignore stale pre-reset pending transactions if server has completed a controlled reset
      if (serverResetAt && t.createdAt && t.createdAt < serverResetAt) return false;
      return true;
    });
    const remainingPendingDelta = stillPending.reduce((sum, t) => sum + (t.points || 0), 0);

    // Automatic safe reconciliation check:
    // If a controlled one-time points reset occurred, ONLY reconcile post-reset ledger entries
    // so historical pre-reset transactions remain preserved without resurrecting cleared balances.
    const ledgerForReconciliation = serverResetAt
      ? serverLedger.filter((t) => t.createdAt >= serverResetAt)
      : serverLedger;
    const reconciliation = evaluateLedgerReconciliation(serverPoints, ledgerForReconciliation, true);
    let syncStatus: 'verified' | 'reconciled' = 'verified';
    let reconciledDiff: number | undefined;

    if (reconciliation.action === 'reconcile_upward' && reconciliation.diff > 0) {
      savePointsBackupSnapshot(uid, vault, 'pre_reconciliation');
      try {
        await runTransaction(db, async (tx) => {
          const freshSnap = await tx.get(userRef);
          const freshPts = freshSnap.exists() && typeof freshSnap.data().points === 'number'
            ? freshSnap.data().points
            : 0;
          if (reconciliation.trustedBalance > freshPts) {
            tx.set(
              userRef,
              {
                points: reconciliation.trustedBalance,
                totalEarned: Math.max(serverTotal, reconciliation.trustedBalance),
                updatedAt: new Date().toISOString(),
                serverUpdatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          }
        });

        const logId = `rec_${Date.now()}`;
        await setDoc(doc(db, 'users', uid, 'reconciliation_logs', logId), {
          logId,
          uid,
          previousPoints: serverPoints,
          reconciledPoints: reconciliation.trustedBalance,
          diff: reconciliation.diff,
          ledgerNetTotal: reconciliation.ledgerNetTotal,
          duplicateCount: reconciliation.duplicateCount,
          note: reconciliation.note,
          createdAt: new Date().toISOString(),
          serverCreatedAt: serverTimestamp(),
        });

        serverPoints = reconciliation.trustedBalance;
        syncStatus = 'reconciled';
        reconciledDiff = reconciliation.diff;
      } catch {
        // Never lose points if reconciliation write fails transiently
      }
    }

    const isFreshServerReset = Boolean(
      serverResetMigrationId && vault.pointsResetMigrationId !== serverResetMigrationId
    );
    const effectivePoints = Math.max(0, serverPoints + remainingPendingDelta);
    const effectiveTotal = isFreshServerReset ? effectivePoints : Math.max(serverTotal, effectivePoints);

    const updatedVault: LocalPointsVault = {
      ...vault,
      uid,
      points: effectivePoints,
      todayPoints: isFreshServerReset
        ? serverToday
        : Math.max(serverToday, vault.todayDateKey === todayKey ? vault.todayPoints : 0),
      todayDateKey: todayKey,
      totalEarned: effectiveTotal,
      streakDays: Math.max(serverStreak, vault.streakDays),
      approvedBalanceUSD,
      eligiblePoints: isFreshServerReset
        ? (typeof data.eligiblePoints === 'number' ? Math.max(0, data.eligiblePoints) : 0)
        : Math.max(
            vault.eligiblePoints,
            typeof data.eligiblePoints === 'number' ? Math.max(0, data.eligiblePoints) : 0
          ),
      totalEligiblePointsEarned: isFreshServerReset
        ? (typeof data.totalEligiblePointsEarned === 'number' ? Math.max(0, data.totalEligiblePointsEarned) : 0)
        : Math.max(
            vault.totalEligiblePointsEarned,
            typeof data.totalEligiblePointsEarned === 'number' ? Math.max(0, data.totalEligiblePointsEarned) : 0
          ),
      convertedDollarBalance: Math.max(
        vault.convertedDollarBalance,
        typeof data.convertedDollarBalance === 'number' ? Math.max(0, data.convertedDollarBalance) : 0
      ),
      dailyRewardPoints: isFreshServerReset
        ? (typeof data.dailyRewardPoints === 'number' ? Math.max(0, data.dailyRewardPoints) : 0)
        : Math.max(
            vault.dailyRewardPoints,
            typeof data.dailyRewardPoints === 'number' ? Math.max(0, data.dailyRewardPoints) : 0
          ),
      referralPoints: isFreshServerReset
        ? (typeof data.referralPoints === 'number' ? Math.max(0, data.referralPoints) : 0)
        : Math.max(
            vault.referralPoints,
            typeof data.referralPoints === 'number' ? Math.max(0, data.referralPoints) : 0
          ),
      pointsResetMigrationId: serverResetMigrationId ?? vault.pointsResetMigrationId,
      pointsResetAt: serverResetAt ?? vault.pointsResetAt,
      lastVerifiedAt: new Date().toISOString(),
      pendingTxs: stillPending,
      verifiedTxs: serverLedger,
    };
    saveLocalPointsVault(uid, updatedVault);

    return {
      syncStatus,
      points: effectivePoints,
      todayPoints: updatedVault.todayPoints,
      totalEarned: effectiveTotal,
      streakDays: updatedVault.streakDays,
      approvedBalanceUSD,
      pendingSyncCount: stillPending.length,
      transactions: [...stillPending, ...serverLedger].slice(0, 150),
      reconciledDiff,
      pointsResetMigrationId: updatedVault.pointsResetMigrationId,
      pointsResetAt: updatedVault.pointsResetAt,
    };
  } catch (err: any) {
    // CRITICAL: Never return 0 on transient Firestore/network failure!
    return {
      syncStatus: 'cached_unverified',
      points: vault.points,
      todayPoints: vault.todayPoints,
      totalEarned: Math.max(vault.totalEarned, vault.points),
      streakDays: vault.streakDays,
      approvedBalanceUSD: vault.approvedBalanceUSD,
      pendingSyncCount: vault.pendingTxs.length,
      transactions: [...vault.pendingTxs, ...vault.verifiedTxs].slice(0, 150),
      errorReason: err?.message || 'Unable to verify balance right now; showing last verified balance.',
    };
  }
}

registerAtomicPointsTxHandler(commitAtomicPointsTransaction);
export const writeLocalPointsVault = saveLocalPointsVault;


