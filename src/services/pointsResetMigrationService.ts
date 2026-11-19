import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { getFirestoreDB } from './firestoreService';
import { readLocalPointsVault, writeLocalPointsVault } from './pointsLedgerService';

export const POINTS_RESET_MIGRATION_ID = 'points_reset_2026_11_v1';
const OWNER_EMAIL = 'romeelajutt23@gmail.com';

export interface PointsResetBackupRecord {
  uid: string;
  migrationId: string;
  backedUpAt: string;
  email: string | null;
  displayName: string | null;
  previousPoints: number;
  previousTodayPoints: number;
  previousTotalEarned: number;
  previousEligiblePoints: number;
  previousTotalEligiblePointsEarned: number;
  previousDailyRewardPoints: number;
  previousReferralPoints: number;
  previousApprovedBalanceUSD: number;
  previousStreakDays: number;
}

export interface PointsResetMigrationStatus {
  migrationId: string;
  status: 'not_started' | 'completed' | 'rolled_back';
  completedAt?: string;
  rolledBackAt?: string;
  executedBy?: string;
  usersBackedUp: number;
  usersReset: number;
}

function getLocalAppliedKey(uid: string): string {
  return `joyearn_points_reset_applied_${POINTS_RESET_MIGRATION_ID}_${uid || 'local'}`;
}

function getLocalBackupKey(uid: string): string {
  return `joyearn_points_backup_${POINTS_RESET_MIGRATION_ID}_${uid || 'local'}`;
}

/**
 * Performs a strictly ONE-TIME local cache reset for the current device/user
 * so stale cached balances cannot reappear after the controlled points reset.
 * - Backs up the pre-reset local snapshot before clearing current balance.
 * - Preserves all historical transactions (verifiedTxs, pendingTxs, conversionTxs,
 *   dailyRewardTxs, referralTxs), approvedBalanceUSD, and streakDays.
 * - Never runs a second time on subsequent logins, refreshes, midnight, or restarts.
 */
export function applyOneTimeLocalPointsResetIfNeeded(uid: string): {
  appliedNow: boolean;
  alreadyApplied: boolean;
  previousPoints: number;
} {
  if (typeof window === 'undefined') {
    return { appliedNow: false, alreadyApplied: false, previousPoints: 0 };
  }

  const safeUid = uid || 'local';
  const appliedKey = getLocalAppliedKey(safeUid);
  try {
    if (localStorage.getItem(appliedKey) === 'true') {
      return { appliedNow: false, alreadyApplied: true, previousPoints: 0 };
    }

    const vault = readLocalPointsVault(safeUid);
    const previousPoints = vault.points || 0;
    const nowIso = new Date().toISOString();

    // 1. Back up pre-reset local vault and legacy point keys
    const backupPayload = {
      migrationId: POINTS_RESET_MIGRATION_ID,
      uid: safeUid,
      backedUpAt: nowIso,
      vault,
      legacyPoints: localStorage.getItem('joyearn_points'),
      legacyUserPoints: localStorage.getItem(`joyearn_points_${safeUid}`),
      legacyTodayPoints: localStorage.getItem('joyearn_today_points'),
      legacyTotalEarned: localStorage.getItem('joyearn_total_earned'),
    };
    localStorage.setItem(getLocalBackupKey(safeUid), JSON.stringify(backupPayload));

    // 2. Zero current available points while preserving full historical transaction logs
    writeLocalPointsVault(safeUid, {
      ...vault,
      points: 0,
      todayPoints: 0,
      eligiblePoints: 0,
      totalEligiblePointsEarned: 0,
      dailyRewardPoints: 0,
      referralPoints: 0,
      pointsResetMigrationId: POINTS_RESET_MIGRATION_ID,
      pointsResetAt: nowIso,
      updatedAt: nowIso,
    });

    // 3. Clear legacy cached point keys so they cannot resurrect old balances
    localStorage.setItem('joyearn_points', '0');
    localStorage.setItem(`joyearn_points_${safeUid}`, '0');
    localStorage.setItem('joyearn_today_points', '0');
    localStorage.setItem(`joyearn_today_points_${safeUid}`, '0');

    // 4. Mark migration applied once permanently for this UID
    localStorage.setItem(appliedKey, 'true');

    return { appliedNow: true, alreadyApplied: false, previousPoints };
  } catch {
    return { appliedNow: false, alreadyApplied: false, previousPoints: 0 };
  }
}

/**
 * Restores a device's pre-reset local points snapshot from the one-time backup.
 */
