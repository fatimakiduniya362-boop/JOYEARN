import { QuizItem } from '../types';
import { QUIZ_BANK_1 } from './quizBank1';
import { QUIZ_BANK_2 } from './quizBank2';
import { QUIZ_BANK_3 } from './quizBank3';
import { QUIZ_BANK_4 } from './quizBank4';

/**
 * JoyEarn Universal Quiz Database
 * 1,000 Verified Family-Friendly Questions (5 per day x 200 non-repeating days).
 * Aggregates QUIZ_BANK_1, QUIZ_BANK_2, QUIZ_BANK_3, and QUIZ_BANK_4.
 */
export const ALL_QUIZZES: QuizItem[] = [
  ...QUIZ_BANK_1,
  ...QUIZ_BANK_2,
  ...QUIZ_BANK_3,
  ...QUIZ_BANK_4,
];

export { QUIZ_BANK_1 } from './quizBank1';
export { QUIZ_BANK_2 } from './quizBank2';
export { QUIZ_BANK_3 } from './quizBank3';
export { QUIZ_BANK_4 } from './quizBank4';
