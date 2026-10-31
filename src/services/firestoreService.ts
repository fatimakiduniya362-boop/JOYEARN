/**
 * Firebase Firestore Service for JoyEarn
 * Handles cloud persistence for points, streaks, and withdrawal history
 * with automatic fallback to local device storage, 1-hour/10-min cache limits,
 * daily write quota protections, and batched writes.
 */

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  runTransaction,
  writeBatch,
  DocumentSnapshot,
  Firestore
} from 'firebase/firestore';
import { getApps, initializeApp, getApp } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { WithdrawalRequest, WithdrawalStatus } from '../types';
import {
  MIN_WITHDRAW_USD,
  MAX_WITHDRAW_USD_PER_REQUEST,
  MAX_WITHDRAWALS_PER_MONTH,
  MIN_ACCOUNT_AGE_DAYS,
  MIN_ACTIVE_DAYS_TO_WITHDRAW,
  PAYOUT_REVIEW_TEXT,
  POINTS_PER_DOLLAR,
  WELCOME_BONUS_POINTS,
  MIN_WITHDRAWAL_POINTS,
  MAX_WITHDRAWAL_POINTS,
  DAILY_MAX_POINTS,
  OWNER_PERCENT,
  USERS_PERCENT,
  RESERVE_PERCENT,
  MAX_POINT_VALUE_USD,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
  MANDATORY_REWARDS_NOTICE,
  POOL_REVENUE_NOTICE,
} from '../config/paymentConfig';

export {
  MIN_WITHDRAW_USD,
  MAX_WITHDRAW_USD_PER_REQUEST,
  MAX_WITHDRAWALS_PER_MONTH,
  MIN_ACCOUNT_AGE_DAYS,
  MIN_ACTIVE_DAYS_TO_WITHDRAW,
  PAYOUT_REVIEW_TEXT,
  POINTS_PER_DOLLAR,
  WELCOME_BONUS_POINTS,
  MIN_WITHDRAWAL_POINTS,
  MAX_WITHDRAWAL_POINTS,
  DAILY_MAX_POINTS,
  OWNER_PERCENT,
  USERS_PERCENT,
  RESERVE_PERCENT,
  MAX_POINT_VALUE_USD,
  PAYOUT_FEE_PERCENT,
  POOL_CARRY_OVER,
  MANDATORY_REWARDS_NOTICE,
  POOL_REVENUE_NOTICE,
};


// ============================================================================
// ⚙️ EDITABLE CONSTANTS (FREE PLAN & CACHING LIMITS)
// ============================================================================
export const MAX_WRITES_PER_USER_PER_DAY = 40; // Max allowed Firestore writes per user per day

// Cache Time-To-Live (TTL) limits (No onSnapshot, strictly one-time reads + cache)
export const SPONSOR_ADS_CACHE_TTL = 60 * 60 * 1000; // 1 hour for sponsor ads
export const POOL_CONFIG_CACHE_TTL = 60 * 60 * 1000; // 1 hour for monthly pool and config
export const LEADERBOARD_CACHE_TTL = 60 * 60 * 1000; // 1 hour for leaderboard / top lists
export const USER_WALLET_CACHE_TTL = 10 * 60 * 1000; // 10 minutes for user's own wallet
export const USER_TASKS_CACHE_TTL = 10 * 60 * 1000;  // 10 minutes for user's completed tasks

let firestoreInstance: Firestore | null = null;

export function getFirestoreDB(): Firestore | null {
  if (firestoreInstance) return firestoreInstance;
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.warn('Firestore initialization warning (using local fallback):', err);
    return null;
  }
}

/**
 * Notifies the UI and user when Firestore encounters rate limits or quota exhaustion.
 */
export function notifyServerBusy() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('joyearn_server_busy', {
        detail: {
          message: 'The server is busy right now. Your progress is saved on your device and will sync later.',
        },
      })
    );
  }
}

/**
 * Helper to check if a Firestore error is related to quota or resource exhaustion
 */
