import { QuizItem } from '../types';
import { QUIZ_BANK_1 } from './quizBank1';
import { QUIZ_BANK_2 } from './quizBank2';
import { QUIZ_BANK_3 } from './quizBank3';
import { QUIZ_BANK_4 } from './quizBank4';

/**
 * Universal Global Quiz Curriculum for JoyEarn
 * 1,000 Family-friendly Questions across 200 Days (5 unique questions per day).
 * 100% Policy-compliant, zero regional/country-specific bias.
 * All questions feature 4 distinct options (A, B, C, D) and educational explanations.
 */
export const ALL_QUIZZES: QuizItem[] = [
  ...QUIZ_BANK_1,
  ...QUIZ_BANK_2,
  ...QUIZ_BANK_3,
  ...QUIZ_BANK_4,
];
