import { CURRENT_DATA_VERSION, WELCOME_BONUS_POINTS } from '../config/paymentConfig';

/**
 * Cleans old local demo data (demo balances, test transactions, demo streaks)
 * on first run if the stored data version is missing or older than CURRENT_DATA_VERSION.
 * NEVER clears the user's login session or authentication tokens.
 */
export function runDataCleanMigrationIfNeeded(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const versionKey = 'joyearn_data_version';
    const storedVersion = localStorage.getItem(versionKey);

    if (storedVersion !== CURRENT_DATA_VERSION) {
      // Preserve critical login & preference keys
      const preserveKeys = [
        'joyearn_app_user',
        'joyearn_last_profile',
        'joyearn_stable_device_uid',
        'joyearn_userName',
        'joyearn_user_email',
        'joyearn_app_theme',
        'joyearn_app_language',
        'joyearn_dark_mode',
        'joyearn_has_ad_free',
        'joyearn_admin_override',
      ];

      const preserved: Record<string, string | null> = {};
      for (const k of preserveKeys) {
        preserved[k] = localStorage.getItem(k);
      }

      // Clear legacy demo & sample cache keys
      const keysToClean = [
        'joyearn_points',
        'joyearn_today_points',
        'joyearn_lifetime_points',
        'joyearn_streak_days',
        'joyearn_all_withdrawals',
        'joyearn_transactions',
        'joyearn_mandatory_tasks_today',
        'joyearn_mandatory_tasks_date',
        'joyearn_unlocked_perks',
        'joyearn_claimed_milestones',
        'joyearn_saved_payout_details',
      ];

      for (const k of keysToClean) {
        localStorage.removeItem(k);
      }

      // Set clean zero values for new/upgraded profile
      localStorage.setItem('joyearn_points', String(WELCOME_BONUS_POINTS));
      localStorage.setItem('joyearn_today_points', '0');
      localStorage.setItem('joyearn_lifetime_points', '0');
      localStorage.setItem('joyearn_streak_days', '0');
      localStorage.setItem('joyearn_all_withdrawals', '[]');

      // Restore preserved authentication & user settings
      for (const [k, v] of Object.entries(preserved)) {
        if (v !== null) {
          localStorage.setItem(k, v);
        }
      }

      // Mark version as upgraded
      localStorage.setItem(versionKey, CURRENT_DATA_VERSION);
    }
  } catch (err) {
    console.warn('Error during data version check/clean:', err);
  }
}