export function isQuotaOrResourceExhausted(err: any): boolean {
  if (!err) return false;
  const code = String(err.code || '');
  const msg = String(err.message || '').toLowerCase();
  return (
    code === 'resource-exhausted' ||
    code === '8' ||
    err.status === 429 ||
    msg.includes('resource-exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    msg.includes('exceeded')
  );
}

/**
 * Tracks daily Firestore write quota per user to remain strictly on free tier
 */
export function getDailyWriteCount(userId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const key = `joyearn_writes_${userId || 'guest'}_${today}`;
  try {
    return parseInt(localStorage.getItem(key) || '0', 10);
  } catch {
    return 0;
  }
}

export function incrementDailyWriteCount(userId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const key = `joyearn_writes_${userId || 'guest'}_${today}`;
  try {
    const current = parseInt(localStorage.getItem(key) || '0', 10);
    const next = current + 1;
    localStorage.setItem(key, String(next));
    return next;
  } catch {
    return 1;
  }
}

export function canPerformFirestoreWrite(userId: string): boolean {
  return getDailyWriteCount(userId) < MAX_WRITES_PER_USER_PER_DAY;
}

/**
 * Local offline queue for pending writes when offline or quota is temporarily exhausted
 */
export function queueWriteLocally(action: { type: string; payload: any; timestamp: number }): void {
  try {
    const queue = JSON.parse(localStorage.getItem('joyearn_pending_write_queue') || '[]');
    queue.push(action);
    localStorage.setItem('joyearn_pending_write_queue', JSON.stringify(queue));
  } catch {}
}

export interface UserCloudData {
  uid: string;
  email: string | null;
  displayName: string | null;
  points: number;
  streakDays: number;
  todayPoints: number;
  lastActiveDate: string;
  updatedAt: string;
  welcomeBonusClaimed?: boolean;
  welcomeBonusClaimedAt?: string;
}

/**
 * Checks Firestore/local mirror if +50 welcome bonus has already been claimed for this Google account
 */
export async function checkWelcomeBonusClaimed(uid: string): Promise<boolean> {
  if (!uid) return false;

  // 1. Check local mirror
  try {
    const local = localStorage.getItem(`joyearn_auth_bonus_${uid}`);
    if (local === 'true') return true;
  } catch {}

  // 2. One-time check in Firestore user doc
  const db = getFirestoreDB();
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data?.welcomeBonusClaimed === true) {
          localStorage.setItem(`joyearn_auth_bonus_${uid}`, 'true');
          return true;
        }
      }

      const bonusRef = doc(db, 'welcome_bonuses', uid);
      const bonusSnap = await getDoc(bonusRef);
      if (bonusSnap.exists()) {
        localStorage.setItem(`joyearn_auth_bonus_${uid}`, 'true');
        return true;
      }
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
      }
      console.warn('Error checking welcome bonus in Firestore, using local state:', err);
    }
  }

  return false;
}

/**
 * Atomically marks +50 welcome bonus as claimed in Firestore for this Google account
 */
export async function claimWelcomeBonusInFirestore(
  uid: string,
  email: string | null,
  displayName: string | null
): Promise<{ success: boolean; alreadyClaimed: boolean }> {
  if (!uid) return { success: false, alreadyClaimed: false };

  const alreadyClaimed = await checkWelcomeBonusClaimed(uid);
  if (alreadyClaimed) {
    return { success: false, alreadyClaimed: true };
  }

  try {
    localStorage.setItem(`joyearn_auth_bonus_${uid}`, 'true');
  } catch {}

  if (!canPerformFirestoreWrite(uid)) {
    queueWriteLocally({ type: 'claimWelcomeBonus', payload: { uid, email, displayName }, timestamp: Date.now() });
    return { success: true, alreadyClaimed: false };
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const now = new Date().toISOString();
      const batch = writeBatch(db);

      const userRef = doc(db, 'users', uid);
      batch.set(
        userRef,
        {
          uid,
          email,
          displayName,
          welcomeBonusClaimed: true,
          welcomeBonusClaimedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      const bonusRef = doc(db, 'welcome_bonuses', uid);
      batch.set(bonusRef, {
        uid,
        email,
        displayName,
        claimedAt: now,
        bonusAmount: 50,
      });

      await batch.commit();
      incrementDailyWriteCount(uid);
      return { success: true, alreadyClaimed: false };
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
        queueWriteLocally({ type: 'claimWelcomeBonus', payload: { uid, email, displayName }, timestamp: Date.now() });
      }
      console.warn('Firestore welcome bonus sync notice, saved locally:', err);
      return { success: true, alreadyClaimed: false };
    }
  }

  return { success: true, alreadyClaimed: false };
}

/**
 * Saves user points and streak to Firestore in a single batched/atomic write
 */
export async function syncUserDataToCloud(
  uid: string,
  data: Partial<UserCloudData>
): Promise<boolean> {
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(`joyearn_cloud_user_${uid}`, JSON.stringify(payload));
  } catch {}

  if (!uid) return false;

  if (!canPerformFirestoreWrite(uid)) {
    queueWriteLocally({ type: 'syncUserData', payload: { uid, data: payload }, timestamp: Date.now() });
    return true;
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, payload, { merge: true });
      incrementDailyWriteCount(uid);
      return true;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
        queueWriteLocally({ type: 'syncUserData', payload: { uid, data: payload }, timestamp: Date.now() });
      }
      console.warn('Could not sync to cloud Firestore, local storage active:', err);
      return false;
    }
  }
  return false;
}

