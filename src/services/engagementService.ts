/**
 * JoyEarn Engagement Service
 * - LocalStorage-first persistence with write-once-per-action Firestore sync
 * - Zero fake data, zero fake countdowns, zero fake winners, zero earnings promises
 * - Covers: Levels & Cosmetic Badges, Streak Shield (max 2), Knowledge Cards Album,
 *   Daily Themes, 30-Day Mini Courses + Canvas Certificate, Weekly Challenge Leaderboard
 *   (first names only, top 20, 1h cache), Share My Result Canvas card, Event Quizzes,
 *   and Daily + Streak-at-Risk Reminder preferences.
 */

import { doc, setDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirestoreDB } from './firestoreService';
import { soundService } from './soundService';

// ============================================================================
// 1. LEVELS & COSMETIC BADGES (No extra points — purely cosmetic)
// ============================================================================

export interface LevelInfo {
  id: string;
  name: string;
  emoji: string;
  minPoints: number;
  nextMinPoints: number | null;
  colorClass: string;
}

export const LEVELS: LevelInfo[] = [
  { id: 'beginner', name: 'Beginner', emoji: '🌱', minPoints: 0, nextMinPoints: 250, colorClass: 'from-emerald-400 to-teal-500' },
  { id: 'explorer', name: 'Explorer', emoji: '🧭', minPoints: 250, nextMinPoints: 750, colorClass: 'from-sky-400 to-blue-500' },
  { id: 'learner', name: 'Learner', emoji: '📘', minPoints: 750, nextMinPoints: 2000, colorClass: 'from-indigo-400 to-purple-500' },
  { id: 'scholar', name: 'Scholar', emoji: '🎓', minPoints: 2000, nextMinPoints: 5000, colorClass: 'from-purple-500 to-pink-500' },
  { id: 'mentor', name: 'Mentor', emoji: '🌟', minPoints: 5000, nextMinPoints: 10000, colorClass: 'from-amber-400 to-orange-500' },
  { id: 'master', name: 'Master', emoji: '👑', minPoints: 10000, nextMinPoints: null, colorClass: 'from-rose-500 to-amber-500' },
];

export function getLevelForPoints(totalPoints: number): {
  current: LevelInfo;
  next: LevelInfo | null;
  progressPercent: number;
  pointsToNext: number;
} {
  const safePts = Math.max(0, totalPoints);
  let currentIdx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (safePts >= LEVELS[i].minPoints) {
      currentIdx = i;
    }
  }
  const current = LEVELS[currentIdx];
  const next = currentIdx < LEVELS.length - 1 ? LEVELS[currentIdx + 1] : null;
  if (!next) {
    return { current, next: null, progressPercent: 100, pointsToNext: 0 };
  }
  const span = next.minPoints - current.minPoints;
  const gained = safePts - current.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
  return {
    current,
    next,
    progressPercent,
    pointsToNext: Math.max(0, next.minPoints - safePts),
  };
}

export interface CosmeticBadge {
  id: string;
  title: string;
  emoji: string;
  category: 'streak' | 'categories' | 'quizzes';
  requirement: string;
  unlocked: boolean;
}

export function getCosmeticBadges(stats: {
  streakDays: number;
  finishedCategoriesCount: number;
  quizzesCompletedCount: number;
}): CosmeticBadge[] {
  const { streakDays, finishedCategoriesCount, quizzesCompletedCount } = stats;
  return [
    // Streak badges
    { id: 'streak_3', title: '3-Day Spark', emoji: '🔥', category: 'streak', requirement: '3-day streak', unlocked: streakDays >= 3 },
    { id: 'streak_7', title: '7-Day Flame', emoji: '⚡', category: 'streak', requirement: '7-day streak', unlocked: streakDays >= 7 },
    { id: 'streak_14', title: '14-Day Comet', emoji: '🌠', category: 'streak', requirement: '14-day streak', unlocked: streakDays >= 14 },
    { id: 'streak_30', title: '30-Day Sun', emoji: '☀️', category: 'streak', requirement: '30-day streak', unlocked: streakDays >= 30 },
    // Category badges
    { id: 'cat_1', title: 'First Topic', emoji: '🗂️', category: 'categories', requirement: 'Finish 1 quiz category', unlocked: finishedCategoriesCount >= 1 },
    { id: 'cat_3', title: 'Topic Collector', emoji: '📚', category: 'categories', requirement: 'Finish 3 quiz categories', unlocked: finishedCategoriesCount >= 3 },
    { id: 'cat_5', title: 'Polymath', emoji: '🧠', category: 'categories', requirement: 'Finish 5 quiz categories', unlocked: finishedCategoriesCount >= 5 },
    // Quiz badges
    { id: 'quiz_1', title: 'First Answer', emoji: '✅', category: 'quizzes', requirement: 'Complete 1 quiz', unlocked: quizzesCompletedCount >= 1 },
    { id: 'quiz_10', title: 'Quiz Enthusiast', emoji: '🏅', category: 'quizzes', requirement: 'Complete 10 quizzes', unlocked: quizzesCompletedCount >= 10 },
    { id: 'quiz_25', title: 'Quiz Champion', emoji: '🏆', category: 'quizzes', requirement: 'Complete 25 quizzes', unlocked: quizzesCompletedCount >= 25 },
    { id: 'quiz_50', title: 'Quiz Legend', emoji: '👑', category: 'quizzes', requirement: 'Complete 50 quizzes', unlocked: quizzesCompletedCount >= 50 },
  ];
}

// ============================================================================
// 2. STREAK SHIELD (Earned at 7-day streak, max 2 stored)
// ============================================================================

export interface StreakShieldState {
  shields: number; // 0..2
  lastEarnedMilestone: number; // e.g., 7, 14, 21...
  lastUsedDate: string | null; // YYYY-MM-DD
  protectedDate: string | null; // YYYY-MM-DD saved by shield
}

const MAX_STREAK_SHIELDS = 2;

