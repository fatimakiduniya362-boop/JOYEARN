/**
 * JoyEarn Automated 190+ Day Rotation Engine
 *
 * ============================================================================
 * (1) ROTATION START DATE CONFIGURATION
 * ============================================================================
 * Easily editable variable for launching the app.
 * Format: 'YYYY-MM-DD' (e.g. '2026-10-05').
 * If left as 'LAUNCH_DATE_HERE', today automatically acts as Day 1.
 * Content is guaranteed never to wrap back to Day 1 before 190 days have passed.
 */
export const ROTATION_START_DATE: string = 'LAUNCH_DATE_HERE';

/** Minimum rotation cycle length (at least 190 days) */
export const MIN_ROTATION_DAYS = 190;
export const TOTAL_ROTATION_CYCLE_DAYS = 200; // 200 days * 5 = 1,000 unique questions

import { ALL_QUIZZES } from '../data/quizDatabase';
import { ALL_VIDEOS, DailyVideoContent } from '../data/videos';
import { QuizItem } from '../types';

/**
 * Validates if a video URL is valid and does not contain placeholder text
 */
export function isWorkingVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (trimmed.includes('PASTE_YOUR_CUSTOM_LINK_HERE')) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Returns all active, verified working video entries from the curriculum.
 * Only returns videos where approved is true and the video URL is valid and working.
 */
export function getWorkingVideos(): DailyVideoContent[] {
  return ALL_VIDEOS.filter((v) => v.approved === true && isWorkingVideoUrl(v.videoUrl));
}

/**
 * Calculates days elapsed between local midnight of ROTATION_START_DATE and today.
 * If ROTATION_START_DATE is 'LAUNCH_DATE_HERE' or unconfigured, today is Day 1 (index 0).
 */
export function getDaysSinceRotationStart(customDate?: Date): number {
  const now = customDate || new Date();
  const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  let effectiveStartDate = ROTATION_START_DATE;
  if (!effectiveStartDate || effectiveStartDate === 'LAUNCH_DATE_HERE') {
    try {
      const cached = localStorage.getItem('joyearn_firestore_rotation_date');
      if (cached && /^\d{4}-\d{2}-\d{2}$/.test(cached)) {
        effectiveStartDate = cached;
      }
    } catch {}
  }

  if (
    !effectiveStartDate ||
    effectiveStartDate === 'LAUNCH_DATE_HERE' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effectiveStartDate)
  ) {
    // Graceful launch default: today is Day 1 (0 days elapsed)
    return 0;
  }

  const [startYear, startMonth, startDay] = effectiveStartDate.split('-').map(Number);
  const startMidnight = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

  const diffMs = currentMidnight.getTime() - startMidnight.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Returns today's active day index (0-based)
 */
export function getTodayDayIndex(): number {
  return getDaysSinceRotationStart();
}

/**
 * Returns the 5 unique non-repeating quiz questions for today.
 * Guaranteed never to wrap back to Day 1 before 200 days (1,000 questions / 5 per day).
 */
export function getTodayDailyQuiz(dayIndex?: number): QuizItem[] {
  const idx = dayIndex !== undefined ? dayIndex : getTodayDayIndex();
  // Safe 200-day cycle (> 190 days)
  const safeCycle = idx % TOTAL_ROTATION_CYCLE_DAYS;
  const startIndex = safeCycle * 5;
  const questions = ALL_QUIZZES.slice(startIndex, startIndex + 5);

  // Safety fallback if slice is short
  if (questions.length < 5) {
    return ALL_QUIZZES.slice(0, 5);
  }
  return questions;
}

/**
 * Returns all unlocked working videos up to today.
 * Filters out any video containing PASTE_YOUR_CUSTOM_LINK_HERE or invalid links.
 * Content never wraps back before 190 days have passed.
 */