/**
 * Loads user points and streak from Firestore with 10-minute cache TTL
 */
export async function loadUserDataFromCloud(uid: string, forceRefresh = false): Promise<UserCloudData | null> {
  if (!uid) return null;

  const cacheKey = `joyearn_cloud_user_${uid}`;
  const timeKey = `joyearn_cloud_user_time_${uid}`;
  const now = Date.now();

  if (!forceRefresh) {
    try {
      const lastTime = parseInt(localStorage.getItem(timeKey) || '0', 10);
      if (now - lastTime < USER_WALLET_CACHE_TTL) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch {}
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const cloudData = snap.data() as UserCloudData;
        localStorage.setItem(cacheKey, JSON.stringify(cloudData));
        localStorage.setItem(timeKey, String(now));
        return cloudData;
      }
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
      }
      console.warn('Could not load from Firestore, falling back to local storage:', err);
    }
  }

  try {
    const saved = localStorage.getItem(cacheKey);
    if (saved) return JSON.parse(saved);
  } catch {}

  return null;
}

export function maskAccountDetails(method: string, account: string): string {
  if (!account) return '';
  const clean = account.trim();
  if (method === 'PayPal') {
    const parts = clean.split('@');
    if (parts.length === 2) {
      const name = parts[0];
      const domain = parts[1];
      const maskedName = name.length <= 2 ? name + '***' : name.slice(0, 2) + '***' + name.slice(-1);
      return `${maskedName}@${domain}`;
    }
    return clean.slice(0, 3) + '***';
  }
  if (method === 'Bank' || method === 'Bank transfer') {
    if (clean.length > 8) {
      return clean.slice(0, 4) + '****' + clean.slice(-4);
    }
    return clean;
  }
  // Easypaisa / JazzCash (11 digits: 03001234567)
  if (clean.length === 11) {
    return clean.slice(0, 4) + '****' + clean.slice(-3);
  }
  if (clean.length > 6) {
    return clean.slice(0, 3) + '****' + clean.slice(-3);
  }
  return clean;
}

/**
 * Creates a new withdrawal request in Firestore atomically:
 * 1. Blocks if user already has an existing active request (Submitted, Under review, Verified, Pending)
 * 2. Enforces MIN_WITHDRAW_USD ($100) and MAX_WITHDRAW_USD_PER_REQUEST ($500)
 * 3. Enforces MAX_WITHDRAWALS_PER_MONTH (2 requests per calendar month)
 * 4. Deducts points atomically in Firestore runTransaction
 */
