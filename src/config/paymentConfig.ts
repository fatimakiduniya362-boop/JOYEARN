// ============================================================================
// 💰 JOYEARN PAYMENT & REWARDS CONFIGURATION (CENTRALIZED & EDITABLE)
// ============================================================================

export const MIN_WITHDRAW_USD = 100;
export const MAX_WITHDRAW_USD_PER_REQUEST = 500;
export const MAX_WITHDRAWALS_PER_MONTH = 2;
export const MIN_ACCOUNT_AGE_DAYS = 7;
export const MIN_ACTIVE_DAYS_TO_WITHDRAW = 15;
export const PAYOUT_REVIEW_TEXT = 'up to 7 days';

// Configurable Points-to-USD Conversion Threshold (strictly 8,000 to 10,000 Pts = $1.00 USD)
// Default: 8,000 Points = $1.00 USD (old 1,000 Pts = $1.00 conversion permanently retired)
export const MIN_POINTS_PER_DOLLAR = 8000;
export const MAX_POINTS_PER_DOLLAR = 10000;
export const DEFAULT_POINTS_PER_DOLLAR = 8000;
export const POINTS_PER_DOLLAR = DEFAULT_POINTS_PER_DOLLAR;
export const MIN_WITHDRAWAL_POINTS = MIN_WITHDRAW_USD * DEFAULT_POINTS_PER_DOLLAR; // 800,000 pts at default 8,000/$1
export const MAX_WITHDRAWAL_POINTS = MAX_WITHDRAW_USD_PER_REQUEST * DEFAULT_POINTS_PER_DOLLAR;

const POINTS_PER_DOLLAR_STORAGE_KEY = 'joyearn_points_per_dollar_config_v1';

export function clampPointsPerDollar(rate: number): number {
  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    return DEFAULT_POINTS_PER_DOLLAR;
  }
  const rounded = Math.round(rate);
  if (rounded < MIN_POINTS_PER_DOLLAR) return MIN_POINTS_PER_DOLLAR;
  if (rounded > MAX_POINTS_PER_DOLLAR) return MAX_POINTS_PER_DOLLAR;
  return rounded;
}

export function getConfiguredPointsPerDollar(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(POINTS_PER_DOLLAR_STORAGE_KEY);
      if (raw) {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed)) {
          return clampPointsPerDollar(parsed);
        }
      }
    }
  } catch {}
  return DEFAULT_POINTS_PER_DOLLAR;
}

export function setConfiguredPointsPerDollar(rate: number): number {
  const clamped = clampPointsPerDollar(rate);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(POINTS_PER_DOLLAR_STORAGE_KEY, String(clamped));
    }
  } catch {}
  return clamped;
}

export function pointsToUsd(points: number, rate?: number): number {
  const activeRate = clampPointsPerDollar(rate ?? getConfiguredPointsPerDollar());
  if (typeof points !== 'number' || !Number.isFinite(points) || points <= 0) return 0;
  return points / activeRate;
}

export function usdToPoints(usd: number, rate?: number): number {
  const activeRate = clampPointsPerDollar(rate ?? getConfiguredPointsPerDollar());
  if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) return 0;
  return Math.round(usd * activeRate);
}

// Revenue & Pool Distribution (Dynamic & Owner Managed)
export const OWNER_PERCENT = 0;
export const USERS_PERCENT = 0;
export const RESERVE_PERCENT = 0;
export const MAX_POINT_VALUE_USD = 1 / MIN_POINTS_PER_DOLLAR; // $0.000125 max per point
export const PAYOUT_FEE_PERCENT = 2; // Default 2% payout transfer fee
export const POOL_CARRY_OVER = true;

// Daily Anti-cheat ceiling
export const WELCOME_BONUS_POINTS = 0; // New user starts at zero.
export const DAILY_MAX_POINTS = 2500; // Anti-cheat ceiling per day

// Notices & Terms Disclaimers (AdMob kept strictly separate from cash-convertible rewards)
export const MANDATORY_REWARDS_NOTICE =
  'Withdrawals require admin verification of EasyPaisa, JazzCash, or Bank details before payment. AdMob ads are strictly separate from cash-convertible rewards.';

export const POOL_REVENUE_NOTICE =
  'Withdrawals require admin verification before payment and are reviewed manually. AdMob advertising is kept separate from cash-convertible rewards.';

export const UNPUBLISHED_MONTH_NOTICE =
  'Your approved withdrawable balance is updated after admin verification.';

export const PAYOUT_REVIEW_NOTICE =
  `Withdrawals are reviewed manually by admin and paid within ${PAYOUT_REVIEW_TEXT}.`;

export const CURRENT_DATA_VERSION = '2.4.0';