export function rollbackLocalPointsReset(uid: string): { restored: boolean; restoredPoints: number } {
  if (typeof window === 'undefined') return { restored: false, restoredPoints: 0 };
  const safeUid = uid || 'local';
  try {
    const raw = localStorage.getItem(getLocalBackupKey(safeUid));
    if (!raw) return { restored: false, restoredPoints: 0 };
    const parsed = JSON.parse(raw);
    if (!parsed?.vault) return { restored: false, restoredPoints: 0 };
    writeLocalPointsVault(safeUid, parsed.vault);
    if (parsed.legacyPoints !== null && parsed.legacyPoints !== undefined) {
      localStorage.setItem('joyearn_points', String(parsed.legacyPoints));
    }
    if (parsed.legacyUserPoints !== null && parsed.legacyUserPoints !== undefined) {
      localStorage.setItem(`joyearn_points_${safeUid}`, String(parsed.legacyUserPoints));
    }
    return { restored: true, restoredPoints: parsed.vault.points || 0 };
  } catch {
    return { restored: false, restoredPoints: 0 };
  }
}

export async function getCloudPointsResetMigrationStatus(): Promise<PointsResetMigrationStatus> {
  const db = getFirestoreDB();
  if (!db) {
    return {
      migrationId: POINTS_RESET_MIGRATION_ID,
      status: 'not_started',
      usersBackedUp: 0,
      usersReset: 0,
    };
  }

  try {
    const snap = await getDoc(doc(db, 'config', 'points_reset_migration'));
    if (!snap.exists()) {
      return {
        migrationId: POINTS_RESET_MIGRATION_ID,
        status: 'not_started',
        usersBackedUp: 0,
        usersReset: 0,
      };
    }
    const d = snap.data();
    return {
      migrationId: String(d.migrationId || POINTS_RESET_MIGRATION_ID),
      status: (d.status as PointsResetMigrationStatus['status']) || 'not_started',
      completedAt: typeof d.completedAt === 'string' ? d.completedAt : undefined,
      rolledBackAt: typeof d.rolledBackAt === 'string' ? d.rolledBackAt : undefined,
      executedBy: typeof d.executedBy === 'string' ? d.executedBy : undefined,
      usersBackedUp: typeof d.usersBackedUp === 'number' ? d.usersBackedUp : 0,
      usersReset: typeof d.usersReset === 'number' ? d.usersReset : 0,
    };
  } catch {
    return {
      migrationId: POINTS_RESET_MIGRATION_ID,
      status: 'not_started',
      usersBackedUp: 0,
      usersReset: 0,
    };
  }
}

/**
 * Controlled ONE-TIME Firestore database migration (Owner-only: romeelajutt23@gmail.com).
 * 1. Verifies migration has not already completed.
 * 2. Backs up every user's pre-reset balances into /migration_backups/{migrationId}/users/{uid}.
 * 3. Sets current available points balance to 0 while preserving reward_ledger, referrals,
 *    withdrawals, and user profile records.
 * 4. Writes an immutable reconciliation log per user and marks /config/points_reset_migration complete.
 */
