import {
  OWNER_PERCENT,
  USERS_PERCENT,
  RESERVE_PERCENT,
  MAX_POINT_VALUE_USD,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
} from '../config/paymentConfig';
import { WithdrawalRequest, MonthlyPoolRecord, AppUser } from '../types';
import { getFirestoreDB, isQuotaOrResourceExhausted, notifyServerBusy } from './firestoreService';
import { doc, getDoc, setDoc, collection, getDocs, runTransaction, writeBatch } from 'firebase/firestore';

const MONTHLY_POOL_STORAGE_PREFIX = 'joyearn_monthly_pool_';

/**
 * Calculates payout transfer fee deducted from the user's payout (never from owner share).
 */
export function calculatePayoutFee(grossAmountUsd: number): {
  gross: number;
  feePercent: number;
  feeAmount: number;
  netAmount: number;
} {
  const gross = +(Math.max(0, grossAmountUsd)).toFixed(2);
  const feePercent = PAYOUT_FEE_PERCENT; // 2%
  const feeAmount = +((gross * feePercent) / 100).toFixed(2);
  const netAmount = +(gross - feeAmount).toFixed(2);

  return {
    gross,
    feePercent,
    feeAmount,
    netAmount,
  };
}

/**
 * Creates a default, blank MonthlyPoolRecord for any given month.
 */
export function createDefaultMonthlyPoolRecord(monthKey: string): MonthlyPoolRecord {
  return {
    month: monthKey,
    fundsReceived: 0,
    fundsReceivedMarked: false,
    fundsReceivedAt: undefined,
    isPublished: false,
    publishedAt: undefined,
    ownerShare: 0,
    usersPool: 0,
    reserve: 0,
    distributablePool: 0,
    carriedOver: 0,
    totalAvailablePool: 0,
    totalApprovedToUsers: 0,
    totalPaid: 0,
    totalPending: 0,
    remainingPool: 0,
    monthlyCosts: 0,
    profit: 0,
    totalQualifyingPoints: 0,
    creditedUserCount: 0,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Loads all monthly pool records from localStorage mirror and Firestore.
 */
export async function loadAllMonthlyPools(): Promise<Record<string, MonthlyPoolRecord>> {
  const result: Record<string, MonthlyPoolRecord> = {};

  // 1. LocalStorage reads
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(MONTHLY_POOL_STORAGE_PREFIX)) {
        const month = key.replace(MONTHLY_POOL_STORAGE_PREFIX, '');
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            result[month] = {
              ...createDefaultMonthlyPoolRecord(month),
              ...parsed,
            };
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('Error reading monthly pools from localStorage:', e);
  }

  // 2. Cloud Firestore read
  const db = getFirestoreDB();
  if (db) {
    try {
      const colRef = collection(db, 'monthly_pools');
      const snap = await getDocs(colRef);
      snap.forEach((d) => {
        const data = d.data();
        result[d.id] = {
          ...createDefaultMonthlyPoolRecord(d.id),
          ...data,
          month: d.id,
        } as MonthlyPoolRecord;
        try {
          localStorage.setItem(`${MONTHLY_POOL_STORAGE_PREFIX}${d.id}`, JSON.stringify(result[d.id]));
        } catch {}
      });
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error loading monthly pools from Firestore, using local mirror:', err);
    }
  }

  // Seed current month if not present
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (!result[currentMonth]) {
    result[currentMonth] = createDefaultMonthlyPoolRecord(currentMonth);
  }

  return result;
}

/**
 * Backward compatibility alias for loading revenue records
 */
export async function loadAllMonthlyRevenues(): Promise<Record<string, number>> {
  const pools = await loadAllMonthlyPools();
  const revs: Record<string, number> = {};
  for (const [m, p] of Object.entries(pools)) {
    revs[m] = p.fundsReceived;
  }
  return revs;
}

/**
 * Saves Funds Received for a month and updates pool figures.
 */
export async function saveMonthlyFundsReceived(
  monthKey: string,
  fundsReceived: number,
  isMarked: boolean,
  adminEmail?: string
): Promise<MonthlyPoolRecord> {
  const cleanFunds = Math.max(0, +fundsReceived.toFixed(2));
  const ownerShare = cleanFunds;
  const usersPool = cleanFunds;
  const reserve = 0;
  const distributablePool = cleanFunds;

  const existingPools = await loadAllMonthlyPools();
  const current = existingPools[monthKey] || createDefaultMonthlyPoolRecord(monthKey);

  const updatedRecord: MonthlyPoolRecord = {
    ...current,
    month: monthKey,
    fundsReceived: cleanFunds,
    fundsReceivedMarked: isMarked,
    fundsReceivedAt: isMarked ? (current.fundsReceivedAt || new Date().toISOString()) : undefined,
    ownerShare,
    usersPool,
    reserve,
    distributablePool,
    profit: +(ownerShare - (current.monthlyCosts || 0)).toFixed(2),
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'admin',
  };

  // Local storage mirror
  try {
    localStorage.setItem(`${MONTHLY_POOL_STORAGE_PREFIX}${monthKey}`, JSON.stringify(updatedRecord));
  } catch {}

  // Firestore update
  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'monthly_pools', monthKey);
      await setDoc(docRef, updatedRecord, { merge: true });
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error saving monthly funds received to Firestore:', err);
    }
  }

  return updatedRecord;
}