function getShieldKey(uid: string): string {
  return `joyearn_streak_shield_${uid || 'local'}`;
}

export function loadStreakShieldState(uid: string): StreakShieldState {
  try {
    const raw = localStorage.getItem(getShieldKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        shields: Math.min(MAX_STREAK_SHIELDS, Math.max(0, Number(parsed.shields) || 0)),
        lastEarnedMilestone: Number(parsed.lastEarnedMilestone) || 0,
        lastUsedDate: parsed.lastUsedDate || null,
        protectedDate: parsed.protectedDate || null,
      };
    }
  } catch {}
  return { shields: 0, lastEarnedMilestone: 0, lastUsedDate: null, protectedDate: null };
}

export function syncStreakShieldEarnings(uid: string, currentStreak: number): {
  state: StreakShieldState;
  earnedNow: boolean;
} {
  const state = loadStreakShieldState(uid);
  const currentMilestone = Math.floor(currentStreak / 7) * 7;
  if (currentMilestone >= 7 && currentMilestone > state.lastEarnedMilestone) {
    const nextState: StreakShieldState = {
      ...state,
      shields: Math.min(MAX_STREAK_SHIELDS, state.shields + 1),
      lastEarnedMilestone: currentMilestone,
    };
    saveStreakShieldState(uid, nextState);
    writeEngagementActionOnce(uid, `shield_earned_${currentMilestone}`, {
      streakShields: nextState.shields,
      lastShieldMilestone: currentMilestone,
    });
    return { state: nextState, earnedNow: nextState.shields > state.shields };
  }
  return { state, earnedNow: false };
}

function saveStreakShieldState(uid: string, state: StreakShieldState): void {
  try {
    localStorage.setItem(getShieldKey(uid), JSON.stringify(state));
  } catch {}
}

export function useStreakShield(uid: string): {
  success: boolean;
  message: string;
  state: StreakShieldState;
} {
  const state = loadStreakShieldState(uid);
  const todayStr = new Date().toISOString().slice(0, 10);

  if (state.shields <= 0) {
    return {
      success: false,
      message: 'No Streak Shield stored. Reach a 7-day streak to earn a shield (max 2 stored).',
      state,
    };
  }
  if (state.lastUsedDate === todayStr) {
    return {
      success: false,
      message: 'You already used a Streak Shield today. Your streak is protected!',
      state,
    };
  }

  const nextState: StreakShieldState = {
    ...state,
    shields: Math.max(0, state.shields - 1),
    lastUsedDate: todayStr,
    protectedDate: todayStr,
  };
  saveStreakShieldState(uid, nextState);
  try {
    localStorage.setItem('joyearn_last_active_date', todayStr);
  } catch {}
  writeEngagementActionOnce(uid, `shield_used_${todayStr}`, {
    streakShields: nextState.shields,
    lastShieldUsedDate: todayStr,
  });

  return {
    success: true,
    message: 'Streak Shield activated! Your missed day has been saved.',
    state: nextState,
  };
}

// ============================================================================
// 3. KNOWLEDGE CARDS ALBUM (Animals, Plants, Dishes, Facts)
// ============================================================================

export type KnowledgeSetId = 'animals' | 'plants' | 'dishes' | 'facts';

export interface KnowledgeCard {
  id: string;
  setId: KnowledgeSetId;
  title: string;
  emoji: string;
  fact: string;
  categoryTrigger: string; // quiz category keyword that unlocks this card
}

export interface KnowledgeSetInfo {
  id: KnowledgeSetId;
  title: string;
  emoji: string;
  accent: string;
  description: string;
}

export const KNOWLEDGE_SETS: KnowledgeSetInfo[] = [
  { id: 'animals', title: 'Animals', emoji: '🦁', accent: 'from-amber-500 to-orange-500', description: 'Wildlife & creatures of Earth' },
  { id: 'plants', title: 'Plants', emoji: '🌿', accent: 'from-emerald-500 to-green-600', description: 'Trees, herbs & flowers' },
  { id: 'dishes', title: 'Dishes', emoji: '🍲', accent: 'from-rose-500 to-pink-600', description: 'Wholesome family cuisine' },
  { id: 'facts', title: 'Facts', emoji: '💡', accent: 'from-indigo-500 to-violet-600', description: 'Science, space & history gems' },
];