export async function submitWithdrawalRequestToCloud(
  request: Omit<WithdrawalRequest, 'id' | 'createdAt'>
): Promise<WithdrawalRequest> {
  const userUid = request.userUid || 'device_user';
  const pointsToDeduct = request.points;
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const newId = 'wd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  // 1. Check if user already has an active request in progress
  const userExisting = await loadUserWithdrawals(userUid);
  const hasActive = userExisting.some((r) =>
    ['Submitted', 'Under review', 'Verified', 'Pending'].includes(r.status)
  );
  if (hasActive) {
    throw new Error('A withdrawal request is currently in progress. You may only have one active request at a time.');
  }

  // 2. Monthly withdrawal limit check (MAX_WITHDRAWALS_PER_MONTH = 2)
  const monthlyCount = userExisting.filter((r) =>
    r.createdAt && r.createdAt.slice(0, 7) === currentMonth && r.status !== 'Rejected'
  ).length;
  if (monthlyCount >= MAX_WITHDRAWALS_PER_MONTH) {
    throw new Error(`Monthly limit reached: Maximum ${MAX_WITHDRAWALS_PER_MONTH} withdrawal requests allowed per calendar month.`);
  }

  // 3. Strictly enforce MIN_WITHDRAW_USD ($100) and MAX_WITHDRAW_USD_PER_REQUEST ($500)
  const cashAmountUsd = +(request.cashAmount || (request.points ? request.points / 1000 : MIN_WITHDRAW_USD)).toFixed(2);
  if (cashAmountUsd < MIN_WITHDRAW_USD) {
    throw new Error(
      `Minimum withdrawal requirement is $${MIN_WITHDRAW_USD}.00 USD in approved balance.`
    );
  }
  if (cashAmountUsd > MAX_WITHDRAW_USD_PER_REQUEST) {
    throw new Error(
      `Maximum withdrawal per request is $${MAX_WITHDRAW_USD_PER_REQUEST}.00 USD.`
    );
  }

  const masked = maskAccountDetails(String(request.paymentMethod || ''), request.accountDetails || '');
  const nowIso = now.toISOString();
  const feePercent = PAYOUT_FEE_PERCENT; // 2%
  const feeAmount = +((cashAmountUsd * feePercent) / 100).toFixed(2);
  const netAmount = +(cashAmountUsd - feeAmount).toFixed(2);

  const fullRequest: WithdrawalRequest = {
    ...request,
    id: newId,
    createdAt: nowIso,
    status: 'Submitted',
    maskedAccount: masked,
    statusUpdatedAt: nowIso,
    cashAmount: cashAmountUsd,
    feePercent,
    feeAmount,
    netAmount,
    paidAmount: netAmount,
    timeline: [
      {
        status: 'Submitted',
        date: nowIso,
        note: `Withdrawal request submitted by user ($${cashAmountUsd.toFixed(2)} USD, 2% transfer fee $${feeAmount.toFixed(2)}, net receive $${netAmount.toFixed(2)})`,
      },
    ],
  };

  // 4. Atomic Firestore transaction: Deduct from approvedBalanceUSD
  const db = getFirestoreDB();
  if (db && userUid && userUid !== 'device_user') {
    if (canPerformFirestoreWrite(userUid)) {
      try {
        await runTransaction(db, async (transaction) => {
          const userDocRef = doc(db, 'users', userUid);
          const userDoc = await transaction.get(userDocRef);

          if (!userDoc.exists()) {
            throw new Error('User profile record not found in cloud.');
          }

          const currentApproved = userDoc.data()?.approvedBalanceUSD ?? 0;
          if (currentApproved < cashAmountUsd) {
            throw new Error(`Insufficient approved balance: You have $${currentApproved.toFixed(2)} USD approved, but requested $${cashAmountUsd.toFixed(2)} USD. Your share will be calculated when this month is published.`);
          }

          // Deduct from approvedBalanceUSD atomically
          transaction.update(userDocRef, {
            approvedBalanceUSD: +(currentApproved - cashAmountUsd).toFixed(2),
            updatedAt: nowIso,
          });

          // Create withdrawal doc
          const wdDocRef = doc(db, 'withdrawals', newId);
          transaction.set(wdDocRef, fullRequest);
        });
        incrementDailyWriteCount(userUid);
      } catch (err: any) {
        if (isQuotaOrResourceExhausted(err)) {
          notifyServerBusy();
          queueWriteLocally({ type: 'submitWithdrawal', payload: fullRequest, timestamp: Date.now() });
        }
        console.warn('Firestore transaction error:', err);
        if (err?.message?.includes('Insufficient') || err?.message?.includes('in progress') || err?.message?.includes('Monthly limit')) {
          throw err;
        }
      }
    } else {
      queueWriteLocally({ type: 'submitWithdrawal', payload: fullRequest, timestamp: Date.now() });
    }
  }

  // Deduct from local storage mirror as well
  try {
    const curLocal = parseFloat(localStorage.getItem('joyearn_approved_balance_usd') || '0');
    const nextApproved = Math.max(0, +(curLocal - cashAmountUsd).toFixed(2));
    localStorage.setItem('joyearn_approved_balance_usd', String(nextApproved));
    const cachedProfileRaw = localStorage.getItem('joyearn_cached_profile');
    if (cachedProfileRaw) {
      const p = JSON.parse(cachedProfileRaw);
      p.approvedBalanceUSD = nextApproved;
      localStorage.setItem('joyearn_cached_profile', JSON.stringify(p));
    }
  } catch {}

  // 5. Local storage save and cache invalidation
  try {
    const localRequests: WithdrawalRequest[] = JSON.parse(
      localStorage.getItem('joyearn_all_withdrawals') || '[]'
    );
    localRequests.unshift(fullRequest);
    localStorage.setItem('joyearn_all_withdrawals', JSON.stringify(localRequests));
    localStorage.setItem(`joyearn_withdrawals_time_${userUid}`, String(Date.now()));
  } catch (e) {
    console.warn('Local storage save error:', e);
  }

  return fullRequest;
}

/**
 * Loads all withdrawal requests for a user with 10-minute cache TTL
 */