export async function executeOwnerPointsResetMigration(ownerEmail: string | null | undefined): Promise<{
  ok: boolean;
  alreadyCompleted?: boolean;
  usersBackedUp: number;
  usersReset: number;
  error?: string;
}> {
  if (!ownerEmail || ownerEmail.trim().toLowerCase() !== OWNER_EMAIL) {
    return { ok: false, usersBackedUp: 0, usersReset: 0, error: 'Only verified owner romeelajutt23@gmail.com may run this migration.' };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { ok: false, usersBackedUp: 0, usersReset: 0, error: 'Firestore is not initialized.' };
  }

  const currentStatus = await getCloudPointsResetMigrationStatus();
  if (currentStatus.status === 'completed' && currentStatus.migrationId === POINTS_RESET_MIGRATION_ID) {
    return {
      ok: true,
      alreadyCompleted: true,
      usersBackedUp: currentStatus.usersBackedUp,
      usersReset: currentStatus.usersReset,
    };
  }

  const nowIso = new Date().toISOString();
  let usersBackedUp = 0;
  let usersReset = 0;

  try {
    const usersSnap = await getDocs(collection(db, 'users'));

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const data = userDoc.data();

      // Skip if this specific user was already migrated in an interrupted run
      if (data.pointsResetMigrationId === POINTS_RESET_MIGRATION_ID) {
        continue;
      }

      const backupRecord: PointsResetBackupRecord = {
        uid,
        migrationId: POINTS_RESET_MIGRATION_ID,
        backedUpAt: nowIso,
        email: typeof data.email === 'string' ? data.email : null,
        displayName: typeof data.displayName === 'string' ? data.displayName : null,
        previousPoints: typeof data.points === 'number' ? data.points : 0,
        previousTodayPoints: typeof data.todayPoints === 'number' ? data.todayPoints : 0,
        previousTotalEarned: typeof data.totalEarned === 'number' ? data.totalEarned : 0,
        previousEligiblePoints: typeof data.eligiblePoints === 'number' ? data.eligiblePoints : 0,
        previousTotalEligiblePointsEarned:
          typeof data.totalEligiblePointsEarned === 'number' ? data.totalEligiblePointsEarned : 0,
        previousDailyRewardPoints: typeof data.dailyRewardPoints === 'number' ? data.dailyRewardPoints : 0,
        previousReferralPoints: typeof data.referralPoints === 'number' ? data.referralPoints : 0,
        previousApprovedBalanceUSD: typeof data.approvedBalanceUSD === 'number' ? data.approvedBalanceUSD : 0,
        previousStreakDays: typeof data.streakDays === 'number' ? data.streakDays : 0,
      };

      // Step 1: Persist immutable backup BEFORE modifying user balance
      await setDoc(
        doc(db, 'migration_backups', POINTS_RESET_MIGRATION_ID, 'users', uid),
        backupRecord
      );
      usersBackedUp++;

      // Step 2: Reset current available points to 0 (preserving profile, ledger, referrals, withdrawals)
      await updateDoc(doc(db, 'users', uid), {
        points: 0,
        todayPoints: 0,
        eligiblePoints: 0,
        totalEligiblePointsEarned: 0,
        dailyRewardPoints: 0,
        referralPoints: 0,
        pointsResetMigrationId: POINTS_RESET_MIGRATION_ID,
        pointsResetAt: nowIso,
        updatedAt: nowIso,
        serverUpdatedAt: serverTimestamp(),
      });
      usersReset++;

      // Step 3: Record immutable audit log entry
      await setDoc(doc(db, 'users', uid, 'reconciliation_logs', `reset_${POINTS_RESET_MIGRATION_ID}`), {
        logId: `reset_${POINTS_RESET_MIGRATION_ID}`,
        uid,
        migrationId: POINTS_RESET_MIGRATION_ID,
        action: 'controlled_one_time_points_reset',
        previousPoints: backupRecord.previousPoints,
        newPoints: 0,
        executedBy: OWNER_EMAIL,
        createdAt: nowIso,
      });
    }

    await setDoc(doc(db, 'config', 'points_reset_migration'), {
      migrationId: POINTS_RESET_MIGRATION_ID,
      status: 'completed',
      completedAt: nowIso,
      executedBy: OWNER_EMAIL,
      usersBackedUp,
      usersReset,
      updatedAt: nowIso,
    });

    return { ok: true, usersBackedUp, usersReset };
  } catch (err: any) {
    return {
      ok: false,
      usersBackedUp,
      usersReset,
      error: err?.message || 'Migration failed before completion.',
    };
  }
}

/**
 * Rollback plan implementation (Owner-only: romeelajutt23@gmail.com).
 * Restores all backed-up user balances from /migration_backups/{migrationId}/users/*.
 */
export async function rollbackOwnerPointsResetMigration(ownerEmail: string | null | undefined): Promise<{
  ok: boolean;
  usersRestored: number;
  error?: string;
}> {
  if (!ownerEmail || ownerEmail.trim().toLowerCase() !== OWNER_EMAIL) {
    return { ok: false, usersRestored: 0, error: 'Only verified owner romeelajutt23@gmail.com may roll back this migration.' };
  }

  const db = getFirestoreDB();
  if (!db) {
    return { ok: false, usersRestored: 0, error: 'Firestore is not initialized.' };
  }

  const nowIso = new Date().toISOString();
  let usersRestored = 0;

  try {
    const backupsSnap = await getDocs(
      collection(db, 'migration_backups', POINTS_RESET_MIGRATION_ID, 'users')
    );

    for (const backupDoc of backupsSnap.docs) {
      const b = backupDoc.data() as PointsResetBackupRecord;
      await updateDoc(doc(db, 'users', b.uid), {
        points: b.previousPoints,
        todayPoints: b.previousTodayPoints,
        totalEarned: b.previousTotalEarned,
        eligiblePoints: b.previousEligiblePoints,
        totalEligiblePointsEarned: b.previousTotalEligiblePointsEarned,
        dailyRewardPoints: b.previousDailyRewardPoints,
        referralPoints: b.previousReferralPoints,
        pointsResetMigrationId: null,
        pointsResetAt: null,
        updatedAt: nowIso,
        serverUpdatedAt: serverTimestamp(),
      });
      usersRestored++;
    }

    await setDoc(
      doc(db, 'config', 'points_reset_migration'),
      {
        migrationId: POINTS_RESET_MIGRATION_ID,
        status: 'rolled_back',
        rolledBackAt: nowIso,
        executedBy: OWNER_EMAIL,
        usersRestored,
        updatedAt: nowIso,
      },
      { merge: true }
    );

    return { ok: true, usersRestored };
  } catch (err: any) {
    return {
      ok: false,
      usersRestored,
      error: err?.message || 'Rollback failed.',
    };
  }
}