export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  // Animals
  { id: 'card_ani_1', setId: 'animals', title: 'Snow Leopard', emoji: '🐆', fact: 'Snow leopards use their long tails for balance on steep mountain cliffs.', categoryTrigger: 'nature' },
  { id: 'card_ani_2', setId: 'animals', title: 'Honeybee', emoji: '🐝', fact: 'Honeybees communicate flower directions through a figure-eight waggle dance.', categoryTrigger: 'science' },
  { id: 'card_ani_3', setId: 'animals', title: 'Sea Turtle', emoji: '🐢', fact: 'Sea turtles navigate thousands of miles using Earth’s magnetic field.', categoryTrigger: 'biology' },
  { id: 'card_ani_4', setId: 'animals', title: 'Markhor', emoji: '🐐', fact: 'The Markhor is a mountain wild goat known for its majestic spiral horns.', categoryTrigger: 'animals' },
  // Plants
  { id: 'card_plt_1', setId: 'plants', title: 'Sunflower', emoji: '🌻', fact: 'Young sunflowers track the sun across the sky from east to west each day.', categoryTrigger: 'nature' },
  { id: 'card_plt_2', setId: 'plants', title: 'Aloe Vera', emoji: '🪴', fact: 'Aloe vera stores water in thick gel-filled leaves to thrive in dry climates.', categoryTrigger: 'health' },
  { id: 'card_plt_3', setId: 'plants', title: 'Bamboo', emoji: '🎋', fact: 'Bamboo is technically a giant grass and can grow up to 90 cm in a single day.', categoryTrigger: 'science' },
  { id: 'card_plt_4', setId: 'plants', title: 'Mint Leaf', emoji: '🌱', fact: 'Mint spreads quickly and grows happily in small sunny kitchen pots.', categoryTrigger: 'gardening' },
  // Dishes
  { id: 'card_dsh_1', setId: 'dishes', title: 'Spiced Lentil Dal', emoji: '🍲', fact: 'Lentils are rich in plant protein, fiber, and iron for everyday family meals.', categoryTrigger: 'cooking' },
  { id: 'card_dsh_2', setId: 'dishes', title: 'Fresh Fruit Chaat', emoji: '🥗', fact: 'Mixing seasonal fruits with citrus juice preserves vitamin C and bright flavor.', categoryTrigger: 'health' },
  { id: 'card_dsh_3', setId: 'dishes', title: 'Whole-Wheat Roti', emoji: '🫓', fact: 'Whole-wheat flatbread provides slow-release energy and dietary fiber.', categoryTrigger: 'life' },
  { id: 'card_dsh_4', setId: 'dishes', title: 'Warm Cardamom Tea', emoji: '🍵', fact: 'Green cardamom pods are aromatic seeds prized in kitchens for centuries.', categoryTrigger: 'general' },
  // Facts
  { id: 'card_fct_1', setId: 'facts', title: 'Speed of Light', emoji: '✨', fact: 'Sunlight takes about 8 minutes and 20 seconds to travel from the Sun to Earth.', categoryTrigger: 'science' },
  { id: 'card_fct_2', setId: 'facts', title: 'Water Cycle', emoji: '💧', fact: 'The same water on Earth has been cycling through oceans, clouds, and rain for billions of years.', categoryTrigger: 'geography' },
  { id: 'card_fct_3', setId: 'facts', title: 'Human Heart', emoji: '❤️', fact: 'Your heart beats around 100,000 times every single day without resting.', categoryTrigger: 'math' },
  { id: 'card_fct_4', setId: 'facts', title: 'Great Library', emoji: '📜', fact: 'Sharing knowledge freely has connected learners across cultures for thousands of years.', categoryTrigger: 'history' },
];

function getCardsKey(uid: string): string {
  return `joyearn_knowledge_cards_${uid || 'local'}`;
}

