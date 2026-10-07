/**
 * Daily Quiz Generator & Manager for JoyEarn
 * - Deterministic 5-question daily quiz based on local calendar date
 * - Shuffles answer order each time
 * - Backed by 450+ question bank across 10 categories + procedural math/patterns/word puzzles
 * - Enforces 1 completion per day with "Come back tomorrow" lock
 */

import { QuizItem } from '../types';
import { ALL_QUIZZES } from '../data/quizDatabase';
import { getDaysSinceRotationStart } from '../utils/dailyRotation';

// Deterministic seed PRNG (Mulberry32)
function createPRNG(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash << 5) - hash + dateStr.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Procedural Question Generators (Math, Number Patterns, Word Puzzles)
 */
export function generateProceduralQuestions(dateStr: string, count: number = 2): QuizItem[] {
  const seed = dateToSeed(dateStr) + 999;
  const rand = createPRNG(seed);
  const items: QuizItem[] = [];

  for (let i = 0; i < count; i++) {
    const type = i % 3; // 0: Math, 1: Number Pattern, 2: Word Puzzle

    if (type === 0) {
      // Dynamic Math Equation
      const a = Math.floor(rand() * 40) + 10;
      const b = Math.floor(rand() * 25) + 5;
      const op = rand() > 0.5 ? '+' : 'x';
      const ans = op === '+' ? a + b : (a % 12 + 2) * (b % 9 + 2);
      const displayA = op === '+' ? a : (a % 12 + 2);
      const displayB = op === '+' ? b : (b % 9 + 2);

      const wrong1 = ans + (rand() > 0.5 ? 2 : -2);
      const wrong2 = ans + (rand() > 0.5 ? 5 : -5);
      const wrong3 = ans + 10;

      items.push({
        id: `proc_math_${dateStr}_${i}`,
        category: 'Math',
        difficulty: 'Beginner',
        question: `Mental Math: What is ${displayA} ${op === 'x' ? '×' : '+'} ${displayB}?`,
        urduQuestion: `ذہنی ریاضی: ${displayA} ${op === 'x' ? '×' : '+'} ${displayB} کا جواب کیا ہے؟`,
        options: [String(ans), String(wrong1), String(wrong2), String(wrong3)],
        correctAnswer: 0,
        explanation: `${displayA} ${op === 'x' ? 'multiplied by' : 'plus'} ${displayB} equals exactly ${ans}.`,
        urduExplanation: `${displayA} اور ${displayB} کا صحیح جواب ${ans} ہے۔`,
        points: 20
      });
    } else if (type === 1) {
      // Dynamic Number Pattern
      const start = Math.floor(rand() * 15) + 2;
      const step = Math.floor(rand() * 5) + 3;
      const seq = [start, start + step, start + step * 2, start + step * 3];
      const nextNum = start + step * 4;

      const wrong1 = nextNum + step;
      const wrong2 = nextNum - 2;
      const wrong3 = nextNum + 3;

      items.push({
        id: `proc_seq_${dateStr}_${i}`,
        category: 'General Knowledge',
        difficulty: 'Intermediate',
        question: `Pattern Logic: What comes next in the sequence: ${seq.join(', ')}, ?`,
        urduQuestion: `پیٹرن لاجک: سلسلے میں اگلا عدد کیا آئے گا: ${seq.join(', ')}, ؟`,
        options: [String(nextNum), String(wrong1), String(wrong2), String(wrong3)],
        correctAnswer: 0,
        explanation: `Each number increases by adding ${step} to the previous number (${seq[3]} + ${step} = ${nextNum}).`,
        urduExplanation: `ہر عدد میں ${step} کا اضافہ ہو رہا ہے، اگلا عدد ${nextNum} ہے۔`,
        points: 25
      });
    } else {
      // Dynamic Word Scramble
      const wordList = [
        { word: 'PLANET', hint: 'A celestial body orbiting a star (e.g. Earth)', urduHint: 'ستارے کے گرد گھومنے والا سیارہ' },
        { word: 'GARDEN', hint: 'A plot of ground where flowers and herbs grow', urduHint: 'پھولوں اور پودوں کا خوبصورت باغ' },
        { word: 'WISDOM', hint: 'The quality of having knowledge and good judgement', urduHint: 'عقل اور سچی دانشمندی' },
        { word: 'HONEST', hint: 'Telling the truth and free of deceit', urduHint: 'سچا اور دیانت دار انسان' },
        { word: 'STREAK', hint: 'An unbroken continuous series of daily activity', urduHint: 'روزانہ کا مسلسل تسلسل' }
      ];
      const selected = wordList[Math.floor(rand() * wordList.length)];
      const scrambled = selected.word.split('').sort(() => 0.5 - rand()).join('');

      items.push({
        id: `proc_word_${dateStr}_${i}`,
        category: 'Language',
        difficulty: 'Beginner',
        question: `Word Puzzle: Unscramble the letters "${scrambled}" (${selected.hint})`,
        urduQuestion: `لفظی پہیلی: حروف "${scrambled}" کو درست ترتیب دے کر لفظ بنائیں (${selected.urduHint})`,
        options: [selected.word, 'SPRING', 'KNOWLEDGE', 'MEMORY'],
        correctAnswer: 0,
        explanation: `Unscrambling "${scrambled}" spells "${selected.word}".`,
        urduExplanation: `ان حروف کو ترتیب دینے سے صحیح لفظ "${selected.word}" بنتا ہے۔`,
        points: 20
      });
    }
  }

  return items;
}

