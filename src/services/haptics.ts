/**
 * JoyEarn Haptic Feedback Service
 * Real-time tactile response engine utilizing Navigator Vibration API
 * 
 * Provides calibrated micro-vibrations for:
 * - Light: Button taps, Play/Download clicks, Tab switches (15ms)
 * - Medium: Card activations, Modal toggles, Answer selection (35ms)
 * - Heavy: Daily rewards, Cash withdrawals, Key unlocks (60ms)
 * - Success: Activity completed, Quiz correct, Streak milestone ([25, 40, 45]ms)
 * - Warning: Validation alert, Insufficient balance ([45, 30, 45]ms)
 */

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'selection';

class HapticService {
  private isEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('joyearn_haptic_disabled');
      this.isEnabled = stored !== 'true';
    }
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'navigator' in window && typeof navigator.vibrate === 'function';
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('joyearn_haptic_disabled', String(!enabled));
    }
  }

  /**
   * Raw vibration trigger
   */
  public vibrate(pattern: number | number[]): boolean {
    if (!this.isEnabled || !this.isSupported()) return false;
    try {
      return navigator.vibrate(pattern);
    } catch {
      return false;
    }
  }

  /**
   * Ultra-subtle click for list selection (10ms)
   */
  public selection() {
    return this.vibrate(10);
  }

  /**
   * Light tactile tap for Play, Download, navigation buttons (16ms)
   */
  public light() {
    return this.vibrate(16);
  }

  /**
   * Medium bump for card clicks, filter pills, drawer toggles (36ms)
   */
  public medium() {
    return this.vibrate(36);
  }

  /**
   * Heavy feedback for primary actions, claiming bonuses (60ms)
   */
  public heavy() {
    return this.vibrate(60);
  }

  /**
   * Dual rhythmic pulse on milestone or task completion ([25, 40, 45]ms)
   */
  public success() {
    return this.vibrate([25, 40, 45]);
  }

  /**
   * Warning vibration pattern on validation errors ([45, 30, 45]ms)
   */
  public warning() {
    return this.vibrate([45, 30, 45]);
  }

  /**
   * Generalized trigger by type
   */
  public trigger(type: HapticType = 'light') {
    switch (type) {
      case 'light':
        return this.light();
      case 'medium':
        return this.medium();
      case 'heavy':
        return this.heavy();
      case 'success':
        return this.success();
      case 'warning':
        return this.warning();
      case 'selection':
        return this.selection();
      default:
        return this.light();
    }
  }
}

export const hapticService = new HapticService();