export function loadUnlockedCardIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(getCardsKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function loadFinishedCategories(uid: string): string[] {
  try {
    const raw = localStorage.getItem(`joyearn_finished_quiz_cats_${uid || 'local'}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Unlocks the next locked Knowledge Card matching a completed quiz category.
 * LocalStorage first; writes to Firestore once per unlocked card.
 */
export function unlockKnowledgeCardForCategory(
  uid: string,
  quizCategory: string
): {
  unlockedCard: KnowledgeCard | null;
  completedSet: KnowledgeSetInfo | null;
  allUnlockedIds: string[];
} {
  const unlocked = loadUnlockedCardIds(uid);
  const finishedCats = loadFinishedCategories(uid);
  const normCat = (quizCategory || 'general').toLowerCase().trim();

  if (normCat && !finishedCats.includes(normCat)) {
    const nextCats = [...finishedCats, normCat];
    try {
      localStorage.setItem(`joyearn_finished_quiz_cats_${uid || 'local'}`, JSON.stringify(nextCats));
    } catch {}
  }

  // Find a locked card whose trigger matches the category, or fallback to next locked card
  const lockedCards = KNOWLEDGE_CARDS.filter((c) => !unlocked.includes(c.id));
  if (lockedCards.length === 0) {
    return { unlockedCard: null, completedSet: null, allUnlockedIds: unlocked };
  }

  const matched =
    lockedCards.find((c) => normCat.includes(c.categoryTrigger) || c.categoryTrigger.includes(normCat)) ||
    lockedCards[0];

  const nextUnlocked = [...unlocked, matched.id];
  try {
    localStorage.setItem(getCardsKey(uid), JSON.stringify(nextUnlocked));
  } catch {}

  // Check if this card completed its entire set
  const setCards = KNOWLEDGE_CARDS.filter((c) => c.setId === matched.setId);
  const isSetFinished = setCards.every((c) => nextUnlocked.includes(c.id));
  const completedSet = isSetFinished ? KNOWLEDGE_SETS.find((s) => s.id === matched.setId) || null : null;

  writeEngagementActionOnce(uid, `card_unlock_${matched.id}`, {
    unlockedKnowledgeCards: nextUnlocked,
  });

  return { unlockedCard: matched, completedSet, allUnlockedIds: nextUnlocked };
}

// ============================================================================
// 4. DAILY THEMES (Monday through Sunday)
// ============================================================================

export interface DailyThemeInfo {
  dayIndex: number; // 0 = Sun, 1 = Mon, ... 6 = Sat
  dayName: string;
  title: string;
  urduTitle: string;
  emoji: string;
  tip: string;
  urduTip: string;
  suggestedCategory: string;
  gradient: string;
}

export const DAILY_THEMES: DailyThemeInfo[] = [
  {
    dayIndex: 0,
    dayName: 'Sunday',
    title: 'Family Day',
    urduTitle: 'خاندانی دن',
    emoji: '👨‍👩‍👧‍👦',
    tip: 'Take a 5-question quiz together at the table and share one thing you learned this week.',
    urduTip: 'خاندان کے ساتھ مل کر ۵ سوالات کا کوئز حل کریں اور اس ہفتے کی اچھی باتیں شیئر کریں۔',
    suggestedCategory: 'General',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    dayIndex: 1,
    dayName: 'Monday',
    title: 'Cooking Day',
    urduTitle: 'کوکنگ ڈے',
    emoji: '🍳',
    tip: 'Prep and wash ingredients before turning on the stove—clean prep saves time and keeps cooking safe.',
    urduTip: 'چولہا جلانے سے پہلے تمام اجزاء دھو کر تیار رکھیں، اس سے وقت بچتا ہے اور صفائی رہتی ہے۔',
    suggestedCategory: 'Cooking',
    gradient: 'from-orange-500 to-amber-500',
  },
  {
    dayIndex: 2,
    dayName: 'Tuesday',
    title: 'Gardening Day',
    urduTitle: 'باغبانی کا دن',
    emoji: '🌱',
    tip: 'Water potted plants in the early morning so roots absorb moisture before midday heat.',
    urduTip: 'پودوں کو صبح سویرے پانی دیں تاکہ دھوپ تیز ہونے سے پہلے جڑیں نمی جذب کر لیں۔',
    suggestedCategory: 'Nature',
    gradient: 'from-emerald-500 to-green-600',
  },
  {
    dayIndex: 3,
    dayName: 'Wednesday',
    title: 'Science Day',
    urduTitle: 'سائنس ڈے',
    emoji: '🔬',
    tip: 'Curiosity builds knowledge: ask "why does this happen?" about one everyday thing today.',
    urduTip: 'تجسس علم کی کنجی ہے: آج روزمرہ کی کسی ایک چیز کے بارے میں "یہ کیسے ہوتا ہے؟" جانیں۔',
    suggestedCategory: 'Science',
    gradient: 'from-indigo-500 to-blue-600',
  },
  {
    dayIndex: 4,
    dayName: 'Thursday',
    title: 'Nature Day',
    urduTitle: 'فطرت کا دن',
    emoji: '🌿',
    tip: 'Step outside for 5 minutes, notice the sky and local birds, and protect green spaces around you.',
    urduTip: 'پانچ منٹ کھلی فضا میں گزاریں، پرندوں اور درختوں کا مشاہدہ کریں اور صفائی کا خیال رکھیں۔',
    suggestedCategory: 'Nature',
    gradient: 'from-teal-500 to-emerald-600',
  },
  {
    dayIndex: 5,
    dayName: 'Friday',
    title: 'Life Skills Day',
    urduTitle: 'عملی مہارتوں کا دن',
    emoji: '🧭',
    tip: 'Write down your top 3 priorities for the day before checking messages—small habits build calm.',
    urduTip: 'دن کے آغاز میں اپنے تین اہم کام لکھ لیں، چھوٹی عادتیں زندگی کو منظم بناتی ہیں۔',
    suggestedCategory: 'General',
    gradient: 'from-sky-500 to-indigo-600',
  },
  {
    dayIndex: 6,
    dayName: 'Saturday',
    title: 'Fun Facts Day',
    urduTitle: 'دلچسپ حقائق کا دن',
    emoji: '💡',
    tip: 'Did you know? Honey never spoils when stored sealed—archaeologists found 3,000-year-old edible honey!',
    urduTip: 'کیا آپ جانتے ہیں؟ خالص شہد بند برتن میں کبھی خراب نہیں ہوتا!',
    suggestedCategory: 'Science',
    gradient: 'from-purple-500 to-fuchsia-600',
  },
];

export function getTodayTheme(): DailyThemeInfo {
  const day = new Date().getDay(); // 0..6
  return DAILY_THEMES[day] || DAILY_THEMES[0];
}

// ============================================================================
// 5. 30-DAY MINI COURSES + FINAL QUIZ + CANVAS CERTIFICATE
// ============================================================================

export interface MiniCourseLesson {
  day: number;
  title: string;
  summary: string;
}

export interface MiniCourseQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface MiniCourse {
  id: string;
  title: string;
  emoji: string;
  accent: string;
  description: string;
  lessons: MiniCourseLesson[];
  finalQuiz: MiniCourseQuestion[];
}

function build30Lessons(coreTitles: [string, string][]): MiniCourseLesson[] {
  return Array.from({ length: 30 }, (_, idx) => {
    const pair = coreTitles[idx % coreTitles.length];
    return {
      day: idx + 1,
      title: `Day ${idx + 1}: ${pair[0]}`,
      summary: pair[1],
    };
  });
}

export const MINI_COURSES: MiniCourse[] = [
  {
    id: 'kitchen_basics',
    title: 'Kitchen Basics',
    emoji: '🍳',
    accent: 'from-orange-500 to-rose-500',
    description: '30 practical daily lessons on safe food prep, spices, boiling, nutrition & clean kitchen habits.',
    lessons: build30Lessons([
      ['Clean Hands & Prep Space', 'Wash hands for 20 seconds and keep separate cutting boards for raw and cooked foods.'],
      ['Safe Knife Grip', 'Curl your fingertips inward ("claw grip") while holding vegetables steady.'],
      ['Understanding Heat Levels', 'Use low heat for simmering lentils, medium for sautéing onions, and high only for boiling water.'],
      ['Balancing Salt & Spices', 'Add salt gradually and taste near the end so flavors stay balanced and healthy.'],
      ['Storing Fresh Herbs', 'Wrap washed mint or coriander lightly in a damp paper towel inside a container.'],
      ['Smart Leftover Storage', 'Cool cooked food briefly and refrigerate within 2 hours in airtight containers.'],
      ['Measuring Without Guesswork', 'Level off dry spoons and read liquid cups at eye level for consistent cooking.'],
      ['Healthy Oil Habits', 'Avoid overheating oil until it smokes; measure oil by the spoon instead of pouring freely.'],
      ['Quick Lentil Soaking', 'Soaking lentils for 20–30 minutes cuts cooking time and improves digestion.'],
      ['Kitchen Fire Safety', 'Keep towels away from open flames and never pour water on a hot oil pan—cover with a lid.'],
    ]),
    finalQuiz: [
      { question: 'How long should you wash your hands before food prep?', options: ['5 seconds', '20 seconds', '1 second', 'Only after cooking'], correctIndex: 1 },
      { question: 'What should you NEVER pour on a hot oil pan fire?', options: ['Cover with a metal lid', 'Turn off the heat', 'Water', 'Baking soda'], correctIndex: 2 },
      { question: 'Why is soaking lentils before cooking helpful?', options: ['Makes them bitter', 'Cuts cooking time & aids digestion', 'Removes all protein', 'Freezes them'], correctIndex: 1 },
      { question: 'How soon should cooked leftovers be refrigerated?', options: ['Within 2 hours', 'After 24 hours', 'After 3 days', 'Never'], correctIndex: 0 },
      { question: 'What is the safest finger position when chopping vegetables?', options: ['Flat fingers extended', 'Claw grip with curled fingertips', 'Holding the blade', 'Eyes closed'], correctIndex: 1 },
    ],
  },
  {
    id: 'home_garden',
    title: 'Home Garden',
    emoji: '🪴',
    accent: 'from-emerald-500 to-teal-600',
    description: '30 easy daily lessons to grow herbs, flowers & vegetables in pots, balconies, or small yards.',
    lessons: build30Lessons([
      ['Choosing the Right Pot', 'Always pick pots with bottom drainage holes so excess water never rots the roots.'],
      ['Sunlight Mapping', 'Observe which window or balcony gets 4–6 hours of gentle morning sun.'],
      ['Healthy Potting Soil', 'Mix light potting soil with compost so roots get both air and nutrients.'],
      ['Finger-Test Watering', 'Press a finger 2 cm into soil; water only when the top layer feels dry.'],
      ['Growing Kitchen Mint', 'Mint cuttings root easily in water and thrive in partial shade.'],
      ['Starting Tomato Seeds', 'Plant seeds shallowly, keep soil lightly misted, and give seedlings bright light.'],
      ['Homemade Peel Compost', 'Fruit peels, eggshells, and tea leaves turn into rich organic plant food.'],
      ['Gentle Pruning', 'Trim yellowing leaves with clean scissors so the plant sends energy to new shoots.'],
      ['Natural Pest Care', 'Check the underside of leaves weekly and rinse away dusty pests with plain water.'],
      ['Harvesting Herbs Often', 'Pinch top stems of basil and mint to encourage fuller, bushier growth.'],
    ]),
    finalQuiz: [
      { question: 'Why do plant pots need drainage holes at the bottom?', options: ['To let roots dry instantly', 'To prevent waterlogging and root rot', 'For decoration only', 'To block sunlight'], correctIndex: 1 },
      { question: 'What is the best time of day to water most plants?', options: ['Early morning', 'Hottest midday noon', 'Never', 'With boiling water'], correctIndex: 0 },
      { question: 'How can you tell if a potted plant needs water?', options: ['Guess every hour', 'Touch the top 2 cm of soil', 'Shake the plant', 'Wait until all leaves fall'], correctIndex: 1 },
      { question: 'Which kitchen scraps are great for home compost?', options: ['Plastic bags', 'Fruit peels & eggshells', 'Batteries', 'Glass'], correctIndex: 1 },
      { question: 'What happens when you pinch the top stems of mint or basil?', options: ['The plant stops growing forever', 'It grows fuller and bushier', 'It turns blue', 'Nothing'], correctIndex: 1 },
    ],
  },
  {
    id: 'healthy_habits',
    title: 'Healthy Habits',
    emoji: '💚',
    accent: 'from-sky-500 to-indigo-600',
    description: '30 sustainable daily lessons for hydration, restful sleep, posture, mindful breaks & family wellness.',
    lessons: build30Lessons([
      ['Morning Water Glass', 'Start the day with a glass of clean water to refresh focus and energy.'],
      ['20-20-20 Eye Rule', 'Every 20 minutes on a screen, look 20 feet away for 20 seconds to relax your eyes.'],
      ['10-Minute Daily Walk', 'A short brisk walk after a meal supports digestion and lifts mood naturally.'],
      ['Consistent Sleep Window', 'Going to bed around the same hour each night helps your body recover deeply.'],
      ['Balanced Plate Habit', 'Aim to fill half your plate with colorful vegetables and fruits when possible.'],
      ['Posture Check', 'Relax your shoulders and keep screens near eye level to protect your neck.'],
      ['Deep Breathing Reset', 'Inhale slowly for 4 seconds, pause, and exhale for 6 seconds to calm stress.'],
      ['Limiting Late Caffeine', 'Switch to warm water or herbal tea in the evening for better sleep quality.'],
      ['Gratitude Reflection', 'Name one small good moment before bed to train a positive, peaceful mind.'],
      ['Family Screen-Free Meal', 'Enjoy at least one meal a day without phones to connect with loved ones.'],
    ]),
    finalQuiz: [
      { question: 'In the 20-20-20 eye rule, how long should you look 20 feet away?', options: ['2 seconds', '20 seconds', '20 minutes', '1 hour'], correctIndex: 1 },
      { question: 'What is a gentle way to start your morning hydration?', options: ['Skip water all day', 'Drink a glass of clean water', 'Only drink soda', 'Drink salt water'], correctIndex: 1 },
      { question: 'Which habit supports deeper, more restful sleep?', options: ['Consistent bedtime schedule', 'Bright screens at 2 AM', 'Heavy caffeine at midnight', 'Irregular naps all evening'], correctIndex: 0 },
      { question: 'What is a simple benefit of a 10-minute walk after eating?', options: ['Causes eye strain', 'Supports digestion and mood', 'Replaces all sleep', 'Stops breathing'], correctIndex: 1 },
      { question: 'How does slow deep breathing help during a busy day?', options: ['Increases stress', 'Calms the nervous system', 'Dehydrates you', 'None of these'], correctIndex: 1 },
    ],
  },
];

export interface CourseProgress {
  completedDays: number[]; // 1..30
  finalQuizPassed: boolean;
  certificateIssuedAt: string | null;
}

function getCourseKey(uid: string): string {
  return `joyearn_mini_courses_${uid || 'local'}`;
}

export function loadAllCourseProgress(uid: string): Record<string, CourseProgress> {
  try {
    const raw = localStorage.getItem(getCourseKey(uid));
    if (raw) {
      return JSON.parse(raw) || {};
    }
  } catch {}
  return {};
}

export function markCourseLessonComplete(
  uid: string,
  courseId: string,
  day: number
): { progress: CourseProgress; newlyCompleted: boolean } {
  const all = loadAllCourseProgress(uid);
  const current: CourseProgress = all[courseId] || {
    completedDays: [],
    finalQuizPassed: false,
    certificateIssuedAt: null,
  };

  if (current.completedDays.includes(day)) {
    return { progress: current, newlyCompleted: false };
  }

  const next: CourseProgress = {
    ...current,
    completedDays: [...current.completedDays, day].sort((a, b) => a - b),
  };
  all[courseId] = next;
  try {
    localStorage.setItem(getCourseKey(uid), JSON.stringify(all));
  } catch {}

  writeEngagementActionOnce(uid, `course_${courseId}_day_${day}`, {
    [`courseProgress.${courseId}`]: next,
  });

  return { progress: next, newlyCompleted: true };
}

export function markCourseFinalQuizPassed(uid: string, courseId: string): CourseProgress {
  const all = loadAllCourseProgress(uid);
  const current: CourseProgress = all[courseId] || {
    completedDays: [],
    finalQuizPassed: false,
    certificateIssuedAt: null,
  };

  const next: CourseProgress = {
    ...current,
    finalQuizPassed: true,
    certificateIssuedAt: current.certificateIssuedAt || new Date().toISOString().slice(0, 10),
  };
  all[courseId] = next;
  try {
    localStorage.setItem(getCourseKey(uid), JSON.stringify(all));
  } catch {}

  writeEngagementActionOnce(uid, `course_${courseId}_cert`, {
    [`courseProgress.${courseId}`]: next,
  });

  return next;
}

/**
 * Generates a 1200x850 Canvas Certificate PNG and shares it via Web Share API (with download fallback).
 */
export async function shareCourseCertificate(params: {
  courseTitle: string;
  courseEmoji: string;
  userName: string;
  completedDate: string;
}): Promise<{ success: boolean; message: string }> {
  const { courseTitle, courseEmoji, userName, completedDate } = params;
  const firstName = getFirstNameOnly(userName);

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 850;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, message: 'Canvas unavailable.' };

  // Rich parchment-cream & royal gold certificate background
  const bg = ctx.createLinearGradient(0, 0, 1200, 850);
  bg.addColorStop(0, '#fffbeb');
  bg.addColorStop(0.5, '#ffffff');
  bg.addColorStop(1, '#fef3c7');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1200, 850);

  // Double gold borders
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 14;
  ctx.strokeRect(28, 28, 1144, 794);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.strokeRect(48, 48, 1104, 754);

  // Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b45309';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('JOYEARN LEARNING ACADEMY', 600, 125);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 58px serif';
  ctx.fillText('Certificate of Completion', 600, 210);

  ctx.font = '72px serif';
  ctx.fillText(courseEmoji, 600, 305);

  ctx.fillStyle = '#475569';
  ctx.font = '600 24px sans-serif';
  ctx.fillText('This certifies that', 600, 370);

  ctx.fillStyle = '#be123c';
  ctx.font = '900 56px sans-serif';
  ctx.fillText(firstName, 600, 445);

  // Decorative divider
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(350, 475);
  ctx.lineTo(850, 475);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = '600 24px sans-serif';
  ctx.fillText('has successfully completed the 30-Day Mini Course', 600, 535);

  ctx.fillStyle = '#0f172a';
  ctx.font = '900 42px sans-serif';
  ctx.fillText(courseTitle, 600, 600);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Completed on ${completedDate}  •  JoyEarn Family Learning`, 600, 725);

  return shareCanvasBlob(
    canvas,
    `joyearn-certificate-${courseTitle.toLowerCase().replace(/\s+/g, '-')}.png`,
    `Certificate: ${courseTitle}`,
    `${firstName} completed the ${courseTitle} 30-Day Mini Course on JoyEarn!`
  );
}

// ============================================================================
// 6. WEEKLY CHALLENGE LEADERBOARD (Resets weekly, first names only, top 20, 1h cache)
// ============================================================================

export interface WeeklyLeaderboardEntry {
  uid: string;
  firstName: string;
  weeklyPoints: number;
  rank: number;
}

export function getCurrentISOWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getFirstNameOnly(fullName?: string | null): string {
  const clean = (fullName || '').trim();
  if (!clean) return 'Learner';
  return clean.split(/\s+/)[0].slice(0, 18);
}

export function getLocalWeeklyPoints(uid: string): number {
  const weekKey = getCurrentISOWeekKey();
  try {
    const raw = localStorage.getItem(`joyearn_weekly_pts_${uid || 'local'}_${weekKey}`);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

/**
 * Adds real earned points to the user's current week score in localStorage,
 * and writes once per action to Firestore `weekly_challenges/{weekKey}/entries/{uid}`.
 */
export function recordWeeklyChallengeActivity(
  uid: string,
  displayName: string | null | undefined,
  pointsDelta: number,
  actionKey: string
): number {
  if (!uid || pointsDelta <= 0) return getLocalWeeklyPoints(uid);
  const weekKey = getCurrentISOWeekKey();
  const dedupeKey = `joyearn_weekly_action_${uid}_${weekKey}_${actionKey}`;
  try {
    if (localStorage.getItem(dedupeKey) === '1') {
      return getLocalWeeklyPoints(uid);
    }
    localStorage.setItem(dedupeKey, '1');
  } catch {}

  const nextTotal = getLocalWeeklyPoints(uid) + pointsDelta;
  try {
    localStorage.setItem(`joyearn_weekly_pts_${uid}_${weekKey}`, String(nextTotal));
  } catch {}

  const db = getFirestoreDB();
  if (db) {
    const entryRef = doc(db, 'weekly_challenges', weekKey, 'entries', uid);
    setDoc(
      entryRef,
      {
        uid,
        firstName: getFirstNameOnly(displayName),
        weeklyPoints: nextTotal,
        weekKey,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch(() => {
      // Offline-safe: stays saved locally
    });
  }

  return nextTotal;
}

const WEEKLY_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

export async function fetchWeeklyLeaderboard(forceRefresh = false): Promise<{
  weekKey: string;
  entries: WeeklyLeaderboardEntry[];
  fromCache: boolean;
}> {
  const weekKey = getCurrentISOWeekKey();
  const cacheKey = `joyearn_weekly_lb_cache_${weekKey}`;
  const timeKey = `joyearn_weekly_lb_time_${weekKey}`;

  if (!forceRefresh) {
    try {
      const ts = parseInt(localStorage.getItem(timeKey) || '0', 10);
      if (Date.now() - ts < WEEKLY_CACHE_TTL_MS) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          return { weekKey, entries: JSON.parse(cached), fromCache: true };
        }
      }
    } catch {}
  }

  const db = getFirestoreDB();
  if (!db) {
    return { weekKey, entries: [], fromCache: true };
  }

  try {
    const entriesRef = collection(db, 'weekly_challenges', weekKey, 'entries');
    const q = query(entriesRef, orderBy('weeklyPoints', 'desc'), limit(20));
    const snap = await getDocs(q);
    const list: WeeklyLeaderboardEntry[] = [];
    let rank = 1;
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      list.push({
        uid: docSnap.id,
        firstName: getFirstNameOnly(d.firstName || 'Learner'),
        weeklyPoints: typeof d.weeklyPoints === 'number' ? d.weeklyPoints : 0,
        rank: rank++,
      });
    });

    try {
      localStorage.setItem(cacheKey, JSON.stringify(list));
      localStorage.setItem(timeKey, String(Date.now()));
    } catch {}

    return { weekKey, entries: list, fromCache: false };
  } catch {
    // Offline fallback to any cached list
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return { weekKey, entries: JSON.parse(cached), fromCache: true };
    } catch {}
    return { weekKey, entries: [], fromCache: true };
  }
}

// ============================================================================
// 7. SHARE MY RESULT (Canvas Image + Web Share API after each quiz)
// ============================================================================

export async function shareQuizResultCard(params: {
  quizTitle: string;
  score: number;
  total: number;
  userName: string;
  streakDays: number;
  levelName: string;
}): Promise<{ success: boolean; message: string }> {
  const { quizTitle, score, total, userName, streakDays, levelName } = params;
  const firstName = getFirstNameOnly(userName);

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, message: 'Canvas unavailable.' };

  const bg = ctx.createLinearGradient(0, 0, 1080, 1080);
  bg.addColorStop(0, '#0f172a');
  bg.addColorStop(0.5, '#312e81');
  bg.addColorStop(1, '#831843');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, 1008, 1008);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('JOYEARN QUIZ RESULT', 540, 130);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px sans-serif';
  ctx.fillText(quizTitle.slice(0, 34), 540, 215);

  // Score circle
  ctx.beginPath();
  ctx.arc(540, 440, 165, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#34d399';
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = '900 110px sans-serif';
  ctx.fillText(`${score}/${total}`, 540, 465);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('CORRECT ANSWERS', 540, 530);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px sans-serif';
  ctx.fillText(`${firstName}  •  ${levelName}`, 540, 705);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`🔥 ${streakDays}-Day Learning Streak`, 540, 770);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 22px sans-serif';
  ctx.fillText('JoyEarn — Safe Family Learning & Quizzes', 540, 965);

  return shareCanvasBlob(
    canvas,
    `joyearn-quiz-result-${Date.now()}.png`,
    `My JoyEarn Quiz Result: ${score}/${total}`,
    `${firstName} scored ${score}/${total} on "${quizTitle}" in JoyEarn!`
  );
}