export async function loadUserWithdrawals(userUid: string, forceRefresh = false): Promise<WithdrawalRequest[]> {
  const cacheKey = `joyearn_withdrawals_${userUid || 'guest'}`;
  const timeKey = `joyearn_withdrawals_time_${userUid || 'guest'}`;
  const now = Date.now();

  if (!forceRefresh) {
    try {
      const lastTime = parseInt(localStorage.getItem(timeKey) || '0', 10);
      if (now - lastTime < USER_WALLET_CACHE_TTL) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch {}
  }

  const db = getFirestoreDB();
  if (db && userUid && userUid !== 'device_user') {
    try {
      const colRef = collection(db, 'withdrawals');
      const q = query(colRef, where('userUid', '==', userUid));
      const querySnapshot = await getDocs(q);
      const list: WithdrawalRequest[] = [];
      querySnapshot.forEach((d) => {
        list.push(d.data() as WithdrawalRequest);
      });
      if (list.length > 0) {
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        localStorage.setItem(cacheKey, JSON.stringify(list));
        localStorage.setItem(timeKey, String(now));
        return list;
      }
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
      }
      console.warn('Error loading withdrawals from Firestore, using local fallback:', err);
    }
  }

  // Local fallback
  try {
    const all: WithdrawalRequest[] = JSON.parse(
      localStorage.getItem('joyearn_all_withdrawals') || '[]'
    );
    return all.filter((r) => !userUid || r.userUid === userUid || !r.userUid);
  } catch {
    return [];
  }
}

/**
 * Loads paginated withdrawals for Admin (50 items per query)
 */
export async function loadPaginatedWithdrawalsForAdmin(
  pageSize: number = 50,
  lastVisibleCreatedAt?: string
): Promise<{ requests: WithdrawalRequest[]; hasMore: boolean; lastCreatedAt?: string }> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const colRef = collection(db, 'withdrawals');
      let q = query(colRef, orderBy('createdAt', 'desc'), limit(pageSize));

      if (lastVisibleCreatedAt) {
        q = query(colRef, orderBy('createdAt', 'desc'), startAfter(lastVisibleCreatedAt), limit(pageSize));
      }

      const snap = await getDocs(q);
      const list: WithdrawalRequest[] = [];
      snap.forEach((d) => {
        list.push(d.data() as WithdrawalRequest);
      });

      const hasMore = list.length === pageSize;
      const lastCreatedAt = list.length > 0 ? list[list.length - 1].createdAt : undefined;

      return { requests: list, hasMore, lastCreatedAt };
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
      }
      console.warn('Error loading paginated admin withdrawals:', err);
    }
  }

  // Fallback to local storage
  try {
    const all: WithdrawalRequest[] = JSON.parse(
      localStorage.getItem('joyearn_all_withdrawals') || '[]'
    );
    return { requests: all.slice(0, pageSize), hasMore: all.length > pageSize };
  } catch {
    return { requests: [], hasMore: false };
  }
}

/**
 * Backward-compatible helper to load all withdrawals for Admin
 */
export async function loadAllWithdrawalsForAdmin(): Promise<WithdrawalRequest[]> {
  const result = await loadPaginatedWithdrawalsForAdmin(50);
  return result.requests;
}

/**
 * Updates withdrawal request status (Admin only):
 * Statuses: 'Submitted' | 'Under review' | 'Verified' | 'Paid' | 'Rejected'
 * When 'Paid', requires paymentReference and paidAmount.
 * When 'Rejected', requires rejectionReason and automatically refunds points in an atomic Firestore transaction.
 */
