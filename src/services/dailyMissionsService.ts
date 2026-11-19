/**
 * ============================================================================
 * JOYEARN DAILY FUN MISSIONS, QUIZ BATTLE, BRAIN CHALLENGE & ACHIEVEMENTS
 * ============================================================================
 * - 3 Daily Fun Missions on Home: Quick Quiz, Picture Puzzle, Brain Challenge
 * - Lightweight 5-question daily Quiz Battle with personal best & weekly sync
 * - Interactive Brain Challenge (Memory Matching, Word Puzzles, Picture ID, Logic)
 * - Real cosmetic Achievements tied strictly to verified completed activities
 * - Permanent duplicate-reward prevention via recordPermanentRewardTransaction
 */

import { recordPermanentRewardTransaction } from './firestoreService';
import { recordWeeklyChallengeActivity } from './engagementService';

export type DailyMissionId = 'quick_quiz' | 'picture_puzzle' | 'brain_challenge';
export type BrainDifficulty = 'easy' | 'medium' | 'hard';
export type BrainActivityType = 'memory' | 'word' | 'picture' | 'logic';

export interface DailyMissionDef {
  id: DailyMissionId;
  title: string;
  subtitle: string;
  rewardPoints: number;
  emoji: string;
}

export const DAILY_MISSIONS_LIST: DailyMissionDef[] = [
  {
    id: 'quick_quiz',
    title: 'Quick Quiz',
    subtitle: '5 fresh daily questions',
    rewardPoints: 10,
    emoji: '⚡',
  },
  {
    id: 'picture_puzzle',
    title: 'Picture Puzzle',
    subtitle: 'Identify visual clues',
    rewardPoints: 10,
    emoji: '🖼️',
  },
  {
    id: 'brain_challenge',
    title: 'Brain Challenge',
    subtitle: 'Memory, Word & Logic',
    rewardPoints: 10,
    emoji: '🧠',
  },
];

export interface QuizBattleQuestion {
  id: string;
  topic: 'General Knowledge' | 'Science' | 'Technology' | 'Geography' | 'Language';
  question: string;
  options: [string, string, string, string];
  correctIndex: number;
}

export const QUIZ_BATTLE_BANK: QuizBattleQuestion[] = [
  { id: 'qb1', topic: 'Science', question: 'Which gas do plants absorb from the air to make food?', options: ['Oxygen', 'Carbon Dioxide', 'Nitrogen', 'Helium'], correctIndex: 1 },
  { id: 'qb2', topic: 'Geography', question: 'Which is the largest ocean on Earth?', options: ['Atlantic Ocean', 'Indian Ocean', 'Pacific Ocean', 'Arctic Ocean'], correctIndex: 2 },
  { id: 'qb3', topic: 'Technology', question: 'What does "HTTP" stand for on the web?', options: ['HyperText Transfer Protocol', 'High Tech Tracking Program', 'Home Terminal Text Path', 'Hyperlink Tool Transport Port'], correctIndex: 0 },
  { id: 'qb4', topic: 'Language', question: 'Which word is a synonym for "generous"?', options: ['Selfish', 'Charitable', 'Quiet', 'Strict'], correctIndex: 1 },
  { id: 'qb5', topic: 'General Knowledge', question: 'How many continents are there on Earth?', options: ['Five', 'Six', 'Seven', 'Eight'], correctIndex: 2 },
  { id: 'qb6', topic: 'Science', question: 'What is the boiling point of water at sea level?', options: ['50°C', '80°C', '100°C', '120°C'], correctIndex: 2 },
  { id: 'qb7', topic: 'Geography', question: 'Which river is famously associated with Egypt?', options: ['Amazon', 'Nile', 'Danube', 'Yangtze'], correctIndex: 1 },
  { id: 'qb8', topic: 'Technology', question: 'Which component is known as the "brain" of a computer?', options: ['Monitor', 'CPU', 'Keyboard', 'Speaker'], correctIndex: 1 },
  { id: 'qb9', topic: 'Language', question: 'What is the plural form of the word "cactus"?', options: ['Cactuseses', 'Cacti', 'Cactusis', 'Cacten'], correctIndex: 1 },
  { id: 'qb10', topic: 'General Knowledge', question: 'Which planet is known as the Red Planet?', options: ['Venus', 'Mars', 'Jupiter', 'Saturn'], correctIndex: 1 },
  { id: 'qb11', topic: 'Science', question: 'Which vitamin is mainly produced when sunlight hits human skin?', options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], correctIndex: 3 },
  { id: 'qb12', topic: 'Geography', question: 'Mount Everest lies in which mountain range?', options: ['Andes', 'Alps', 'Himalayas', 'Rockies'], correctIndex: 2 },
  { id: 'qb13', topic: 'Technology', question: 'What is a "pixel" on a digital screen?', options: ['A sound wave', 'A tiny dot of color', 'A battery cell', 'A network cable'], correctIndex: 1 },
  { id: 'qb14', topic: 'Language', question: 'Which punctuation mark ends a direct question?', options: ['Period', 'Comma', 'Question mark', 'Colon'], correctIndex: 2 },
  { id: 'qb15', topic: 'General Knowledge', question: 'How many minutes are in two and a half hours?', options: ['120', '135', '150', '165'], correctIndex: 2 },
  { id: 'qb16', topic: 'Science', question: 'Which organ pumps blood throughout the human body?', options: ['Lungs', 'Liver', 'Heart', 'Stomach'], correctIndex: 2 },
  { id: 'qb17', topic: 'Geography', question: 'Which country is home to the Great Barrier Reef?', options: ['Brazil', 'Australia', 'Japan', 'Norway'], correctIndex: 1 },
  { id: 'qb18', topic: 'Technology', question: 'What does "Wi-Fi" allow devices to do?', options: ['Charge without a plug', 'Connect wirelessly to a network', 'Print on paper', 'Cool the battery'], correctIndex: 1 },
  { id: 'qb19', topic: 'Language', question: 'Which word is an antonym (opposite) of "ancient"?', options: ['Modern', 'Historic', 'Dusty', 'Classic'], correctIndex: 0 },
  { id: 'qb20', topic: 'General Knowledge', question: 'Which instrument has 88 keys on a standard full-size model?', options: ['Violin', 'Guitar', 'Piano', 'Flute'], correctIndex: 2 },
];