async function shareCanvasBlob(
  canvas: HTMLCanvasElement,
  fileName: string,
  title: string,
  text: string
): Promise<{ success: boolean; message: string }> {
  try {
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Image creation failed'))), 'image/png');
    });

    const file = new File([blob], fileName, { type: 'image/png' });
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title, text });
      soundService.playFanfare();
      return { success: true, message: 'Shared successfully!' };
    }

    // Download fallback
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);

    soundService.playFanfare();
    return { success: true, message: 'Image saved to your device!' };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { success: false, message: 'Share cancelled.' };
    }
    return { success: false, message: 'Could not share image right now.' };
  }
}

// ============================================================================
// 8. EVENT QUIZZES (Ramadan, Eid, Independence Day, New Year)
// ============================================================================

export interface EventQuizPack {
  id: string;
  title: string;
  emoji: string;
  seasonLabel: string;
  accent: string;
  questions: MiniCourseQuestion[];
}

export const EVENT_QUIZZES: EventQuizPack[] = [
  {
    id: 'event_ramadan',
    title: 'Ramadan Quiz',
    emoji: '🌙',
    seasonLabel: 'Special Event',
    accent: 'from-indigo-600 to-purple-700',
    questions: [
      { question: 'What is the pre-dawn meal eaten before fasting begins in Ramadan called?', options: ['Iftar', 'Suhoor (Sehri)', 'Walima', 'Aqiqah'], correctIndex: 1 },
      { question: 'Which fruit is traditionally eaten to break the fast at sunset?', options: ['Dates', 'Pineapple', 'Coconut', 'Durian'], correctIndex: 0 },
      { question: 'Ramadan is which month of the Islamic lunar calendar?', options: ['First', 'Fifth', 'Ninth', 'Twelfth'], correctIndex: 2 },
      { question: 'What is the meal eaten at sunset to break the fast called?', options: ['Iftar', 'Suhoor', 'Brunch', 'Supper'], correctIndex: 0 },
      { question: 'Which value is especially encouraged throughout Ramadan?', options: ['Generosity & charity', 'Wasting food', 'Anger', 'Impatience'], correctIndex: 0 },
    ],
  },
  {
    id: 'event_eid',
    title: 'Eid Celebration Quiz',
    emoji: '✨',
    seasonLabel: 'Special Event',
    accent: 'from-emerald-500 to-teal-600',
    questions: [
      { question: 'Which Eid marks the joyful completion of the month of Ramadan?', options: ['Eid-ul-Fitr', 'Eid-ul-Adha', 'Spring Festival', 'Harvest Day'], correctIndex: 0 },
      { question: 'What is a warm traditional greeting shared on Eid?', options: ['Eid Mubarak', 'Happy Monday', 'Good Night', 'See You Later'], correctIndex: 0 },
      { question: 'What sweet vermicelli dish is famously prepared on Eid-ul-Fitr?', options: ['Sheer Khurma', 'Tomato Soup', 'Garlic Bread', 'Caesar Salad'], correctIndex: 0 },
      { question: 'What is Zakat-ul-Fitr given for before Eid prayer?', options: ['So everyone in need can also celebrate Eid', 'Buying toys only', 'Paying phone bills', 'Decorating streets'], correctIndex: 0 },
      { question: 'What is the custom of elders gifting small envelopes to children on Eid called?', options: ['Eidi', 'Homework', 'Rent', 'Ticket'], correctIndex: 0 },
    ],
  },
  {
    id: 'event_independence',
    title: 'Independence Day Quiz',
    emoji: '🎆',
    seasonLabel: 'Special Event',
    accent: 'from-green-600 to-emerald-700',
    questions: [
      { question: 'On which date is Pakistan Independence Day celebrated every year?', options: ['14 August', '23 March', '1 January', '25 December'], correctIndex: 0 },
      { question: 'Which two colors appear on the national flag of Pakistan?', options: ['Green and White', 'Red and Blue', 'Yellow and Black', 'Orange and Purple'], correctIndex: 0 },
      { question: 'What do the crescent and star on the flag symbolize?', options: ['Progress and light/knowledge', 'Winter and snow', 'Rivers and deserts', 'Mountains only'], correctIndex: 0 },
      { question: 'What is the national flower of Pakistan?', options: ['Jasmine (Chambeli)', 'Tulip', 'Cactus', 'Dandelion'], correctIndex: 0 },
      { question: 'How can families celebrate Independence Day responsibly?', options: ['Planting trees & keeping neighborhoods clean', 'Littering streets', 'Loud unsafe fireworks near homes', 'Wasting water'], correctIndex: 0 },
    ],
  },
  {
    id: 'event_newyear',
    title: 'New Year Quiz',
    emoji: '🎊',
    seasonLabel: 'Special Event',
    accent: 'from-amber-500 to-rose-500',
    questions: [
      { question: 'How many days are in a regular Gregorian calendar year?', options: ['360', '365', '350', '400'], correctIndex: 1 },
      { question: 'How many days are in a leap year?', options: ['364', '365', '366', '367'], correctIndex: 2 },
      { question: 'Which month gains an extra day during a leap year?', options: ['January', 'February', 'July', 'December'], correctIndex: 1 },
      { question: 'What makes a New Year learning goal easiest to keep?', options: ['Small consistent daily steps', 'Doing everything in one night', 'Never writing it down', 'Skipping rest'], correctIndex: 0 },
      { question: 'How many months are in one full year?', options: ['10', '12', '14', '8'], correctIndex: 1 },
    ],
  },
];