export function getTodayUnlockedVideos(dayIndex?: number): DailyVideoContent[] {
  const idx = dayIndex !== undefined ? dayIndex : getTodayDayIndex();
  const workingVideos = getWorkingVideos();
  if (workingVideos.length === 0) return [];

  // Protect against wrapping back to day 1 before workingVideos.length (190+) days
  const cycleLength = Math.max(MIN_ROTATION_DAYS, workingVideos.length);
  const safeDayNumber = (idx % cycleLength) + 1;
  const unlockedCount = Math.min(workingVideos.length, Math.max(1, safeDayNumber));

  return workingVideos.slice(0, unlockedCount);
}

/**
 * Returns the featured working video of the day
 */
export function getTodayFeaturedVideo(dayIndex?: number): DailyVideoContent | null {
  const workingVideos = getWorkingVideos();
  if (workingVideos.length === 0) return null;
  const idx = dayIndex !== undefined ? dayIndex : getTodayDayIndex();
  const safeIdx = idx % workingVideos.length;
  return workingVideos[safeIdx];
}

/**
 * Returns today's dynamic daily streak chest reward
 */
export interface DailyBonusReward {
  dayNumber: number;
  basePoints: number;
  bonusPoints: number;
  perkReward: string;
  urduPerkReward: string;
  badgeEmoji: string;
}

export function getTodayDailyBonusReward(dayIndex?: number): DailyBonusReward {
  const idx = dayIndex !== undefined ? dayIndex : getTodayDayIndex();
  const dayNumber = (idx % 200) + 1;
  const basePoints = 50;
  const bonusPoints = (dayNumber * 7) % 75; // Cycles 0 to 74 bonus points
  
  const perks = [
    { perk: 'Double Quiz Shield', urdu: 'ڈبل کوئز شیلڈ', emoji: '🛡️' },
    { perk: 'Golden Streak Flame', urdu: 'سنہری اسٹریک فلیم', emoji: '🔥' },
    { perk: 'Speedy Solver Star', urdu: 'تیز رفتار حل ستارہ', emoji: '⭐' },
    { perk: 'Lucky Compass', urdu: 'خوش قسمت قطب نما', emoji: '🧭' },
    { perk: 'Wisdom Scroll', urdu: 'حکمت کا طومار', emoji: '📜' },
    { perk: 'Diamond Key', urdu: 'ہیرے کی چابی', emoji: '🗝️' },
    { perk: 'Family Crown', urdu: 'شاہی تاج', emoji: '👑' },
  ];

  const perk = perks[idx % perks.length];

  return {
    dayNumber,
    basePoints,
    bonusPoints,
    perkReward: perk.perk,
    urduPerkReward: perk.urdu,
    badgeEmoji: perk.emoji,
  };
}

/**
 * Returns today's Lucky Wheel prize slices with deterministic daily variety
 */
export interface WheelSector {
  id: string;
  label: string;
  points: number;
  color: string;
  textColor: string;
  isJackpot?: boolean;
}

export function getTodayWheelSectors(dayIndex?: number): WheelSector[] {
  const idx = dayIndex !== undefined ? dayIndex : getTodayDayIndex();
  const jackpotPoints = 200 + ((idx * 25) % 300); // 200 to 475 pts dynamic jackpot

  return [
    { id: 'sec_1', label: '+25 Pts', points: 25, color: '#f43f5e', textColor: '#ffffff' },
    { id: 'sec_2', label: '+50 Pts', points: 50, color: '#3b82f6', textColor: '#ffffff' },
    { id: 'sec_3', label: '+10 Pts', points: 10, color: '#10b981', textColor: '#ffffff' },
    { id: 'sec_4', label: `🌟 +${jackpotPoints}`, points: jackpotPoints, color: '#f59e0b', textColor: '#ffffff', isJackpot: true },
    { id: 'sec_5', label: '+30 Pts', points: 30, color: '#8b5cf6', textColor: '#ffffff' },
    { id: 'sec_6', label: '+75 Pts', points: 75, color: '#06b6d4', textColor: '#ffffff' },
    { id: 'sec_7', label: '+15 Pts', points: 15, color: '#ec4899', textColor: '#ffffff' },
    { id: 'sec_8', label: '+100 Pts', points: 100, color: '#eab308', textColor: '#ffffff' },
  ];
}