export async function updateWithdrawalStatus(
  requestId: string,
  newStatus: WithdrawalStatus,
  options?: {
    note?: string;
    paymentReference?: string;
    paidAmount?: number;
    rejectionReason?: string;
  } | string
): Promise<boolean> {
  const opts = typeof options === 'string' ? { note: options } : options || {};
  const db = getFirestoreDB();
  const all = await loadAllWithdrawalsForAdmin();
  const targetReq = all.find((r) => r.id === requestId);
  const now = new Date().toISOString();
  const note = opts.note || (newStatus === 'Paid' ? 'Payment processed' : newStatus === 'Rejected' ? opts.rejectionReason : '');

  if (newStatus === 'Paid' && !opts.paymentReference?.trim()) {
    throw new Error('A Payment Reference is required when marking a withdrawal as Paid.');
  }
  if (newStatus === 'Rejected' && !opts.rejectionReason?.trim()) {
    throw new Error('A Rejection Reason is required when rejecting a withdrawal.');
  }

  // If rejected, atomically refund approvedBalanceUSD to user in Firestore
  if (newStatus === 'Rejected' && targetReq && targetReq.status !== 'Rejected' && targetReq.userUid) {
    const refundCash = +(targetReq.cashAmount || (targetReq.points ? targetReq.points / 1000 : 0)).toFixed(2);
    if (db && targetReq.userUid !== 'device_user') {
      try {
        await runTransaction(db, async (transaction) => {
          const userDocRef = doc(db, 'users', targetReq.userUid!);
          const userSnap = await transaction.get(userDocRef);
          if (userSnap.exists()) {
            const curApproved = userSnap.data()?.approvedBalanceUSD ?? 0;
            transaction.update(userDocRef, {
              approvedBalanceUSD: +(curApproved + refundCash).toFixed(2),
              updatedAt: now,
            });
          }
          const wdDocRef = doc(db, 'withdrawals', requestId);
          const newTimeline = [
            ...(targetReq.timeline || []),
            {
              status: 'Rejected',
              date: now,
              note: opts.rejectionReason || `$${refundCash.toFixed(2)} USD returned to approved balance`,
            },
          ];
          transaction.update(wdDocRef, {
            status: 'Rejected',
            rejectionReason: opts.rejectionReason,
            adminNote: note,
            processedAt: now,
            statusUpdatedAt: now,
            timeline: newTimeline,
          });
        });
      } catch (err) {
        if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
        console.warn('Error refunding approved balance in Firestore atomic transaction:', err);
      }
    }

    // Refund in local mirror as well
    try {
      const curLocal = parseFloat(localStorage.getItem('joyearn_approved_balance_usd') || '0');
      const nextApproved = +(curLocal + refundCash).toFixed(2);
      localStorage.setItem('joyearn_approved_balance_usd', String(nextApproved));
      const cachedProfileRaw = localStorage.getItem('joyearn_cached_profile');
      if (cachedProfileRaw) {
        const p = JSON.parse(cachedProfileRaw);
        p.approvedBalanceUSD = nextApproved;
        localStorage.setItem('joyearn_cached_profile', JSON.stringify(p));
      }
    } catch {}
  } else if (db) {
    try {
      const docRef = doc(db, 'withdrawals', requestId);
      const newTimeline = [
        ...(targetReq?.timeline || []),
        {
          status: newStatus,
          date: now,
          note: opts.paymentReference ? `Reference: ${opts.paymentReference}` : note,
        },
      ];
      const gross = targetReq ? (targetReq.cashAmount || targetReq.points / POINTS_PER_DOLLAR) : 0;
      const feeAmt = targetReq?.feeAmount ?? +((gross * PAYOUT_FEE_PERCENT) / 100).toFixed(2);
      const netAmt = targetReq?.netAmount ?? +(gross - feeAmt).toFixed(2);
      const finalPaidAmt = opts.paidAmount ?? netAmt;

      await updateDoc(docRef, {
        status: newStatus,
        adminNote: note,
        paymentReference: opts.paymentReference || targetReq?.paymentReference || null,
        paidAmount: finalPaidAmt,
        feePercent: targetReq?.feePercent ?? PAYOUT_FEE_PERCENT,
        feeAmount: feeAmt,
        netAmount: netAmt,
        rejectionReason: opts.rejectionReason || null,
        processedAt: (newStatus === 'Paid' || newStatus === 'Rejected') ? now : targetReq?.processedAt || null,
        statusUpdatedAt: now,
        timeline: newTimeline,
      });
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Firestore update error:', err);
    }
  }

  // Local storage mirror update
  try {
    const updated = all.map((r) => {
      if (r.id === requestId) {
        const gross = r.cashAmount || r.points / POINTS_PER_DOLLAR;
        const feeAmt = r.feeAmount ?? +((gross * PAYOUT_FEE_PERCENT) / 100).toFixed(2);
        const netAmt = r.netAmount ?? +(gross - feeAmt).toFixed(2);
        const finalPaidAmt = opts.paidAmount ?? r.paidAmount ?? netAmt;

        const newTimeline = [
          ...(r.timeline || []),
          {
            status: newStatus,
            date: now,
            note: opts.paymentReference ? `Reference: ${opts.paymentReference}` : note,
          },
        ];
        return {
          ...r,
          status: newStatus,
          adminNote: note,
          paymentReference: opts.paymentReference || r.paymentReference,
          paidAmount: finalPaidAmt,
          feePercent: r.feePercent ?? PAYOUT_FEE_PERCENT,
          feeAmount: feeAmt,
          netAmount: netAmt,
          rejectionReason: opts.rejectionReason || r.rejectionReason,
          processedAt: (newStatus === 'Paid' || newStatus === 'Rejected') ? now : r.processedAt,
          statusUpdatedAt: now,
          timeline: newTimeline,
        };
      }
      return r;
    });
    localStorage.setItem('joyearn_all_withdrawals', JSON.stringify(updated));

  } catch (e) {
    console.warn('Local update error:', e);
  }

  return true;
}