/**
 * Saves monthly operational costs entered by the owner.
 */
export async function saveMonthlyCosts(
  monthKey: string,
  costs: number,
  adminEmail?: string
): Promise<MonthlyPoolRecord> {
  const cleanCosts = Math.max(0, +costs.toFixed(2));
  const existingPools = await loadAllMonthlyPools();
  const current = existingPools[monthKey] || createDefaultMonthlyPoolRecord(monthKey);

  const updatedRecord: MonthlyPoolRecord = {
    ...current,
    monthlyCosts: cleanCosts,
    profit: +((current.ownerShare || 0) - cleanCosts).toFixed(2),
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'admin',
  };

  try {
    localStorage.setItem(`${MONTHLY_POOL_STORAGE_PREFIX}${monthKey}`, JSON.stringify(updatedRecord));
  } catch {}

  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'monthly_pools', monthKey);
      await setDoc(docRef, updatedRecord, { merge: true });
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error saving monthly costs to Firestore:', err);
    }
  }

  return updatedRecord;
}

/**
 * Legacy compatibility alias for saveMonthlyNetRevenue
 */
export async function saveMonthlyNetRevenue(
  monthKey: string,
  netRevenue: number,
  adminEmail?: string
): Promise<void> {
  await saveMonthlyFundsReceived(monthKey, netRevenue, true, adminEmail);
}

/**
 * Computes pool summary for a specific month with carry-overs, reserve, and safety check.
 */
