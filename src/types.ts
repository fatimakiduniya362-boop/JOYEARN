export type ThemeKey =
  | 'spring_flower'
  | 'rainbow_valley'
  | 'enchanted_forest'
  | 'sunny_park'
  | 'magical_night'
  | 'rainy_garden'
  | 'snow_village'
  | 'happy_beach'
  | 'cartoon_carnival'
  | 'butterfly_garden'
  | 'candy_world'
  | 'space_adventure'
  | 'teddy_bear'
  | 'royal_gold';

export interface ThemeConfig {
  id: ThemeKey;
  name: string;
  emoji: string;
  gradient: string;
  headerBg: string;
  cardBg: string;
  accent: string;
  accentLight: string;
  textColor: string;
  mascot: string;
  ambientEmoji: string[];
}

export interface ActivityCardItem {
  id: 'watch' | 'learn' | 'play' | 'tasks' | 'invite' | 'wallet' | 'offline' | 'kids' | 'garden' | 'wheel';
  title: string;
  urduTitle?: string;
  subtitle: string;
  badge: string;
  emoji: string;
  color: string;
  lightColor: string;
  borderColor: string;
  pointsHighlight: string;
}

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  confirmationEmailSent?: boolean;
  confirmationSentAt?: string;
  hasAdFree?: boolean;
}

export interface VideoContent {
  id: string;
  title: string;
  category: 'Kids' | 'Education' | 'Cooking' | 'Skills' | 'Crafts' | 'Nature' | 'Stories' | 'Science' | 'Math' | 'Art' | string;
  duration: string;
  points: number;
  author: string;
  thumbnail: string;
  isOffline: boolean;
  fileSize: string;
  summary: string;
  videoUrl?: string;
  approved?: boolean;
}

export interface CustomPlaylist {
  id: string;
  name: string;
  description?: string;
  videoIds: string[];
  createdAt: number;
  emoji?: string;
}

export type QuizCategory =
  | 'Geography'
  | 'Science'
  | 'Math'
  | 'History'
  | 'General Knowledge'
  | 'Sports'
  | 'Technology'
  | 'Language'
  | 'Islamic and Moral Stories'
  | 'Nature'
  | 'Fun Facts'
  | 'English & Vocabulary'
  | 'English & Urdu'
  | 'Simple Science'
  | 'Brain Teaser';

export type DifficultyLevel =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Easy'
  | 'Medium'
  | 'Hard'
  | 'easy'
  | 'medium'
  | 'hard';

export interface QuizItem {
  id: string;
  category: QuizCategory | string;
  question: string;
  urduTranslation?: string;
  urduQuestion?: string;
  options: string[];
  urduOptions?: string[];
  correctIndex?: number;
  correctAnswer?: number;
  points: number;
  fact?: string;
  explanation?: string;
  urduExplanation?: string;
  difficulty?: DifficultyLevel;
}

export interface SponsoredTask {
  id: string;
  title: string;
  category: 'Educational' | 'Health & Safety' | 'Survey' | 'Daily Check-in' | 'Community';
  points: number;
  estTime: string;
  requirements: string;
  completed: boolean;
  sponsorName: string;
}

export interface PerkItem {
  id: string;
  name: string;
  urduName?: string;
  description: string;
  pointsCost: number;
  icon: string;
  category: 'avatar' | 'theme' | 'powerup' | 'badge';
  isUnlocked?: boolean;
}

export interface InAppProduct {
  id: string;
  title: string;
  description: string;
  priceUsd: string;
  rawPrice: number;
  icon: string;
  type: 'inapp' | 'subs';
}

export type PaymentMethodType = 'Easypaisa' | 'JazzCash' | 'PayPal' | 'Bank transfer' | 'Gift card';

export interface WithdrawalRequest {
  id: string;
  userUid?: string;
  userName?: string;
  userEmail?: string;
  perkId?: string;
  perkName?: string;
  points: number;
  cashAmount?: number;
  paymentMethod?: PaymentMethodType | string;
  accountDetails?: string;
  accountName?: string;
  date?: string;
  createdAt: string;
  status: 'Pending' | 'Paid' | 'Rejected' | 'Completed';
  notes?: string;
  adminNote?: string;
  processedAt?: string;
}

export interface TransactionRecord {
  id: string;
  title: string;
  type: 'earn' | 'perk' | 'bonus' | 'streak';
  points: number;
  date: string;
  status: 'Completed' | 'Pending';
}

export interface GardenPlant {
  id: number;
  seedType: 'Rose' | 'Sunflower' | 'Tulip' | 'Lavender' | 'Daisy' | 'Apple Tree';
  emoji: string;
  growthStage: number; // 0: seed, 1: sprout, 2: flower
  waterCount: number;
  unlockedAt: string;
}

export interface ReferralUser {
  id: string;
  name: string;
  joinDate: string;
  activitiesCompleted: number;
  bonusAwarded: boolean;
  pointsEarned: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  urduTitle: string;
  emoji: string;
  description: string;
  thresholdDescription: string;
  category: 'learning' | 'tasks' | 'social' | 'streak' | 'general';
  isUnlocked: boolean;
  currentValue: number;
  targetValue: number;
  unlockedDate?: string;
}

export interface TopEarner {
  rank: number;
  name: string;
  urduName?: string;
  avatar: string;
  points: number;
  badge: string;
  urduBadge?: string;
  city: string;
  streakDays: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface AppSettings {
  seniorMode: boolean;
  soundEnabled: boolean;
  volume: number;
  theme: ThemeKey;
  notificationsEnabled: boolean;
  hapticsEnabled: boolean;
  language: 'en' | 'ur';
}

export interface SponsorAd {
  id: string;
  sponsorName: string;
  imageUrl: string;
  title: string;
  shortText: string;
  destinationLink: string; // must be https://
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  package?: string; // Starter, Basic, Standard, Premium, Mega
  packageImpressions?: number;
  packageMinDays?: number;
  languageTarget?: 'English' | 'Urdu' | 'both';
  paid?: 'yes' | 'no';
  amountPaid?: number; // amount paid in USD
  impressions?: number;
  clicks?: number;
  createdAt?: string;
}

export interface SponsorEnquiry {
  id: string;
  userId: string;
  businessName: string;
  websiteLink: string;
  email: string;
  phone?: string;
  message: string;
  package?: string;
  languageOption?: 'English' | 'Urdu' | 'both';
  createdAt?: any;
  status: 'new' | 'contacted';
}

export interface QuizLeaderboardPlayer {
  rank: number;
  name: string;
  avatar: string;
  country: string;
  flag: string;
  accuracy: number; // e.g. 98%
  avgSpeedSeconds: number; // e.g. 3.2s
  quizzesCompleted: number;
  totalPointsEarned: number;
  favoriteCategory: string;
  speedRankBadge: string;
  isCurrentUser?: boolean;
}