export interface PicturePuzzleItem {
  id: string;
  emojis: string;
  clue: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: BrainDifficulty;
}

export const PICTURE_PUZZLES: PicturePuzzleItem[] = [
  { id: 'pp1', emojis: '☀️🌻🐝', clue: 'Bright yellow flower that turns toward the sun', options: ['Sunflower', 'Cactus', 'Pine Tree', 'Mushroom'], correctIndex: 0, difficulty: 'easy' },
  { id: 'pp2', emojis: '❄️🏔️🎿', clue: 'High icy peaks where snow sports take place', options: ['Desert Dunes', 'Alpine Mountains', 'Coral Reef', 'Rainforest'], correctIndex: 1, difficulty: 'easy' },
  { id: 'pp3', emojis: '🚀🌍🌙', clue: 'Journey beyond Earth’s atmosphere', options: ['Deep Sea Diving', 'Space Exploration', 'Gardening', 'Cooking'], correctIndex: 1, difficulty: 'easy' },
  { id: 'pp4', emojis: '🔬🧬🧪', clue: 'Studying cells, DNA, and experiments', options: ['Biology Lab', 'Music Studio', 'Bakery', 'Library'], correctIndex: 0, difficulty: 'medium' },
  { id: 'pp5', emojis: '🧭🗺️⛵', clue: 'Finding direction across open waters', options: ['Navigation', 'Painting', 'Typing', 'Sculpting'], correctIndex: 0, difficulty: 'medium' },
  { id: 'pp6', emojis: '⚡☁️🌧️', clue: 'Electrical discharge during a heavy storm', options: ['Rainbow', 'Thunderstorm', 'Drought', 'Breeze'], correctIndex: 1, difficulty: 'medium' },
  { id: 'pp7', emojis: '🏛️📜🦉', clue: 'Ancient symbol of wisdom and classical learning', options: ['Philosophy', 'Construction', 'Fishing', 'Farming'], correctIndex: 0, difficulty: 'hard' },
  { id: 'pp8', emojis: '🌱💧☀️➡️🍎', clue: 'How sunlight and water help plants grow fruit', options: ['Photosynthesis', 'Evaporation', 'Magnetism', 'Gravity'], correctIndex: 0, difficulty: 'hard' },
];

export interface WordPuzzleItem {
  id: string;
  scrambled: string;
  answer: string;
  hint: string;
  difficulty: BrainDifficulty;
}