export function computeMonthlyPoolMetrics(
  targetMonth: string,
  allWithdrawals: WithdrawalRequest[],
  allPoolRecords: Record<string, MonthlyPoolRecord> | Record<string, number>,
  totalApprovedBalancesAcrossUsers: number = 0
): MonthlyPoolRecord & { safetyWarning: boolean; safetyWarningMessage?: string } {
  // Normalize pool records
  const normalizedPools: Record<string, MonthlyPoolRecord> = {};
  for (const [m, val] of Object.entries(allPoolRecords)) {
    if (typeof val === 'number') {
      const def = createDefaultMonthlyPoolRecord(m);
      def.fundsReceived = val;
      def.ownerShare = val;
      def.usersPool = val;
      def.reserve = 0;
      def.distributablePool = val;
      def.profit = def.ownerShare;
      normalizedPools[m] = def;
    } else {
      normalizedPools[m] = { ...val };
    }
  }

  // Chronologically sort all known months
  const months = Array.from(
    new Set([
      ...Object.keys(normalizedPools),
      ...allWithdrawals.map((w) => (w.createdAt ? w.createdAt.slice(0, 7) : '')).filter(Boolean),
      targetMonth,
    ])
  ).sort();

  let runningCarriedOver = 0;
  const computedMap: Record<string, MonthlyPoolRecord> = {};

  for (const m of months) {
    const record = normalizedPools[m] || createDefaultMonthlyPoolRecord(m);
    const fundsReceived = record.fundsReceived || 0;
    const ownerShare = fundsReceived;
    const usersPool = fundsReceived;
    const reserve = 0;
    const distributablePool = fundsReceived;

    const carriedOver = POOL_CARRY_OVER ? runningCarriedOver : 0;
    // Only published months contribute distributable funds to the active available pool
    const totalAvailablePool = record.isPublished
      ? +(carriedOver + distributablePool).toFixed(2)
      : carriedOver;

    const monthWithdrawals = allWithdrawals.filter((w) => {
      const wMonth = w.createdAt ? w.createdAt.slice(0, 7) : '';
      return wMonth === m;
    });

    const totalPaid = +monthWithdrawals
      .filter((w) => w.status === 'Paid')
      .reduce((sum, w) => sum + (w.cashAmount || 0), 0)
      .toFixed(2);

    const totalPending = +monthWithdrawals
      .filter((w) => ['Submitted', 'Under review', 'Verified', 'Pending'].includes(w.status))
      .reduce((sum, w) => sum + (w.cashAmount || 0), 0)
      .toFixed(2);

    const remainingPool = Math.max(0, +(totalAvailablePool - totalPaid).toFixed(2));
    const monthlyCosts = record.monthlyCosts || 0;
    const profit = +(ownerShare - monthlyCosts).toFixed(2);

    computedMap[m] = {
      ...record,
      ownerShare,
      usersPool,
      reserve,
      distributablePool,
      carriedOver,
      totalAvailablePool,
      totalPaid,
      totalPending,
      remainingPool,
      monthlyCosts,
      profit,
      updatedAt: record.updatedAt || new Date().toISOString(),
    };

    if (POOL_CARRY_OVER) {
      runningCarriedOver = remainingPool;
    }
  }

  const targetResult = computedMap[targetMonth] || createDefaultMonthlyPoolRecord(targetMonth);

  // RED SAFETY WARNING CHECK:
  // If (pending requests + approved balances across users) > remaining published pool balance
  const liability = +(targetResult.totalPending + totalApprovedBalancesAcrossUsers).toFixed(2);
  const safetyWarning = liability > targetResult.remainingPool && targetResult.isPublished;
  let safetyWarningMessage: string | undefined = undefined;

  if (safetyWarning) {
    safetyWarningMessage = `⚠️ RED SAFETY ALERT: Total approved balances and pending payout requests ($${liability.toFixed(2)} USD) exceed the remaining published pool balance ($${targetResult.remainingPool.toFixed(2)} USD). Do not approve payouts until more funds are received!`;
  }

  return {
    ...targetResult,
    safetyWarning,
    safetyWarningMessage,
  };
}

/**
 * Validates whether marking a request as Paid is permitted by the published available pool.
 * Payouts are paid strictly from received and published money, never exceeding remaining pool.
 */
export function validatePayoutFromPool(
  request: WithdrawalRequest,
  allWithdrawals: WithdrawalRequest[],
  allPoolRecords: Record<string, MonthlyPoolRecord> | Record<string, number>
): {
  allowed: boolean;
  requestAmount: number;
  remainingPool: number;
  errorMessage?: string;
} {
  const reqMonth = request.createdAt ? request.createdAt.slice(0, 7) : new Date().toISOString().slice(0, 7);
  const metrics = computeMonthlyPoolMetrics(reqMonth, allWithdrawals, allPoolRecords);
  const requestAmount = +(request.cashAmount || 0).toFixed(2);

  if (request.status === 'Paid') {
    return {
      allowed: true,
      requestAmount,
      remainingPool: metrics.remainingPool,
    };
  }

  if (metrics.remainingPool - requestAmount < 0) {
    return {
      allowed: false,
      requestAmount,
      remainingPool: metrics.remainingPool,
      errorMessage: `Refused: Marking this $${requestAmount.toFixed(2)} USD payout as Paid would exceed the remaining published users' pool balance ($${metrics.remainingPool.toFixed(2)} USD). Payouts can only be made from funds actually received and published. Owner can never pay out more than actually received.`,
    };
  }

  return {
    allowed: true,
    requestAmount,
    remainingPool: metrics.remainingPool,
  };
}

