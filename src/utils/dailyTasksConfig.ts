/**
 * JoyEarn - Daily Tasks & Monthly Prize Pool Configuration
 *
 * All values are easily configurable and strictly enforced.
 */

/**
 * Minimum number of 100% completed days needed in a month to be eligible for a payout
 * (Editable variable, Default: 15 days)
 */
export let MIN_ACTIVE_DAYS: number = (() => {
  try {
    const saved = localStorage.getItem('joyearn_min_active_days');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 31) return parsed;
    }
  } catch {}
  return 15;
})();

export function setMinActiveDays(days: number): number {
  const sanitized = Math.max(1, Math.min(31, Math.round(days)));
  MIN_ACTIVE_DAYS = sanitized;
  try {
    localStorage.setItem('joyearn_min_active_days', String(sanitized));
  } catch {}
  return sanitized;
}

/**
 * Notice required in Daily Tasks card and Wallet
 */
export const REWARDS_DISCLAIMER_NOTICE =
  'Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small.';

/**
 * Core text requirement:
 * "Complete all 5 daily tasks to count today's points toward this month's prize pool."
 */
export const DAILY_TASKS_GOAL_LINE =
  "Complete all 5 daily tasks to count today's points toward this month's prize pool.";

/**
 * Estimated monthly community prize pool in JoyPoints funded by ad revenue
 * (1,000 Points = $1.00 USD)
 */
export const MONTHLY_PRIZE_POOL_POINTS = 50000; // e.g., $50.00 USD pool

/**
 * Monthly Prize Pool Distribution Percentages:
 * OWNER_PERCENT = 70 (70% owner operational share)
 * USERS_PERCENT = 30 (30% community reward pool)
 */
export const OWNER_PERCENT = 70;
export const USERS_PERCENT = 30;

export type MandatoryTaskId =
  | 'daily_checkin'
  | 'daily_quiz'
  | 'daily_video'
  | 'daily_wheel'
  | 'daily_chest';

export interface MandatoryDailyTask {
  id: MandatoryTaskId;
  number: number;
  title: string;
  urduTitle: string;
  description: string;
  urduDescription: string;
  icon: string;
  actionKey: 'checkin' | 'learn' | 'watch' | 'wheel' | 'chest';
}

/**
 * Exactly 5 mandatory tasks that reset every day at local midnight:
 * (1) daily check-in
 * (2) complete today's 5-question quiz
 * (3) watch today's video
 * (4) spin the lucky wheel
 * (5) open the daily chest
 *
 * NOTE: Watching a rewarded video ad is NOT in this mandatory list.
 * "Watch a video to double your points" remains 100% optional.
 */
export const MANDATORY_DAILY_TASKS: MandatoryDailyTask[] = [
  {
    id: 'daily_checkin',
    number: 1,
    title: 'Daily Check-in',
    urduTitle: 'روزانہ حاضری (چیک ان)',
    description: 'Tap to check in for today',
    urduDescription: 'آج کی حاضری کے لیے ٹیپ کریں',
    icon: '📅',
    actionKey: 'checkin',
  },
  {
    id: 'daily_quiz',
    number: 2,
    title: "Complete Today's 5-Question Quiz",
    urduTitle: 'آج کا 5 سوالات کا کوئز مکمل کریں',
    description: 'Answer today’s daily educational quiz',
    urduDescription: 'تعلیمی کوئز کے 5 سوالات حل کریں',
    icon: '📚',
    actionKey: 'learn',
  },
  {
    id: 'daily_video',
    number: 3,
    title: "Watch Today's Video",
    urduTitle: 'آج کی تعلیمی ویڈیو دیکھیں',
    description: 'Watch today’s featured learning video',
    urduDescription: 'آج کی منتخب کردہ تعلیمی ویڈیو دیکھیں',
    icon: '🎬',
    actionKey: 'watch',
  },
  {
    id: 'daily_wheel',
    number: 4,
    title: 'Spin the Lucky Wheel',
    urduTitle: 'لکی وہیل گھمائیں',
    description: 'Spin for daily bonus JoyPoints',
    urduDescription: 'روزانہ کا لکی اسپن کریں',
    icon: '🎡',
    actionKey: 'wheel',
  },
  {
    id: 'daily_chest',
    number: 5,
    title: 'Open the Daily Chest',
    urduTitle: 'روزانہ چیسٹ باکس کھولیں',
    description: 'Claim your daily streak reward chest',
    urduDescription: 'روزانہ انعامی چیسٹ باکس کھولیں',
    icon: '🎁',
    actionKey: 'chest',
  },
];