export const WORD_PUZZLES: WordPuzzleItem[] = [
  { id: 'wp1', scrambled: 'NALETP', answer: 'PLANET', hint: 'Orbits a star like Earth or Mars', difficulty: 'easy' },
  { id: 'wp2', scrambled: 'DREANG', answer: 'GARDEN', hint: 'Place where flowers and vegetables grow', difficulty: 'easy' },
  { id: 'wp3', scrambled: 'NOACE', answer: 'OCEAN', hint: 'Vast body of salt water', difficulty: 'easy' },
  { id: 'wp4', scrambled: 'ENCSICE', answer: 'SCIENCE', hint: 'Systematic study of the natural world', difficulty: 'medium' },
  { id: 'wp5', scrambled: 'YBRILRA', answer: 'LIBRARY', hint: 'Quiet place filled with books', difficulty: 'medium' },
  { id: 'wp6', scrambled: 'YGRENE', answer: 'ENERGY', hint: 'Capacity to do work or power light', difficulty: 'medium' },
  { id: 'wp7', scrambled: 'YHPAGROEG', answer: 'GEOGRAPHY', hint: 'Study of Earth’s landscapes and places', difficulty: 'hard' },
  { id: 'wp8', scrambled: 'YGLONHCET', answer: 'TECHNOLOGY', hint: 'Tools and systems built using science', difficulty: 'hard' },
];

export interface LogicChallengeItem {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  difficulty: BrainDifficulty;
}

export const LOGIC_CHALLENGES: LogicChallengeItem[] = [
  { id: 'lc1', prompt: 'What comes next in the sequence: 2, 4, 6, 8, ?', options: ['9', '10', '11', '12'], correctIndex: 1, difficulty: 'easy' },
  { id: 'lc2', prompt: 'If all roses are flowers, and some flowers fade quickly, can we be sure all roses fade quickly?', options: ['Yes, always', 'No, not necessarily', 'Only in winter', 'Only red roses'], correctIndex: 1, difficulty: 'easy' },
  { id: 'lc3', prompt: 'What comes next: 3, 6, 12, 24, ?', options: ['30', '36', '48', '60'], correctIndex: 2, difficulty: 'medium' },
  { id: 'lc4', prompt: 'Amina is taller than Bilal. Bilal is taller than Sara. Who is the shortest?', options: ['Amina', 'Bilal', 'Sara', 'Cannot tell'], correctIndex: 2, difficulty: 'medium' },
  { id: 'lc5', prompt: 'Find the next number: 1, 1, 2, 3, 5, 8, ?', options: ['11', '12', '13', '15'], correctIndex: 2, difficulty: 'hard' },
  { id: 'lc6', prompt: 'If 5 machines take 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets?', options: ['1 minute', '5 minutes', '20 minutes', '100 minutes'], correctIndex: 1, difficulty: 'hard' },
];

export interface UserMissionsProgress {
  completedByDate: Record<string, DailyMissionId[]>;
  totalMissionsCompleted: number;
  quizBattleRoundsCompleted: number;
  quizBattleBestScore: number;
  brainChallengesCompleted: number;
  brainBestScores: Record<BrainActivityType, number>;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlocked: boolean;
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDaySeed(dateStr = getTodayStr()): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = (hash * 31 + dateStr.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function getDailyQuizBattleQuestions(dateStr = getTodayStr()): QuizBattleQuestion[] {
  const seed = getDaySeed(dateStr);
  const total = QUIZ_BATTLE_BANK.length;
  const start = (seed * 5) % total;
  const picked: QuizBattleQuestion[] = [];
  for (let i = 0; i < 5; i++) {
    picked.push(QUIZ_BATTLE_BANK[(start + i * 3) % total]);
  }
  return picked;
}

export function getDailyPicturePuzzle(dateStr = getTodayStr(), difficulty?: BrainDifficulty): PicturePuzzleItem {
  const pool = difficulty ? PICTURE_PUZZLES.filter((p) => p.difficulty === difficulty) : PICTURE_PUZZLES;
  const list = pool.length > 0 ? pool : PICTURE_PUZZLES;
  return list[getDaySeed(dateStr) % list.length];
}

export function getDailyWordPuzzle(dateStr = getTodayStr(), difficulty: BrainDifficulty = 'easy'): WordPuzzleItem {
  const pool = WORD_PUZZLES.filter((p) => p.difficulty === difficulty);
  const list = pool.length > 0 ? pool : WORD_PUZZLES;
  return list[getDaySeed(dateStr) % list.length];
}

export function getDailyLogicChallenge(dateStr = getTodayStr(), difficulty: BrainDifficulty = 'easy'): LogicChallengeItem {
  const pool = LOGIC_CHALLENGES.filter((p) => p.difficulty === difficulty);
  const list = pool.length > 0 ? pool : LOGIC_CHALLENGES;
  return list[getDaySeed(dateStr) % list.length];
}

function progressStorageKey(uid: string): string {
  return `joyearn_daily_missions_progress_${uid || 'guest'}`;
}

export function loadUserMissionsProgress(uid: string): UserMissionsProgress {
  const empty: UserMissionsProgress = {
    completedByDate: {},
    totalMissionsCompleted: 0,
    quizBattleRoundsCompleted: 0,
    quizBattleBestScore: 0,
    brainChallengesCompleted: 0,
    brainBestScores: { memory: 0, word: 0, picture: 0, logic: 0 },
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = localStorage.getItem(progressStorageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...empty,
        ...parsed,
        brainBestScores: { ...empty.brainBestScores, ...(parsed.brainBestScores || {}) },
      };
    }
  } catch {}
  return empty;
}

export function saveUserMissionsProgress(uid: string, progress: UserMissionsProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(progressStorageKey(uid), JSON.stringify(progress));
  } catch {}
}

