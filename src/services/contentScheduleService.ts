/**
 * JoyEarn 150-Day Unified Content Scheduling & Independence Engine
 *
 * Provides a reliable, automated 150-day rotation for:
 * 1. Daily 5-Question Quizzes (from 1,000-question database)
 * 2. Daily Varied Tasks & Quests (from 150-day catalogue)
 * 3. Daily Featured Educational Videos (from verified safe catalogue)
 * 4. Daily Alphabet & Number Learning Revision
 *
 * Ensures:
 * - Content is stable throughout the local calendar day.
 * - Rotates automatically at local midnight without requiring app updates.
 * - Protects against device clock rollbacks using monotonic timestamps.
 * - Stores progress persistently in localStorage and Firestore.
 */

import { ALL_QUIZZES } from '../data/quizDatabase';
import { SCHEDULED_TASKS_150, ScheduledDailyQuest } from '../data/tasksCatalogue150';
import { VERIFIED_SAFE_MEDIA_CATALOGUE, isMediaContentSafe } from './contentSafetyService';
import { ALPHABET_DATA, AlphabetLetter } from '../data/alphabetDatabase';
import { NUMBERS_1_TO_100, NumberItem } from '../data/numbersDatabase';
import { QuizItem, VideoContent } from '../types';

export type { ScheduledDailyQuest };

export const SCHEDULE_START_DATE = '2026-10-01';
export const TOTAL_SCHEDULED_DAYS = 150;

/**
 * Calculates current day index (0 to 149) based on local calendar day.
 * Includes anti-cheat clock rollback protection.
 */
export function getScheduleDayIndex(): number {
  const now = new Date();
  const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const [startYear, startMonth, startDay] = SCHEDULE_START_DATE.split('-').map(Number);
  const startMidnight = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);

  const diffMs = currentMidnight.getTime() - startMidnight.getTime();
  let elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (elapsedDays < 0) elapsedDays = 0;

  // Anti-cheat verification: Ensure day index never goes backward
  try {
    const savedMonotonicStr = localStorage.getItem('joyearn_max_seen_day_index');
    const savedMonotonic = savedMonotonicStr ? parseInt(savedMonotonicStr, 10) : 0;
    if (elapsedDays < savedMonotonic) {
      elapsedDays = savedMonotonic;
    } else {
      localStorage.setItem('joyearn_max_seen_day_index', String(elapsedDays));
    }
  } catch {}

  return elapsedDays % TOTAL_SCHEDULED_DAYS;
}

/**
 * Returns today's Day Number (1 to 150)
 */
export function getScheduleDayNumber(): number {
  return getScheduleDayIndex() + 1;
}

/**
 * Returns today's 5 unique non-repeating quiz questions
 */
export function getScheduledDailyQuiz(dayIndex?: number): QuizItem[] {
  const day = dayIndex !== undefined ? dayIndex : getScheduleDayIndex();
  const startIndex = (day * 5) % Math.max(5, ALL_QUIZZES.length - 5);
  return ALL_QUIZZES.slice(startIndex, startIndex + 5);
}

/**
 * Returns today's unique scheduled daily task
 */
export function getScheduledDailyTask(dayIndex?: number): ScheduledDailyQuest {
  const day = dayIndex !== undefined ? dayIndex : getScheduleDayIndex();
  return SCHEDULED_TASKS_150[day % SCHEDULED_TASKS_150.length];
}

/**
 * Returns today's featured safe educational video
 */
export function getScheduledDailyVideo(dayIndex?: number): VideoContent {
  const day = dayIndex !== undefined ? dayIndex : getScheduleDayIndex();
  const safeVideos = VERIFIED_SAFE_MEDIA_CATALOGUE.filter(isMediaContentSafe);
  return safeVideos[day % safeVideos.length];
}

/**
 * Returns today's featured Alphabet letter for revision
 */
export function getScheduledDailyLetter(dayIndex?: number): AlphabetLetter {
  const day = dayIndex !== undefined ? dayIndex : getScheduleDayIndex();
  return ALPHABET_DATA[day % ALPHABET_DATA.length];
}

/**
 * Returns today's featured Number for revision
 */
export function getScheduledDailyNumber(dayIndex?: number): NumberItem {
  const day = dayIndex !== undefined ? dayIndex : getScheduleDayIndex();
  return NUMBERS_1_TO_100[day % NUMBERS_1_TO_100.length];
}