/**
 * Detects if the same account number, IBAN, or PayPal email appears
 * in withdrawal requests from different users (Fraud & Multi-Account Prevention)
 */
export function detectDuplicateAccounts(requests: WithdrawalRequest[]): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};

  for (const r of requests) {
    if (!r.accountDetails) continue;
    const cleanAccount = r.accountDetails.trim().toLowerCase().replace(/[\s-]/g, '');
    if (!cleanAccount) continue;
    const userIdentifier = r.userEmail || r.userUid || 'Unknown User';

    if (!map[cleanAccount]) {
      map[cleanAccount] = new Set();
    }
    map[cleanAccount].add(userIdentifier);
  }

  const duplicates: Record<string, string[]> = {};
  for (const [account, users] of Object.entries(map)) {
    if (users.size > 1) {
      duplicates[account] = Array.from(users);
    }
  }
  return duplicates;
}

export interface MonthlyWithdrawalSummary {
  monthYear: string;
  totalPaidPoints: number;
  totalPaidDollars: number;
  totalPendingPoints: number;
  totalPendingDollars: number;
  monthlyPoolDollars: number;
  ownerShareDollars: number;
  usersPoolDollars: number;
}

export async function getMonthlyWithdrawalSummary(monthYear: string): Promise<MonthlyWithdrawalSummary> {
  const all = await loadAllWithdrawalsForAdmin();
  const currentMonthRequests = all.filter((r) => r.createdAt && r.createdAt.startsWith(monthYear));

  const totalPaidPoints = currentMonthRequests
    .filter((r) => r.status === 'Paid')
    .reduce((sum, r) => sum + (r.points || 0), 0);

  const totalPendingPoints = currentMonthRequests
    .filter((r) => r.status === 'Pending')
    .reduce((sum, r) => sum + (r.points || 0), 0);

  const totalPaidDollars = +(totalPaidPoints / POINTS_PER_DOLLAR).toFixed(2);
  const totalPendingDollars = +(totalPendingPoints / POINTS_PER_DOLLAR).toFixed(2);

  const monthlyPoolDollars = 50.0;
  const ownerShareDollars = +(monthlyPoolDollars * 0.70).toFixed(2);
  const usersPoolDollars = +(monthlyPoolDollars * 0.30).toFixed(2);

  return {
    monthYear,
    totalPaidPoints,
    totalPaidDollars,
    totalPendingPoints,
    totalPendingDollars,
    monthlyPoolDollars,
    ownerShareDollars,
    usersPoolDollars,
  };
}

/**
 * Permanently deletes user profile document from Firestore
 */
export async function deleteUserDataFromFirestore(userId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (!db || !userId) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    return true;
  } catch (err) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    console.warn('Error deleting user document from Firestore:', err);
    return false;
  }
}

/**
 * Saves a content or video safety report to Firestore
 */
export async function submitContentReport(
  itemType: 'video' | 'chat_message' | 'user',
  itemId: string,
  titleOrText: string,
  reason: string = 'User safety report'
): Promise<boolean> {
  const db = getFirestoreDB();
  const reportData = {
    itemType,
    itemId,
    titleOrText,
    reason,
    reportedAt: new Date().toISOString(),
    status: 'pending_review',
  };

  try {
    const existing = JSON.parse(localStorage.getItem('joyearn_safety_reports') || '[]');
    existing.push(reportData);
    localStorage.setItem('joyearn_safety_reports', JSON.stringify(existing));
  } catch {}

  if (db) {
    try {
      await addDoc(collection(db, 'reports'), reportData);
      return true;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Failed saving report to Firestore, saved locally:', err);
    }
  }
  return true;
}

/**
 * Records individual daily task completion in Firestore (one write per action)
 */
export async function recordTaskCompletionInFirestore(
  userId: string,
  taskId: string,
  dateStr: string
): Promise<boolean> {
  const recordId = `${taskId}_${dateStr}`;
  const localKey = `joyearn_tasks_${userId}_${dateStr}`;

  // 1. Update local storage mirror immediately
  try {
    const localTasks: string[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    if (!localTasks.includes(taskId)) {
      localTasks.push(taskId);
      localStorage.setItem(localKey, JSON.stringify(localTasks));
    }
  } catch {}

  if (!userId || !canPerformFirestoreWrite(userId)) {
    queueWriteLocally({ type: 'recordTask', payload: { userId, taskId, dateStr }, timestamp: Date.now() });
    return true;
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const taskDocRef = doc(db, 'users', userId, 'completed_tasks', recordId);
      await setDoc(taskDocRef, {
        userId,
        taskId,
        date: dateStr,
        completedAt: new Date().toISOString(),
      });
      incrementDailyWriteCount(userId);
      return true;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
        queueWriteLocally({ type: 'recordTask', payload: { userId, taskId, dateStr }, timestamp: Date.now() });
      }
      console.warn('Firestore daily task record error, preserved locally:', err);
    }
  }
  return true;
}

