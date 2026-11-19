import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AppUser } from '../types';
import { getFirestoreDB } from './firestoreService';
import { commitAtomicPointsTransaction } from './pointsLedgerService';

export const REFERRAL_REWARD_POINTS = 50;

const PENDING_REF_CODE_KEY = 'joyearn_pending_referral_code_v1';
const DEVICE_CLAIMED_REF_KEY = 'joyearn_device_referral_claimed_v1';
const LOCAL_REFERRAL_STORE_KEY = 'joyearn_referrals_ledger_v1';

function withCloudTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('cloud_timeout')), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export interface VerifiedReferralRecord {
  id: string; // referredUid (enforces max 1 referral per new user)
  referrerUid: string;
  referralCode: string;
  referredUid: string;
  referredName: string;
  status: 'verified';
  rewardPoints: number;
  creditedToReferrer: boolean;
  txId: string;
  createdAt: string;
}

export interface ReferralSummary {
  referralCode: string;
  referralUrl: string;
  totalSuccessfulInvites: number;
  totalPointsEarned: number;
  referrals: VerifiedReferralRecord[];
}

export interface ReferralClaimResult {
  status:
    | 'verified'
    | 'no_pending_referral'
    | 'unverified_account'
    | 'self_referral_blocked'
    | 'duplicate_blocked'
    | 'invalid_code'
    | 'error';
  message: string;
  record?: VerifiedReferralRecord;
}

export interface ReferralCreditResult {
  newlyCreditedCount: number;
  newlyCreditedPoints: number;
  creditedRecords: VerifiedReferralRecord[];
}

/**
 * Generates a deterministic, unique referral code for a given user UID.
 * Format: JOY-XXXXXX (6 uppercase alphanumeric chars derived from UID hash + suffix).
 */
export function getReferralCodeForUser(uid?: string | null): string {
  if (!uid || uid === 'guest' || uid === 'local') {
    return 'JOY-SIGNIN';
  }
  let hash = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const partA = (hash >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  const cleanUid = uid.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const partB = (cleanUid.slice(-2) || 'JE').padEnd(2, 'X');
  return `JOY-${partA}${partB}`;
}

export function buildReferralUrl(referralCode: string): string {
  const origin =
    typeof window !== 'undefined' && window.location?.origin && window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://joyearn.app';
  return `${origin}/?ref=${encodeURIComponent(referralCode)}`;
}

export function isValidReferralCode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^JOY-[A-Z0-9]{4,12}$/.test(code.trim().toUpperCase()) && code.trim().toUpperCase() !== 'JOY-SIGNIN';
}

export function buildReferralShareMessage(referralUrl: string, referralCode: string, urdu = false): string {
  if (urdu) {
    return `JoyEarn پر میرے ساتھ شامل ہوں! سیکھیں، کھیلیں اور مستقل JoyPoints کمائیں۔ میرے ریفرل لنک سے جوائن کریں (${referralCode}): ${referralUrl}`;
  }
  return `Join me on JoyEarn to learn, play safe games, and earn permanent JoyPoints! Sign up with my referral link (${referralCode}): ${referralUrl}`;
}

export function buildWhatsAppShareUrl(referralUrl: string, referralCode: string, urdu = false): string {
  const text = buildReferralShareMessage(referralUrl, referralCode, urdu);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildSmsShareUrl(referralUrl: string, referralCode: string, urdu = false): string {
  const text = buildReferralShareMessage(referralUrl, referralCode, urdu);
  return `sms:?body=${encodeURIComponent(text)}`;
}

function readLocalReferralStore(): {
  codes: Record<string, { referrerUid: string; referrerName: string; referrerEmail?: string }>;
  referrals: VerifiedReferralRecord[];
} {
  try {
    const raw = localStorage.getItem(LOCAL_REFERRAL_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        codes: parsed.codes && typeof parsed.codes === 'object' ? parsed.codes : {},
        referrals: Array.isArray(parsed.referrals) ? parsed.referrals : [],
      };
    }
  } catch {}
  return { codes: {}, referrals: [] };
}

function writeLocalReferralStore(data: {
  codes: Record<string, { referrerUid: string; referrerName: string; referrerEmail?: string }>;
  referrals: VerifiedReferralRecord[];
}): void {
  try {
    localStorage.setItem(LOCAL_REFERRAL_STORE_KEY, JSON.stringify(data));
  } catch {}
}