export function getTodayCompletedMissions(uid: string): DailyMissionId[] {
  const progress = loadUserMissionsProgress(uid);
  return progress.completedByDate[getTodayStr()] || [];
}

/**
 * Completes a Daily Fun Mission once per day using a unique permanent transaction ID
 * so duplicate rewards are strictly prevented.
 */
export async function completeDailyMission(
  uid: string,
  missionId: DailyMissionId,
  displayName?: string
): Promise<{ alreadyCompleted: boolean; rewardPoints: number; progress: UserMissionsProgress }> {
  const today = getTodayStr();
  const progress = loadUserMissionsProgress(uid);
  const todayList = progress.completedByDate[today] || [];

  if (todayList.includes(missionId)) {
    return { alreadyCompleted: true, rewardPoints: 0, progress };
  }

  const def = DAILY_MISSIONS_LIST.find((m) => m.id === missionId);
  const pts = def?.rewardPoints ?? 10;
  const txId = `daily_mission_${today}_${missionId}`;
  const ledgerRes = await recordPermanentRewardTransaction(
    uid,
    txId,
    pts,
    `Daily Mission: ${def?.title || missionId}`,
    'daily_mission'
  );

  progress.completedByDate[today] = [...todayList, missionId];
  progress.totalMissionsCompleted += 1;
  saveUserMissionsProgress(uid, progress);

  if (!ledgerRes.alreadyClaimed && uid && uid !== 'guest') {
    void recordWeeklyChallengeActivity(uid, displayName || 'Learner', pts, txId);
  }

  return {
    alreadyCompleted: ledgerRes.alreadyClaimed,
    rewardPoints: ledgerRes.alreadyClaimed ? 0 : pts,
    progress,
  };
}

export function recordQuizBattleScore(uid: string, score: number): UserMissionsProgress {
  const progress = loadUserMissionsProgress(uid);
  progress.quizBattleRoundsCompleted += 1;
  if (score > progress.quizBattleBestScore) {
    progress.quizBattleBestScore = score;
  }
  saveUserMissionsProgress(uid, progress);
  return progress;
}

export function recordBrainChallengeResult(
  uid: string,
  activity: BrainActivityType,
  score: number
): UserMissionsProgress {
  const progress = loadUserMissionsProgress(uid);
  progress.brainChallengesCompleted += 1;
  if (score > (progress.brainBestScores[activity] || 0)) {
    progress.brainBestScores[activity] = score;
  }
  saveUserMissionsProgress(uid, progress);
  return progress;
}

/**
 * Computes real cosmetic Achievements based strictly on verified user progress.
 * Achievements never generate fake earnings.
 */
export function getUserAchievements(uid: string, streakDays: number): AchievementBadge[] {
  const p = loadUserMissionsProgress(uid);
  return [
    {
      id: 'first_mission',
      title: 'First Mission',
      description: 'Complete your first Daily Fun Mission',
      emoji: '🌟',
      unlocked: p.totalMissionsCompleted >= 1,
    },
    {
      id: 'quiz_explorer',
      title: 'Quiz Explorer',
      description: 'Complete a 5-question Quiz Battle round',
      emoji: '🎯',
      unlocked: p.quizBattleRoundsCompleted >= 1,
    },
    {
      id: 'learning_champion',
      title: 'Learning Champion',
      description: 'Score 4/5 or higher in Quiz Battle',
      emoji: '🏆',
      unlocked: p.quizBattleBestScore >= 4,
    },
    {
      id: 'seven_day_consistency',
      title: 'Seven-Day Consistency',
      description: 'Maintain a 7-day learning streak',
      emoji: '🔥',
      unlocked: streakDays >= 7,
    },
    {
      id: 'brain_champion',
      title: 'Brain Challenge Champion',
      description: 'Complete 3 or more Brain Challenges',
      emoji: '🧠',
      unlocked: p.brainChallengesCompleted >= 3,
    },
  ];
}