/**
 * PUBLISH MONTH & DISTRIBUTE SHARES TO USERS
 * 
 * Rules:
 * 1. Month can be published ONLY after funds received is entered and marked as received.
 * 2. Distributable pool = usersPool * (1 - RESERVE_PERCENT / 100).
 * 3. User's share = (qualifyingPoints / totalQualifyingPoints) * distributablePool.
 * 4. Capped at MAX_POINT_VALUE_USD (0.002) * qualifyingPoints.
 * 5. Credited to approvedBalanceUSD once and NEVER twice.
 */
export async function publishMonthAndCreditShares(
  monthKey: string,
  adminEmail?: string
): Promise<{
  success: boolean;
  message: string;
  creditedUsers: number;
  totalDistributedUSD: number;
}> {
  const allPools = await loadAllMonthlyPools();
  const monthRecord = allPools[monthKey];

  if (!monthRecord) {
    return {
      success: false,
      message: `Month record ${monthKey} not found. Please enter funds received first.`,
      creditedUsers: 0,
      totalDistributedUSD: 0,
    };
  }

  if (!monthRecord.fundsReceivedMarked || monthRecord.fundsReceived <= 0) {
    return {
      success: false,
      message: `Month ${monthKey} cannot be published: Real funds received must be entered and verified by clicking 'Mark funds received'.`,
      creditedUsers: 0,
      totalDistributedUSD: 0,
    };
  }

  if (monthRecord.isPublished) {
    return {
      success: false,
      message: `Month ${monthKey} has already been published on ${monthRecord.publishedAt || 'record'}. Credits cannot be awarded twice!`,
      creditedUsers: monthRecord.creditedUserCount || 0,
      totalDistributedUSD: monthRecord.totalApprovedToUsers || 0,
    };
  }

  // Calculate distributable pool
  const usersPool = +((monthRecord.fundsReceived * USERS_PERCENT) / 100).toFixed(2);
  const reserve = +((usersPool * RESERVE_PERCENT) / 100).toFixed(2);
  const distributablePool = +(usersPool - reserve).toFixed(2);

  if (distributablePool <= 0) {
    return {
      success: false,
      message: `Distributable users' pool is $0.00. No funds available to distribute.`,
      creditedUsers: 0,
      totalDistributedUSD: 0,
    };
  }

  // Gather users to distribute to
  const eligibleUsers: Array<{
    uid: string;
    points: number;
    email?: string | null;
    approvedBalanceUSD: number;
    publishedMonthsCredited: string[];
  }> = [];

  const db = getFirestoreDB();

  if (db) {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach((uDoc) => {
        const uData = uDoc.data();
        if (uData.isExcludedFromPool) return; // Excluded users skipped

        const creditedMonths: string[] = Array.isArray(uData.publishedMonthsCredited)
          ? uData.publishedMonthsCredited
          : [];

        // Check if already credited for this month
        if (creditedMonths.includes(monthKey)) return;

        const pts = uData.qualifyingPoints || uData.points || 0;
        if (pts > 0) {
          eligibleUsers.push({
            uid: uDoc.id,
            points: pts,
            email: uData.email,
            approvedBalanceUSD: typeof uData.approvedBalanceUSD === 'number' ? uData.approvedBalanceUSD : 0,
            publishedMonthsCredited: creditedMonths,
          });
        }
      });
    } catch (err) {
      console.warn('Error reading users from Firestore during pool publish:', err);
    }
  }

  // Fallback: If no users in Firestore (e.g. test guest accounts in localStorage)
  if (eligibleUsers.length === 0) {
    try {
      const localProfileRaw = localStorage.getItem('joyearn_cached_profile');
      if (localProfileRaw) {
        const localUser = JSON.parse(localProfileRaw);
        const creditedMonths: string[] = Array.isArray(localUser.publishedMonthsCredited)
          ? localUser.publishedMonthsCredited
          : [];
        if (!creditedMonths.includes(monthKey)) {
          const pts = parseInt(localStorage.getItem('joyearn_lifetime_points') || '4500', 10);
          if (pts > 0) {
            eligibleUsers.push({
              uid: localUser.uid || 'test_user_guest',
              points: pts,
              email: localUser.email,
              approvedBalanceUSD: localUser.approvedBalanceUSD || 0,
              publishedMonthsCredited: creditedMonths,
            });
          }
        }
      }
    } catch {}
  }

  if (eligibleUsers.length === 0) {
    return {
      success: false,
      message: `No qualifying users with positive points found for month ${monthKey}.`,
      creditedUsers: 0,
      totalDistributedUSD: 0,
    };
  }

  const totalQualifyingPoints = eligibleUsers.reduce((sum, u) => sum + u.points, 0);
  let totalDistributedUSD = 0;
  let creditedCount = 0;

  // Credit each user once
  for (const user of eligibleUsers) {
    // Formula: (user's qualifying points / total qualifying points) * distributablePool
    const rawShare = (user.points / totalQualifyingPoints) * distributablePool;
    // Cap at MAX_POINT_VALUE_USD (0.002) * qualifying points
    const maxAllowed = +(user.points * MAX_POINT_VALUE_USD).toFixed(2);
    const finalCredit = Math.min(rawShare, maxAllowed);
    const cleanCredit = +(Math.max(0, finalCredit)).toFixed(2);

    if (cleanCredit > 0) {
      const newApprovedBalance = +(user.approvedBalanceUSD + cleanCredit).toFixed(2);
      const updatedMonths = [...user.publishedMonthsCredited, monthKey];

      // Update in Firestore
      if (db) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(
            userRef,
            {
              approvedBalanceUSD: newApprovedBalance,
              publishedMonthsCredited: updatedMonths,
              statusUpdatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (err) {
          console.warn(`Error crediting user ${user.uid}:`, err);
        }
      }

      // Update local storage mirror for current user
      try {
        const localProfileRaw = localStorage.getItem('joyearn_cached_profile');
        if (localProfileRaw) {
          const localUser = JSON.parse(localProfileRaw);
          if (localUser.uid === user.uid || user.uid === 'test_user_guest') {
            localUser.approvedBalanceUSD = newApprovedBalance;
            localUser.publishedMonthsCredited = updatedMonths;
            localStorage.setItem('joyearn_cached_profile', JSON.stringify(localUser));
          }
        }
        localStorage.setItem('joyearn_approved_balance_usd', String(newApprovedBalance));
      } catch {}

      totalDistributedUSD = +(totalDistributedUSD + cleanCredit).toFixed(2);
      creditedCount++;
    }
  }

  // Mark month as published
  const publishedRecord: MonthlyPoolRecord = {
    ...monthRecord,
    isPublished: true,
    publishedAt: new Date().toISOString(),
    totalApprovedToUsers: totalDistributedUSD,
    totalQualifyingPoints,
    creditedUserCount: creditedCount,
    updatedAt: new Date().toISOString(),
    updatedBy: adminEmail || 'admin',
  };

  try {
    localStorage.setItem(`${MONTHLY_POOL_STORAGE_PREFIX}${monthKey}`, JSON.stringify(publishedRecord));
  } catch {}

  if (db) {
    try {
      const docRef = doc(db, 'monthly_pools', monthKey);
      await setDoc(docRef, publishedRecord, { merge: true });
    } catch (err) {
      console.warn('Error saving published month to Firestore:', err);
    }
  }

  return {
    success: true,
    message: `✓ Month ${monthKey} published successfully! Credited $${totalDistributedUSD.toFixed(2)} USD across ${creditedCount} qualifying users. Shares are capped at $${MAX_POINT_VALUE_USD} per point.`,
    creditedUsers: creditedCount,
    totalDistributedUSD,
  };
}