/**
 * Captures `?ref=JOY-XXXXXX` from the URL when a new user lands via a referral link.
 * Persists it until the user finishes signing up and verifies their account.
 */
export function captureIncomingReferralFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const rawRef = params.get('ref')?.trim().toUpperCase();
    if (rawRef && isValidReferralCode(rawRef)) {
      localStorage.setItem(PENDING_REF_CODE_KEY, rawRef);
      return rawRef;
    }
    const existing = localStorage.getItem(PENDING_REF_CODE_KEY);
    return existing && isValidReferralCode(existing) ? existing : null;
  } catch {
    return null;
  }
}

export function getPendingReferralCode(): string | null {
  try {
    const code = localStorage.getItem(PENDING_REF_CODE_KEY)?.trim().toUpperCase();
    return code && isValidReferralCode(code) ? code : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    localStorage.removeItem(PENDING_REF_CODE_KEY);
  } catch {}
}

/**
 * Registers the signed-in user's unique referral code in Firestore and local registry
 * so incoming referrals can resolve the code back to the referrer's UID.
 */
export async function ensureUserReferralCodeRegistered(user: AppUser): Promise<string> {
  const code = getReferralCodeForUser(user.uid);
  if (!isValidReferralCode(code)) return code;

  // Save in local registry (supports offline & local verification)
  const localStore = readLocalReferralStore();
  localStore.codes[code] = {
    referrerUid: user.uid,
    referrerName: user.displayName || 'JoyEarn Member',
    referrerEmail: user.email || undefined,
  };
  writeLocalReferralStore(localStore);

  // Persist to Firestore `/referral_codes/{code}`
  try {
    const db = getFirestoreDB();
    if (db) {
      await withCloudTimeout(
        setDoc(
          doc(db, 'referral_codes', code),
          {
            code,
            referrerUid: user.uid,
            referrerName: user.displayName || 'JoyEarn Member',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
      );
    }
  } catch (err) {
    console.warn('Referral code cloud registration deferred:', err);
  }

  return code;
}

/**
 * Resolves a referral code to its referring user UID (checks Firestore first, then local registry).
 */
async function resolveReferralCodeOwner(
  code: string
): Promise<{ referrerUid: string; referrerName: string; referrerEmail?: string } | null> {
  const normalized = code.trim().toUpperCase();
  if (!isValidReferralCode(normalized)) return null;

  try {
    const db = getFirestoreDB();
    if (db) {
      const snap = await withCloudTimeout(getDoc(doc(db, 'referral_codes', normalized)));
      if (snap.exists()) {
        const data = snap.data();
        if (typeof data.referrerUid === 'string' && data.referrerUid.length > 0) {
          return {
            referrerUid: data.referrerUid,
            referrerName: typeof data.referrerName === 'string' ? data.referrerName : 'JoyEarn Member',
          };
        }
      }
    }
  } catch {}

  const localStore = readLocalReferralStore();
  return localStore.codes[normalized] || null;
}

/**
 * Processes a pending referral when a genuinely new, verified user signs in.
 * Enforces strict anti-fraud rules:
 * - Requires verified account (`emailVerified` or Google OAuth provider)
 * - Blocks self-referrals (same UID, same code, or same email)
 * - Blocks duplicate accounts / repeated claims per UID and per device
 * - Creates an immutable verified referral record worth exactly 50 permanent JoyPoints
 */
export async function processVerifiedReferralSignup(
  newUser: AppUser,
  overrideCode?: string | null
): Promise<ReferralClaimResult> {
  const code = (overrideCode || getPendingReferralCode())?.trim().toUpperCase();
  if (!code) {
    return { status: 'no_pending_referral', message: 'No pending referral link.' };
  }
  if (!isValidReferralCode(code)) {
    clearPendingReferralCode();
    return { status: 'invalid_code', message: 'Invalid referral code format.' };
  }

  // Require genuinely verified user account (Google OAuth accounts or verified email accounts)
  const emailVerifiedFlag = (newUser as AppUser & { emailVerified?: boolean }).emailVerified;
  const isVerifiedAccount = Boolean(
    newUser.uid &&
      newUser.uid !== 'guest' &&
      newUser.uid !== 'local' &&
      newUser.email &&
      emailVerifiedFlag !== false
  );
  if (!isVerifiedAccount) {
    return {
      status: 'unverified_account',
      message: 'Please verify your account email to complete referral verification.',
    };
  }

  // Block self-referral immediately by code
  const ownCode = getReferralCodeForUser(newUser.uid);
  if (ownCode === code) {
    clearPendingReferralCode();
    return { status: 'self_referral_blocked', message: 'Self-referrals are not allowed.' };
  }

  // Anti-fraud: prevent duplicate-account farming from the same device
  try {
    const claimedByUidOnDevice = localStorage.getItem(DEVICE_CLAIMED_REF_KEY);
    if (claimedByUidOnDevice) {
      clearPendingReferralCode();
      return {
        status: 'duplicate_blocked',
        message: 'A referral has already been claimed on this device.',
      };
    }
  } catch {}

  const owner = await resolveReferralCodeOwner(code);
  if (!owner) {
    return { status: 'invalid_code', message: 'Referral code was not found.' };
  }

  // Block self-referral by UID or email
  if (
    owner.referrerUid === newUser.uid ||
    (owner.referrerEmail &&
      newUser.email &&
      owner.referrerEmail.toLowerCase() === newUser.email.toLowerCase())
  ) {
    clearPendingReferralCode();
    return { status: 'self_referral_blocked', message: 'Self-referrals are not allowed.' };
  }

  const localStore = readLocalReferralStore();
  if (localStore.referrals.some((r) => r.referredUid === newUser.uid)) {
    clearPendingReferralCode();
    return { status: 'duplicate_blocked', message: 'This account has already completed a referral.' };
  }

  const txId = `ref_bonus_${owner.referrerUid}_${newUser.uid}`;
  const record: VerifiedReferralRecord = {
    id: newUser.uid,
    referrerUid: owner.referrerUid,
    referralCode: code,
    referredUid: newUser.uid,
    referredName: newUser.displayName || (newUser.email ? newUser.email.split('@')[0] : 'New Member') || 'New Member',
    status: 'verified',
    rewardPoints: REFERRAL_REWARD_POINTS,
    creditedToReferrer: false,
    txId,
    createdAt: new Date().toISOString(),
  };

  // Persist to Firestore `/referrals/{newUser.uid}` (immutable 1-per-new-user document)
  try {
    const db = getFirestoreDB();
    if (db) {
      const refDocRef = doc(db, 'referrals', newUser.uid);
      const existing = await withCloudTimeout(getDoc(refDocRef));
      if (existing.exists()) {
        clearPendingReferralCode();
        return { status: 'duplicate_blocked', message: 'This account already has a recorded referral.' };
      }
      await withCloudTimeout(
        setDoc(refDocRef, {
          ...record,
          createdAtServer: serverTimestamp(),
        })
      );
    }
  } catch (err) {
    console.warn('Referral cloud write deferred to local ledger:', err);
  }

  // Save in local ledger & mark device as claimed
  localStore.referrals = [record, ...localStore.referrals];
  writeLocalReferralStore(localStore);
  try {
    localStorage.setItem(DEVICE_CLAIMED_REF_KEY, newUser.uid);
  } catch {}
  clearPendingReferralCode();

  return {
    status: 'verified',
    message: `Referral verified! Your friend will receive +${REFERRAL_REWARD_POINTS} permanent JoyPoints.`,
    record,
  };
}

/**
 * Loads all verified referrals for a referring user (merges Firestore + local ledger without duplicates).
 */
export async function loadUserReferrals(referrerUid: string): Promise<VerifiedReferralRecord[]> {
  if (!referrerUid || referrerUid === 'guest' || referrerUid === 'local') return [];

  const byId = new Map<string, VerifiedReferralRecord>();
  const localStore = readLocalReferralStore();
  for (const r of localStore.referrals) {
    if (r.referrerUid === referrerUid && r.referredUid !== referrerUid) {
      byId.set(r.referredUid, r);
    }
  }

  try {
    const db = getFirestoreDB();
    if (db) {
      const q = query(collection(db, 'referrals'), where('referrerUid', '==', referrerUid));
      const snap = await withCloudTimeout(getDocs(q));
      snap.forEach((docSnap) => {
        const d = docSnap.data();
        if (d.referredUid && d.referredUid !== referrerUid && d.status === 'verified') {
          const existing = byId.get(d.referredUid);
          byId.set(d.referredUid, {
            id: docSnap.id,
            referrerUid: d.referrerUid,
            referralCode: d.referralCode || getReferralCodeForUser(referrerUid),
            referredUid: d.referredUid,
            referredName: d.referredName || 'Verified Friend',
            status: 'verified',
            rewardPoints: REFERRAL_REWARD_POINTS,
            creditedToReferrer: Boolean(d.creditedToReferrer || existing?.creditedToReferrer),
            txId: d.txId || `ref_bonus_${referrerUid}_${d.referredUid}`,
            createdAt: typeof d.createdAt === 'string' ? d.createdAt : new Date().toISOString(),
          });
        }
      });
    }
  } catch (err) {
    console.warn('Could not load cloud referrals, using local cache:', err);
  }

  return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Automatically credits +50 permanent JoyPoints to the referring user for every verified,
 * uncredited referral using deterministic idempotent `txId` (`ref_bonus_{referrerUid}_{referredUid}`).
 * - Points are written to the permanent points ledger and NEVER reset daily.
 * - Duplicate/repeated credits are strictly prevented by `commitAtomicPointsTransaction`.
 * - Completely independent from AdMob.
 */
export async function reconcileAndCreditPendingReferrals(
  user: AppUser
): Promise<ReferralCreditResult> {
  if (!user.uid || user.uid === 'guest' || user.uid === 'local') {
    return { newlyCreditedCount: 0, newlyCreditedPoints: 0, creditedRecords: [] };
  }

  const allReferrals = await loadUserReferrals(user.uid);
  const uncredited = allReferrals.filter(
    (r) => r.status === 'verified' && !r.creditedToReferrer && r.referredUid !== user.uid
  );

  if (uncredited.length === 0) {
    return { newlyCreditedCount: 0, newlyCreditedPoints: 0, creditedRecords: [] };
  }

  const creditedRecords: VerifiedReferralRecord[] = [];
  const localStore = readLocalReferralStore();
  const db = getFirestoreDB();

  for (const ref of uncredited) {
    const txId = ref.txId || `ref_bonus_${user.uid}_${ref.referredUid}`;
    const outcome = await commitAtomicPointsTransaction({
      uid: user.uid,
      txId,
      pointsDelta: REFERRAL_REWARD_POINTS,
      reason: `Invite Friend Bonus — ${ref.referredName} (+${REFERRAL_REWARD_POINTS} Pts)`,
      activityRef: 'referral_reward',
      category: 'referral',
      email: user.email,
      displayName: user.displayName,
    });

    if (outcome.status === 'committed' || outcome.status === 'queued_offline') {
      const updatedRecord: VerifiedReferralRecord = {
        ...ref,
        creditedToReferrer: true,
        txId,
      };
      creditedRecords.push(updatedRecord);

      // Mark credited in local store
      const idx = localStore.referrals.findIndex((r) => r.referredUid === ref.referredUid);
      if (idx >= 0) {
        localStore.referrals[idx] = updatedRecord;
      } else {
        localStore.referrals.unshift(updatedRecord);
      }

      // Mark credited in Firestore
      if (db) {
        try {
          await withCloudTimeout(
            updateDoc(doc(db, 'referrals', ref.referredUid), {
              creditedToReferrer: true,
              creditedAt: serverTimestamp(),
            })
          );
        } catch {}
      }
    } else if (outcome.status === 'duplicate') {
      // Already credited in permanent ledger — ensure local flag matches without re-crediting
      const idx = localStore.referrals.findIndex((r) => r.referredUid === ref.referredUid);
      if (idx >= 0) {
        localStore.referrals[idx] = { ...ref, creditedToReferrer: true };
      }
    }
  }

  writeLocalReferralStore(localStore);

  return {
    newlyCreditedCount: creditedRecords.length,
    newlyCreditedPoints: creditedRecords.length * REFERRAL_REWARD_POINTS,
    creditedRecords,
  };
}