export interface ShuffledQuizItem extends QuizItem {
  originalCorrectAnswerIndex: number;
}

/**
 * Randomly shuffles the 4 options of a quiz question so that the correct answer is randomized.
 */
export function shuffleQuizOptions(quiz: QuizItem, randomSeed?: number): ShuffledQuizItem {
  const indices = [0, 1, 2, 3];
  
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const shuffledOptions = indices.map((idx) => quiz.options[idx]);
  const correctVal = quiz.correctAnswer !== undefined ? quiz.correctAnswer : (quiz.correctIndex ?? 0);
  const newCorrectAnswer = indices.indexOf(correctVal);

  return {
    ...quiz,
    options: shuffledOptions,
    correctAnswer: newCorrectAnswer >= 0 ? newCorrectAnswer : 0,
    originalCorrectAnswerIndex: correctVal
  };
}

/**
 * Gets today's local date string formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks if the daily quiz has already been completed today
 */
export function isDailyQuizCompletedToday(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const today = getTodayDateString();
    return localStorage.getItem(`joyearn_daily_quiz_completed_${today}`) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks today's daily quiz as completed
 */
export function markDailyQuizCompletedToday(score: number): void {
  if (typeof window === 'undefined') return;
  try {
    const today = getTodayDateString();
    localStorage.setItem(`joyearn_daily_quiz_completed_${today}`, 'true');
    localStorage.setItem(`joyearn_daily_quiz_score_${today}`, String(score));
    
    // Increment total quizzes completed counter
    const currentCount = parseInt(localStorage.getItem('joyearn_completed_quizzes_count') || '0', 10);
    localStorage.setItem('joyearn_completed_quizzes_count', String(currentCount + 1));
  } catch {
    // storage not available
  }
}

/**
 * Gets 5 deterministic, non-repeating family-friendly questions for today's date
 * Based on ROTATION_START_DATE, cycling across the 1,000-question bank without repetition for 200 days (6+ months).
 */
export function getDailyQuizForToday(allQuizzes: QuizItem[] = ALL_QUIZZES): ShuffledQuizItem[] {
  const daysElapsed = getDaysSinceRotationStart();
  const safeBank = allQuizzes && allQuizzes.length >= 5 ? allQuizzes : ALL_QUIZZES;
  const totalDays = Math.floor(safeBank.length / 5);
  const dayCycle = totalDays > 0 ? daysElapsed % totalDays : 0;
  const startIndex = dayCycle * 5;

  let selectedQuestions = safeBank.slice(startIndex, startIndex + 5);
  if (selectedQuestions.length < 5) {
    selectedQuestions = safeBank.slice(0, 5);
  }

  // Shuffle options for all 5 questions
  return selectedQuestions.map((q) => shuffleQuizOptions(q));
}

/**
 * Calculates time remaining until next midnight (in hours, minutes, seconds)
 */
export function getTimeUntilMidnight(): { hours: number; minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);

  const diffMs = midnight.getTime() - now.getTime();
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return { hours, minutes, seconds, formatted };
}