export interface UserDailySummary {
  date: string;
  completedTasks: string[];
  is100Percent: boolean;
  points: number;
}

/**
 * Records daily 100% summary in Firestore when all 5 tasks are completed,
 * using a single batched write for the user summary and monthly pool.
 */
export async function recordDailySummaryInFirestore(
  userId: string,
  dateStr: string,
  completedTasks: string[],
  is100Percent: boolean,
  points: number
): Promise<boolean> {
  const localSummariesKey = `joyearn_daily_summaries_${userId}`;
  const monthYear = dateStr.slice(0, 7);

  // Update local summaries mirror
  try {
    const summaries: Record<string, UserDailySummary> = JSON.parse(
      localStorage.getItem(localSummariesKey) || '{}'
    );
    summaries[dateStr] = {
      date: dateStr,
      completedTasks,
      is100Percent,
      points,
    };
    localStorage.setItem(localSummariesKey, JSON.stringify(summaries));
  } catch {}

  if (!userId || !canPerformFirestoreWrite(userId)) {
    queueWriteLocally({
      type: 'recordDailySummary',
      payload: { userId, dateStr, completedTasks, is100Percent, points },
      timestamp: Date.now(),
    });
    return true;
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const batch = writeBatch(db);

      const summaryDocRef = doc(db, 'users', userId, 'daily_summaries', dateStr);
      batch.set(
        summaryDocRef,
        {
          userId,
          date: dateStr,
          completedTasks,
          is100Percent,
          points,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (is100Percent) {
        const poolDocRef = doc(db, 'monthly_pools', monthYear);
        batch.set(
          poolDocRef,
          {
            monthYear,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await batch.commit();
      incrementDailyWriteCount(userId);
      return true;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) {
        notifyServerBusy();
        queueWriteLocally({
          type: 'recordDailySummary',
          payload: { userId, dateStr, completedTasks, is100Percent, points },
          timestamp: Date.now(),
        });
      }
      console.warn('Firestore daily summary error, stored locally:', err);
    }
  }
  return true;
}

/**
 * Loads monthly completed 100% days with 1-hour cache TTL
 */
export async function loadUserMonthlySummaries(
  userId: string,
  monthYearStr: string,
  forceRefresh = false
): Promise<{
  qualifyingDates: string[];
  qualifyingPoints: number;
  totalCommunityPoints: number;
}> {
  let qualifyingDates: string[] = [];
  let qualifyingPoints = 0;
  let totalCommunityPoints = 18500;

  const cacheKey = `joyearn_monthly_summaries_${userId}_${monthYearStr}`;
  const timeKey = `joyearn_monthly_summaries_time_${userId}_${monthYearStr}`;
  const now = Date.now();

  // 1. Read from local cache if within 1-hour TTL
  if (!forceRefresh) {
    try {
      const lastTime = parseInt(localStorage.getItem(timeKey) || '0', 10);
      if (now - lastTime < POOL_CONFIG_CACHE_TTL) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) return JSON.parse(cached);
      }
    } catch {}
  }

  // 2. Fetch from Firestore if needed
  const db = getFirestoreDB();
  if (db && userId) {
    try {
      const colRef = collection(db, 'users', userId, 'daily_summaries');
      const q = query(colRef, where('is100Percent', '==', true));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        if (data.date && data.date.startsWith(monthYearStr)) {
          qualifyingDates.push(data.date);
          qualifyingPoints += typeof data.points === 'number' ? data.points : 0;
        }
      });

      const poolSnap = await getDoc(doc(db, 'monthly_pools', monthYearStr));
      if (poolSnap.exists()) {
        const poolData = poolSnap.data();
        if (typeof poolData.totalQualifyingPoints === 'number') {
          totalCommunityPoints = poolData.totalQualifyingPoints;
        }
      }

      const result = {
        qualifyingDates: Array.from(new Set(qualifyingDates)),
        qualifyingPoints,
        totalCommunityPoints: Math.max(qualifyingPoints, totalCommunityPoints),
      };
      localStorage.setItem(cacheKey, JSON.stringify(result));
      localStorage.setItem(timeKey, String(now));
      return result;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error reading monthly summaries from Firestore, using local data:', err);
    }
  }

  return {
    qualifyingDates,
    qualifyingPoints,
    totalCommunityPoints: Math.max(qualifyingPoints, totalCommunityPoints),
  };
}
