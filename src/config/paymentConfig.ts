// ============================================================================
// 💰 JOYEARN PAYMENT & REWARDS CONFIGURATION (CENTRALIZED & EDITABLE)
// ============================================================================

export const MIN_WITHDRAW_USD = 100;
export const MAX_WITHDRAW_USD_PER_REQUEST = 500;
export const MAX_WITHDRAWALS_PER_MONTH = 2;
export const MIN_ACCOUNT_AGE_DAYS = 7;
export const MIN_ACTIVE_DAYS_TO_WITHDRAW = 15;
export const PAYOUT_REVIEW_TEXT = 'up to 7 days';

// Revenue & Pool Distribution (Editable Constants)
export const OWNER_PERCENT = 70; // 70% kept by app owner to operate & maintain the app
export const USERS_PERCENT = 30; // 30% forms the monthly users rewards pool
export const RESERVE_PERCENT = 10; // 10% buffer kept of users pool for safety & error prevention
export const MAX_POINT_VALUE_USD = 0.002; // Cap per point: each qualifying point cannot exceed $0.002 USD
export const PAYOUT_FEE_PERCENT = 2; // 2% payout transfer fee deducted from user payout
export const POOL_CARRY_OVER = true; // Unpaid published pool balance carried over to next month

// Daily Anti-cheat ceiling
export const WELCOME_BONUS_POINTS = 0; // New user starts at zero.
export const DAILY_MAX_POINTS = 2500; // Anti-cheat ceiling per day

// Legacy compatibility shim - Points have NO fixed cash value!
export const LEGACY_POINTS_PER_DOLLAR = 1000;
export const POINTS_PER_DOLLAR = LEGACY_POINTS_PER_DOLLAR;
export const MIN_WITHDRAWAL_POINTS = 100000; // Legacy 100,000 pts ($100 USD equivalent)
export const MAX_WITHDRAWAL_POINTS = 500000; // Legacy 500,000 pts ($500 USD equivalent)

// Notices & Terms Disclaimers
export const MANDATORY_REWARDS_NOTICE =
  'Points have no fixed cash value. Rewards are calculated from the real revenue received for each month, are reviewed manually, may be zero in some months and are not guaranteed.';

export const POOL_REVENUE_NOTICE =
  '70% of net ad revenue is kept by the app owner to run the app. 30% forms the monthly rewards pool. Payouts are paid only from the rewards pool. Any unused pool balance is carried over to the next month. Transfer fees are deducted from the payout amount.';

export const UNPUBLISHED_MONTH_NOTICE =
  'Your share will be calculated when this month is published.';

export const PAYOUT_REVIEW_NOTICE =
  `Withdrawals are reviewed manually and paid within ${PAYOUT_REVIEW_TEXT}.`;

export const CURRENT_DATA_VERSION = '2.3.0';