export function getCompletedEventQuizIds(uid: string): string[] {
  try {
    const raw = localStorage.getItem(`joyearn_event_quizzes_${uid || 'local'}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function markEventQuizCompleted(uid: string, eventId: string, score: number): boolean {
  const done = getCompletedEventQuizIds(uid);
  const isFirstTime = !done.includes(eventId);
  if (isFirstTime) {
    const next = [...done, eventId];
    try {
      localStorage.setItem(`joyearn_event_quizzes_${uid || 'local'}`, JSON.stringify(next));
    } catch {}
    writeEngagementActionOnce(uid, `event_quiz_${eventId}`, {
      completedEventQuizzes: next,
      [`eventQuizScores.${eventId}`]: score,
    });
  }
  return isFirstTime;
}

// ============================================================================
// 9. DAILY & STREAK-AT-RISK REMINDER PREFERENCES
// ============================================================================

export interface ReminderPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM
  streakRiskReminderEnabled: boolean;
}

export function loadReminderPrefs(): ReminderPrefs {
  try {
    return {
      dailyReminderEnabled: localStorage.getItem('joyearn_daily_reminder_enabled') === 'true',
      dailyReminderTime: localStorage.getItem('joyearn_daily_reminder_time') || '09:00',
      streakRiskReminderEnabled: localStorage.getItem('joyearn_streak_risk_reminder_enabled') !== 'false',
    };
  } catch {
    return { dailyReminderEnabled: false, dailyReminderTime: '09:00', streakRiskReminderEnabled: true };
  }
}

export function saveReminderPrefs(prefs: ReminderPrefs, uid?: string): void {
  try {
    localStorage.setItem('joyearn_daily_reminder_enabled', String(prefs.dailyReminderEnabled));
    localStorage.setItem('joyearn_daily_reminder_time', prefs.dailyReminderTime);
    localStorage.setItem('joyearn_streak_risk_reminder_enabled', String(prefs.streakRiskReminderEnabled));
  } catch {}
  if (uid) {
    writeEngagementActionOnce(uid, `reminder_prefs_${prefs.dailyReminderEnabled}_${prefs.dailyReminderTime}_${prefs.streakRiskReminderEnabled}`, {
      reminderPrefs: prefs,
    });
  }
}

// ============================================================================
// INTERNAL: WRITE-ONCE-PER-ACTION FIRESTORE SYNC
// ============================================================================

function writeEngagementActionOnce(uid: string, actionId: string, payload: Record<string, unknown>): void {
  if (!uid) return;
  const sentKey = `joyearn_fs_once_${uid}_${actionId}`;
  try {
    if (localStorage.getItem(sentKey) === '1') return;
    localStorage.setItem(sentKey, '1');
  } catch {}

  const db = getFirestoreDB();
  if (!db) return;

  const userRef = doc(db, 'users', uid);
  setDoc(
    userRef,
    {
      ...payload,
      engagementUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  ).catch(() => {
    // Offline-safe: local state remains authoritative
  });
}
