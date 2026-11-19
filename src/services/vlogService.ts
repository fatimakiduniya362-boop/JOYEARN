// ============================================================================
// 📹 JOYEARN VLOGS SERVICE (YOUTUBE-EMBEDDED COMMUNITY SHARING & MODERATION)
// ============================================================================

import { getFirestoreDB, getFirebaseStorage, isQuotaOrResourceExhausted, notifyServerBusy } from './firestoreService';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export type VlogCategory =
  | 'cooking'
  | 'gardening'
  | 'home and family'
  | 'health'
  | 'nature'
  | 'learning'
  | 'travel'
  | 'funny and wholesome'
  | 'other';

export const VLOG_CATEGORIES: { id: VlogCategory; label: string; icon: string }[] = [
  { id: 'cooking', label: 'Cooking & Recipes', icon: '🍳' },
  { id: 'gardening', label: 'Gardening & Plants', icon: '🌱' },
  { id: 'home and family', label: 'Home & Family', icon: '🏡' },
  { id: 'health', label: 'Health & Wellness', icon: '💪' },
  { id: 'nature', label: 'Nature & Animals', icon: '🌿' },
  { id: 'learning', label: 'Learning & Skills', icon: '📚' },
  { id: 'travel', label: 'Travel & Outdoors', icon: '✈️' },
  { id: 'funny and wholesome', label: 'Funny & Wholesome', icon: '😄' },
  { id: 'other', label: 'Other Educational', icon: '✨' },
];

import { saveVideoBlob, getVideoBlobUrl, deleteVideoBlob } from './videoStorageService';

export interface VlogItem {
  id: string;
  uid: string;
  creatorName: string; // Google display name ONLY
  creatorPhotoURL?: string;
  title: string; // max 120 characters
  description: string; // max 400 characters
  category: VlogCategory;
  videoId?: string; // YouTube ID (Completely Optional)
  thumbnail: string;
  status: 'pending' | 'approved' | 'rejected';
  reportCount: number;
  createdAt: string;
  rejectionReason?: string;
  // Native video extensions
  videoType?: 'youtube' | 'upload' | 'recorded';
  nativeMediaId?: string;
  videoUrl?: string;
  duration?: string;
  isShort?: boolean;
  fileSizeMb?: number;
  flaggedForReview?: boolean;
  likeCount?: number;
  commentCount?: number;
  audioTrack?: string;
}

// Strict Banned Keywords for all-ages community protection
export const STRICT_PROHIBITED_KEYWORDS = [
  'nude', 'naked', 'sex', 'sexy', 'erotic', 'porn', 'nsfw', 'adult', 'breast', 'dick', 'pussy',
  'kill', 'murder', 'blood', 'gore', 'suicide', 'death', 'weapon', 'gun', 'violent', 'terror',
  'hate', 'racist', 'gamble', 'casino', 'betting', 'prank', 'tobacco', 'smoke', 'vape', 'alcohol',
  'beer', 'wine', 'drugs', 'weed', 'cocaine', 'curse', 'swear', 'fuck', 'shit', 'bitch', 'ass', 'bastard', 'cunt'
];

export interface VlogSafetyCheckResult {
  isSafe: boolean;
  flaggedReason?: string;
}

export function checkVlogContentSafety(title: string, description: string): VlogSafetyCheckResult {
  const fullText = `${title || ''} ${description || ''}`.toLowerCase();
  for (const word of STRICT_PROHIBITED_KEYWORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(fullText)) {
      return {
        isSafe: false,
        flaggedReason: `Content contains prohibited keyword: "${word}". All Community Vlogs must be 100% family-friendly and free from adult, vulgar, abusive, or inappropriate material.`,
      };
    }
  }
  return { isSafe: true };
}

export type VlogReportReason =
  | 'inappropriate clothing or content'
  | 'offensive language'
  | 'copyright'
  | 'spam'
  | 'other';

export const VLOG_REPORT_REASONS: VlogReportReason[] = [
  'inappropriate clothing or content',
  'offensive language',
  'copyright',
  'spam',
  'other',
];

const FEED_CACHE_KEY = 'joyearn_vlogs_feed_cache';
const FEED_CACHE_TIME_KEY = 'joyearn_vlogs_feed_cache_time';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes local cache
const BLOCKED_CREATORS_KEY = 'joyearn_blocked_creators';
const USER_SUBMISSIONS_TODAY_KEY = 'joyearn_vlog_submissions_today';

function createCategoryPosterSvg(bgStart: string, bgEnd: string, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${bgStart}"/><stop offset="100%" stop-color="${bgEnd}"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" fill-opacity="0.92" font-family="system-ui,sans-serif" font-size="26" font-weight="700">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const DEFAULT_CATEGORY_THUMBNAILS: Record<VlogCategory, string> = {
  cooking: createCategoryPosterSvg('#7c2d12', '#c2410c', 'Cooking & Recipes'),
  gardening: createCategoryPosterSvg('#064e3b', '#047857', 'Gardening & Plants'),
  'home and family': createCategoryPosterSvg('#312e81', '#4338ca', 'Home & Family'),
  health: createCategoryPosterSvg('#0f766e', '#0d9488', 'Health & Wellness'),
  nature: createCategoryPosterSvg('#14532d', '#15803d', 'Nature & Outdoors'),
  learning: createCategoryPosterSvg('#1e3a8a', '#2563eb', 'Learning & Skills'),
  travel: createCategoryPosterSvg('#0c4a6e', '#0284c7', 'Travel & Outdoors'),
  'funny and wholesome': createCategoryPosterSvg('#831843', '#be185d', 'Funny & Wholesome'),
  other: createCategoryPosterSvg('#1e293b', '#334155', 'Community Vlog'),
};

// Fallback curated seed vlogs (Family-friendly verified videos & reels)
const SEED_APPROVED_VLOGS: VlogItem[] = [
  {
    id: 'vlog_seed_1',
    uid: 'system_curated',
    creatorName: 'Amina Family Kitchen',
    title: 'Easy 10-Minute Healthy Vegetable Stir Fry for Family',
    description: 'Quick, wholesome, colorful dinner recipe packed with farm-fresh nutrients and mild spices.',
    category: 'cooking',
    videoId: '4aZy3u0aTVE',
    thumbnail: 'https://i.ytimg.com/vi/4aZy3u0aTVE/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-01T10:00:00.000Z',
  },
  {
    id: 'vlog_seed_2',
    uid: 'system_curated',
    creatorName: 'Green Thumb Tariq',
    title: 'Growing Fresh Mint and Coriander in Small Balcony Pots',
    description: 'Simple steps to start your own indoor kitchen herb garden without any expensive fertilizer.',
    category: 'gardening',
    videoId: '0m3hHZZ76F0',
    thumbnail: 'https://i.ytimg.com/vi/0m3hHZZ76F0/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-02T11:30:00.000Z',
  },
  {
    id: 'vlog_seed_3',
    uid: 'system_curated',
    creatorName: 'Farhan Learning Hub',
    title: 'Mind-Bending Science: How Water Clouds Form in the Sky',
    description: 'A fascinating, kid-friendly look at the water cycle, condensation, and rain formation.',
    category: 'learning',
    videoId: 's0bS-SBAgJI',
    thumbnail: 'https://i.ytimg.com/vi/s0bS-SBAgJI/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-03T14:15:00.000Z',
  },
  {
    id: 'vlog_seed_4',
    uid: 'system_curated',
    creatorName: 'Nature Walk Pakistan',
    title: 'Peaceful Morning Bird Watching in Margalla Hills',
    description: 'Relaxing sounds of nature, native songbirds, and fresh pine forest breeze at sunrise.',
    category: 'nature',
    videoId: '2b9txcAt4e0',
    thumbnail: 'https://i.ytimg.com/vi/2b9txcAt4e0/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-04T09:00:00.000Z',
    duration: '3:15',
    likeCount: 42,
    commentCount: 5,
  },
  {
    id: 'reel_seed_1',
    uid: 'system_curated',
    creatorName: 'Amina Family Kitchen',
    title: '60-Second Mango Mint Cooler Recipe for Hot Days',
    description: 'Blend fresh ripe mango, garden mint leaves, lemon squeeze, and chilled water in under a minute!',
    category: 'cooking',
    videoId: '4aZy3u0aTVE',
    thumbnail: 'https://i.ytimg.com/vi/4aZy3u0aTVE/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-12T10:00:00.000Z',
    duration: '0:48',
    isShort: true,
    likeCount: 128,
    commentCount: 14,
    audioTrack: 'Fresh Kitchen Breeze · Original',
  },
  {
    id: 'reel_seed_2',
    uid: 'system_curated',
    creatorName: 'Green Thumb Tariq',
    title: 'Propagate Mint Stems in Water in Just 30 Seconds',
    description: 'Snip a healthy stem below a leaf node and place it in a sunny windowsill jar.',
    category: 'gardening',
    videoId: '0m3hHZZ76F0',
    thumbnail: 'https://i.ytimg.com/vi/0m3hHZZ76F0/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-13T09:30:00.000Z',
    duration: '0:36',
    isShort: true,
    likeCount: 94,
    commentCount: 9,
    audioTrack: 'Morning Terrace Birds · Original',
  },
  {
    id: 'reel_seed_3',
    uid: 'system_curated',
    creatorName: 'Farhan Learning Hub',
    title: 'Quick Origami Paper Butterfly Fold for Kids',
    description: 'Easy step-by-step colorful origami fold to boost focus and hand-eye coordination.',
    category: 'learning',
    videoId: 's0bS-SBAgJI',
    thumbnail: 'https://i.ytimg.com/vi/s0bS-SBAgJI/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-14T15:20:00.000Z',
    duration: '0:52',
    isShort: true,
    likeCount: 163,
    commentCount: 19,
    audioTrack: 'Acoustic Study Chimes · Original',
  },
  {
    id: 'reel_seed_4',
    uid: 'system_curated',
    creatorName: 'Ayesha Wellness Corner',
    title: '2-Minute Seated Neck & Shoulder Stretch Break',
    description: 'Gentle posture reset you can do between reading or homework sessions.',
    category: 'health',
    videoId: '2b9txcAt4e0',
    thumbnail: 'https://i.ytimg.com/vi/2b9txcAt4e0/hqdefault.jpg',
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T08:10:00.000Z',
    duration: '0:44',
    isShort: true,
    likeCount: 87,
    commentCount: 7,
    audioTrack: 'Calm Breath Rhythm · Original',
  },
  {
    id: 'vlog_seed_5',
    uid: 'system_curated',
    creatorName: 'Green Thumb Tariq',
    title: 'Morning Garden Honeybees & Blooming Sunflowers',
    description: 'Observe how friendly honeybees gather pollen across sunlit garden blossoms and keep backyard herbs thriving.',
    category: 'gardening',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Bees_on_flowers.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.gardening,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T10:00:00.000Z',
    duration: '1:45',
    likeCount: 76,
    commentCount: 8,
  },
  {
    id: 'vlog_seed_6',
    uid: 'system_curated',
    creatorName: 'Farhan Learning Hub',
    title: 'Winter Crystal Science: Watch Soap Bubbles Freeze',
    description: 'Real-time close-up of delicate ice crystals forming delicate feather patterns across a frozen soap film.',
    category: 'learning',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/A_freezing_soap_bubble_in_McGregor%2C_Minnesota.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.learning,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T11:30:00.000Z',
    duration: '2:18',
    likeCount: 112,
    commentCount: 11,
  },
  {
    id: 'vlog_seed_7',
    uid: 'system_curated',
    creatorName: 'Safa Travel Diaries',
    title: 'Historic Village Square & Water Fountain Walk',
    description: 'A calm sightseeing stroll past timeless stone bridges, canal pathways, and traditional village fountains.',
    category: 'travel',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/83/11Fountains_-_Sloten.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.travel,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T12:15:00.000Z',
    duration: '2:50',
    likeCount: 68,
    commentCount: 6,
  },
  {
    id: 'vlog_seed_8',
    uid: 'system_curated',
    creatorName: 'Nature Walk Pakistan',
    title: 'Graceful Black Swans Gliding Across Calm Waters',
    description: 'Peaceful wetland wildlife study observing black swans swimming and foraging naturally at dusk.',
    category: 'nature',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Black_swan_%28Cygnus_atratus%29.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.nature,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T13:40:00.000Z',
    duration: '2:05',
    likeCount: 91,
    commentCount: 9,
  },
  {
    id: 'vlog_seed_9',
    uid: 'system_curated',
    creatorName: 'Zainab Home & Family',
    title: 'Family Documentary Hour: Savannah Lions & Cubs',
    description: 'Wholesome family wildlife viewing showing peaceful pride bonds and social resting behavior in nature.',
    category: 'home and family',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d5/Affectionate_lions.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS['home and family'],
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T15:00:00.000Z',
    duration: '2:40',
    likeCount: 105,
    commentCount: 12,
  },
  {
    id: 'vlog_seed_10',
    uid: 'system_curated',
    creatorName: 'Kids Story Corner',
    title: 'Big Buck Bunny: Forest Friends Animated Adventure',
    description: 'A cheerful open-source family animation celebrating kindness, courage, and woodland teamwork.',
    category: 'funny and wholesome',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS['funny and wholesome'],
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T16:20:00.000Z',
    duration: '4:30',
    likeCount: 184,
    commentCount: 21,
  },
  {
    id: 'vlog_seed_11',
    uid: 'system_curated',
    creatorName: 'Ayesha Wellness Corner',
    title: 'Mindful Breathing & Scenic Mountain Stream Break',
    description: 'Take three calm minutes outdoors watching clear flowing mountain streams and evergreen scenery.',
    category: 'health',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/46/4K_Nature_Cinematography_recorded_with_Nikon_D5300.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.health,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T17:10:00.000Z',
    duration: '3:12',
    likeCount: 79,
    commentCount: 7,
  },
  {
    id: 'vlog_seed_12',
    uid: 'system_curated',
    creatorName: 'Amina Family Kitchen',
    title: 'Weekend Countryside Market & Meadow Farm Tour',
    description: 'Exploring fresh pasture herbs and visiting friendly farm alpacas before preparing dinner.',
    category: 'cooking',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Alpaca_%28Vicugna_pacos%29.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.cooking,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-15T18:30:00.000Z',
    duration: '1:55',
    likeCount: 64,
    commentCount: 5,
  },
  {
    id: 'reel_seed_5',
    uid: 'system_curated',
    creatorName: 'Eco Wonders Studio',
    title: 'Macro Close-Up: Blue-Tailed Damselfly by the Reed',
    description: 'Watch how emerald wetlands shelter iridescent damselflies on sunny afternoons.',
    category: 'nature',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/28/Blue-tailed_Damselfly_%28Ischnura_elegans%29.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.nature,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-16T06:45:00.000Z',
    duration: '0:28',
    isShort: true,
    likeCount: 118,
    commentCount: 10,
    audioTrack: 'Wetland Breeze · Original',
  },
  {
    id: 'reel_seed_6',
    uid: 'system_curated',
    creatorName: 'Science Sparks',
    title: '25-Second Frost Crystal Pattern Magic',
    description: 'Watch freezing temperatures crystallize a single soap bubble before your eyes!',
    category: 'learning',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/88/A_freezing_soap_bubble_in_McGregor%2C_Minnesota.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.learning,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-16T07:15:00.000Z',
    duration: '0:24',
    isShort: true,
    likeCount: 152,
    commentCount: 16,
    audioTrack: 'Winter Chime · Original',
  },
  {
    id: 'reel_seed_7',
    uid: 'system_curated',
    creatorName: 'Safa Travel Diaries',
    title: 'Peaceful Canal Reflections & Moorhen Sighting',
    description: 'Quick 30-second walk beside quiet waterways and gentle waterbirds.',
    category: 'travel',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Common_Moorhen_%28Gallinula_chloropus%29_by_a_canal.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.travel,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-16T08:00:00.000Z',
    duration: '0:32',
    isShort: true,
    likeCount: 73,
    commentCount: 4,
    audioTrack: 'Canal Morning · Original',
  },
  {
    id: 'reel_seed_8',
    uid: 'system_curated',
    creatorName: 'Sunny Meadow Friends',
    title: 'Friendly Meadow Alpaca Saying Hello!',
    description: 'Instant smile break with fluffy pasture alpacas enjoying green grass.',
    category: 'funny and wholesome',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Alpaca_%28Vicugna_pacos%29.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS['funny and wholesome'],
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-16T08:40:00.000Z',
    duration: '0:26',
    isShort: true,
    likeCount: 204,
    commentCount: 23,
    audioTrack: 'Happy Farm Banjo · Original',
  },
  {
    id: 'reel_seed_9',
    uid: 'system_curated',
    creatorName: 'Green Thumb Tariq',
    title: 'Busy Pollinators Helping Garden Herbs Thrive',
    description: 'Why planting marigolds and mint side by side attracts helpful garden bees.',
    category: 'gardening',
    videoType: 'upload',
    videoUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/26/Bees_on_flowers.webm',
    thumbnail: DEFAULT_CATEGORY_THUMBNAILS.gardening,
    status: 'approved',
    reportCount: 0,
    createdAt: '2026-11-16T09:10:00.000Z',
    duration: '0:30',
    isShort: true,
    likeCount: 139,
    commentCount: 11,
    audioTrack: 'Garden Sunbeam · Original',
  },
];

/**
 * Extracts YouTube 11-char ID from any link format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - Raw 11-char ID
 */
export function extractYouTubeVlogId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();

  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;
  const match = str.match(regex);
  return match && match[1] ? match[1] : null;
}

/**
 * Local blocked creators filter management
 */
export function getBlockedCreators(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BLOCKED_CREATORS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function blockCreator(creatorUid: string): void {
  if (typeof window === 'undefined' || !creatorUid) return;
  try {
    const current = getBlockedCreators();
    if (!current.includes(creatorUid)) {
      current.push(creatorUid);
      localStorage.setItem(BLOCKED_CREATORS_KEY, JSON.stringify(current));
    }
  } catch {}
}

export function isCreatorBlocked(creatorUid: string): boolean {
  return getBlockedCreators().includes(creatorUid);
}

/**
 * Check and record daily submissions limit (max 2 per day)
 */
export function getSubmissionsCountToday(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(USER_SUBMISSIONS_TODAY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === today) return parsed.count || 0;
    }
  } catch {}
  return 0;
}

export function incrementSubmissionsCountToday(): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().slice(0, 10);
  const count = getSubmissionsCountToday() + 1;
  try {
    localStorage.setItem(USER_SUBMISSIONS_TODAY_KEY, JSON.stringify({ date: today, count }));
  } catch {}
}

/**
 * Local mirror storage for offline and fast render
 */
const LOCAL_MIRROR_VLOGS_KEY = 'joyearn_local_mirror_vlogs';

function getLocalMirrorVlogs(): VlogItem[] {
  if (typeof window === 'undefined') return SEED_APPROVED_VLOGS;
  try {
    const raw = localStorage.getItem(LOCAL_MIRROR_VLOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const existingIds = new Set(parsed.map((item: VlogItem) => item.id));
        const missingSeeds = SEED_APPROVED_VLOGS.filter((s) => !existingIds.has(s.id));
        return missingSeeds.length > 0 ? [...parsed, ...missingSeeds] : parsed;
      }
    }
  } catch {}
  return SEED_APPROVED_VLOGS;
}

function saveLocalMirrorVlogs(vlogs: VlogItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_MIRROR_VLOGS_KEY, JSON.stringify(vlogs));
  } catch {}
}

/**
 * Resolves an active playable URL for a native or direct vlog
 */
export async function getPlayableVlogUrl(vlog: VlogItem): Promise<string> {
  if (vlog.videoUrl && vlog.videoUrl.startsWith('blob:')) {
    return vlog.videoUrl;
  }
  if (vlog.nativeMediaId) {
    const url = await getVideoBlobUrl(vlog.nativeMediaId);
    if (url) return url;
  }
  return vlog.videoUrl || '';
}

/**
 * Uploads a recorded or gallery-selected video Blob/File to Firebase Cloud Storage
 * and returns its public HTTPS download URL. Reports real upload progress (0..100).
 */
export async function uploadVideoToCloudStorage(
  videoBlob: Blob,
  uid: string,
  vlogId: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const storage = getFirebaseStorage();
  if (!storage) {
    throw new Error('Cloud Storage is not initialized. Please check Firebase configuration.');
  }

  const mime = (videoBlob.type || 'video/mp4').toLowerCase();
  const ext = mime.includes('webm') ? 'webm' : mime.includes('quicktime') || mime.includes('mov') ? 'mov' : 'mp4';
  const fileRef = storageRef(storage, `public_vlogs/${uid}/${vlogId}.${ext}`);

  return new Promise<string>((resolve, reject) => {
    const uploadTask = uploadBytesResumable(fileRef, videoBlob, {
      contentType: videoBlob.type || 'video/mp4',
      cacheControl: 'public, max-age=31536000',
    });

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

/**
 * SUBMIT VLOG:
 * - For recorded camera vlogs and gallery video uploads: uploads real video to Firebase Cloud Storage,
 *   then writes the real download URL, uploader info, caption, and timestamp to Firestore `/vlogs/{vlogId}`.
 * - Never marks a video as published until BOTH Cloud Storage upload and Firestore write succeed.
 * - Enforces community safety guidelines and daily submission limits.
 */
export async function submitVlog(data: {
  uid: string;
  creatorName: string;
  creatorPhotoURL?: string;
  title: string;
  description: string;
  category: VlogCategory;
  videoId?: string;
  videoType?: 'youtube' | 'upload' | 'recorded';
  nativeMediaId?: string;
  videoBlob?: Blob;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
  isShort?: boolean;
  fileSizeMb?: number;
  onUploadProgress?: (percent: number) => void;
}): Promise<{ success: boolean; vlog?: VlogItem; error?: string }> {
  // 0. Require authenticated account for real cloud publishing
  if (!data.uid || data.uid === 'guest') {
    return {
      success: false,
      error: 'Please sign in with your Google account before publishing a video.',
    };
  }

  // 1. Check daily limit (max 5 per day for active creators)
  if (getSubmissionsCountToday() >= 5) {
    return {
      success: false,
      error: 'Daily limit reached: You can publish up to 5 videos per day. Please return tomorrow!',
    };
  }

  // 2. Strict Community Safety Guidelines Check
  const safety = checkVlogContentSafety(data.title, data.description);
  if (!safety.isSafe) {
    return {
      success: false,
      error: safety.flaggedReason,
    };
  }

  // 3. Video Source Check
  const cleanVideoId = data.videoId ? data.videoId.trim() : '';
  const hasYouTube = cleanVideoId.length === 11;
  const hasNativeVideo = Boolean(data.videoBlob || data.nativeMediaId || (data.videoUrl && data.videoUrl.startsWith('https://')));

  if (!hasYouTube && !hasNativeVideo) {
    return {
      success: false,
      error: 'Please record a video with Vlogs camera, select one from Gallery, or enter a valid YouTube link.',
    };
  }

  const cleanTitle = data.title.trim().slice(0, 120) || 'Community Vlog';
  const cleanDesc = (data.description || '').trim().slice(0, 400);
  const cleanCreator = data.creatorName.trim().slice(0, 80) || 'VibeLoom Creator';
  const vlogId = `vlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const mediaId = data.nativeMediaId || (data.videoBlob ? `native_${vlogId}` : undefined);

  // 4. Upload native/recorded video to Firebase Cloud Storage (REAL cloud upload)
  let cloudVideoUrl: string | undefined =
    data.videoUrl && data.videoUrl.startsWith('https://') ? data.videoUrl : undefined;

  if (data.videoBlob) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        success: false,
        error: 'You are currently offline. Please connect to the internet to upload and publish your video.',
      };
    }

    try {
      cloudVideoUrl = await uploadVideoToCloudStorage(
        data.videoBlob,
        data.uid,
        vlogId,
        data.onUploadProgress
      );
    } catch (uploadErr: any) {
      const code = uploadErr?.code || '';
      if (code === 'storage/unauthorized') {
        return {
          success: false,
          error: 'Cloud Storage upload was denied by Firebase Storage rules. Please enable authenticated write access to public_vlogs/ in Firebase Console Storage Rules.',
        };
      }
      return {
        success: false,
        error: `Video upload failed: ${uploadErr?.message || 'Could not upload to cloud storage.'}`,
      };
    }

    // Also cache locally in IndexedDB for instant offline replay by the uploader
    if (mediaId) {
      try {
        await saveVideoBlob(mediaId, data.videoBlob, data.videoBlob.type);
      } catch {
        // Non-blocking local cache
      }
    }
  }

  // Determine thumbnail
  let thumbnail = data.thumbnailUrl || '';
  if (!thumbnail) {
    if (hasYouTube) {
      thumbnail = `https://i.ytimg.com/vi/${cleanVideoId}/hqdefault.jpg`;
    } else {
      thumbnail = DEFAULT_CATEGORY_THUMBNAILS[data.category] || DEFAULT_CATEGORY_THUMBNAILS.other;
    }
  }

  const videoType = data.videoType || (hasYouTube ? 'youtube' : 'upload');
  // Cloud-uploaded videos that passed safety moderation publish immediately to the shared community feed;
  // external YouTube links remain pending admin review.
  const initialStatus: 'approved' | 'pending' = cloudVideoUrl ? 'approved' : 'pending';

  const newVlog: VlogItem = {
    id: vlogId,
    uid: data.uid,
    creatorName: cleanCreator,
    creatorPhotoURL: data.creatorPhotoURL || '',
    title: cleanTitle,
    description: cleanDesc,
    category: data.category,
    videoId: hasYouTube ? cleanVideoId : undefined,
    videoType,
    nativeMediaId: mediaId,
    videoUrl: cloudVideoUrl,
    thumbnail,
    duration: data.duration,
    isShort: data.isShort ?? true,
    fileSizeMb: data.fileSizeMb,
    status: initialStatus,
    reportCount: 0,
    likeCount: 0,
    createdAt: new Date().toISOString(),
  };

  // 5. Persist metadata to Firestore (MUST succeed before reporting published)
  const db = getFirestoreDB();
  if (!db) {
    return {
      success: false,
      error: 'Database is not available. Please check your connection and try again.',
    };
  }

  try {
    const docRef = doc(db, 'vlogs', vlogId);
    // Clean undefined keys before Firestore write
    const firestorePayload: Record<string, any> = {
      id: newVlog.id,
      uid: newVlog.uid,
      creatorName: newVlog.creatorName,
      creatorPhotoURL: newVlog.creatorPhotoURL || '',
      title: newVlog.title,
      description: newVlog.description,
      category: newVlog.category,
      videoType: newVlog.videoType,
      thumbnail: newVlog.thumbnail,
      status: newVlog.status,
      reportCount: 0,
      likeCount: 0,
      isShort: Boolean(newVlog.isShort),
      createdAt: newVlog.createdAt,
      createdAtServer: serverTimestamp(),
    };
    if (cloudVideoUrl) firestorePayload.videoUrl = cloudVideoUrl;
    if (hasYouTube) firestorePayload.videoId = cleanVideoId;
    if (newVlog.duration) firestorePayload.duration = newVlog.duration;
    if (typeof newVlog.fileSizeMb === 'number') firestorePayload.fileSizeMb = newVlog.fileSizeMb;

    await setDoc(docRef, firestorePayload);
  } catch (err: any) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    return {
      success: false,
      error: `Could not save video to community feed: ${err?.message || 'Firestore write failed.'}`,
    };
  }

  // Update local mirror & clear feed cache only AFTER real cloud publish succeeded
  const mirror = getLocalMirrorVlogs();
  mirror.unshift(newVlog);
  saveLocalMirrorVlogs(mirror);

  incrementSubmissionsCountToday();

  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return { success: true, vlog: newVlog };
}

/**
 * REAL SYNCHRONIZED LIKE / UNLIKE:
 * Uses a Firestore transaction on `/vlogs/{vlogId}/likes/{uid}` and `/vlogs/{vlogId}`.
 * Prevents duplicate likes per account and synchronizes real counts across devices.
 */
export async function toggleVlogLike(
  vlogId: string,
  uid: string
): Promise<{ liked: boolean; likeCount: number; error?: string }> {
  if (!uid || uid === 'guest') {
    return { liked: false, likeCount: 0, error: 'Please sign in to like videos.' };
  }
  const db = getFirestoreDB();
  if (!db) {
    return { liked: false, likeCount: 0, error: 'Database unavailable.' };
  }

  const vlogRef = doc(db, 'vlogs', vlogId);
  const likeRef = doc(db, 'vlogs', vlogId, 'likes', uid);

  try {
    const result = await runTransaction(db, async (tx) => {
      const [vlogSnap, likeSnap] = await Promise.all([tx.get(vlogRef), tx.get(likeRef)]);
      if (!vlogSnap.exists()) {
        throw new Error('This video is no longer available in the community feed.');
      }
      const currentLikes = typeof vlogSnap.data()?.likeCount === 'number' ? vlogSnap.data().likeCount : 0;

      if (likeSnap.exists()) {
        const nextCount = Math.max(0, currentLikes - 1);
        tx.delete(likeRef);
        tx.update(vlogRef, { likeCount: nextCount });
        return { liked: false, likeCount: nextCount };
      } else {
        const nextCount = currentLikes + 1;
        tx.set(likeRef, {
          uid,
          createdAt: new Date().toISOString(),
        });
        tx.update(vlogRef, { likeCount: nextCount });
        return { liked: true, likeCount: nextCount };
      }
    });

    // Clear feed cache so next refresh shows updated count
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FEED_CACHE_KEY);
      localStorage.removeItem(FEED_CACHE_TIME_KEY);
    }

    return result;
  } catch (err: any) {
    if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    return {
      liked: false,
      likeCount: 0,
      error: err?.message || 'Could not update like right now.',
    };
  }
}

/**
 * Fetches which of the given vlogIds the signed-in user has liked in Firestore.
 */
export async function getUserLikedVlogIds(uid: string, vlogIds: string[]): Promise<Set<string>> {
  const likedSet = new Set<string>();
  if (!uid || uid === 'guest' || vlogIds.length === 0) return likedSet;
  const db = getFirestoreDB();
  if (!db) return likedSet;

  await Promise.all(
    vlogIds.slice(0, 50).map(async (vlogId) => {
      try {
        const snap = await getDoc(doc(db, 'vlogs', vlogId, 'likes', uid));
        if (snap.exists()) {
          likedSet.add(vlogId);
        }
      } catch {
        // Ignore individual offline/seed read misses
      }
    })
  );
  return likedSet;
}

/**
 * GET APPROVED VLOGS FOR FEED:
 * Cached locally for 10 minutes.
 * Filtered by: status === 'approved', reportCount < 3, creator not blocked.
 */
export async function getApprovedVlogs(forceRefresh = false): Promise<VlogItem[]> {
  const now = Date.now();

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const cacheTime = parseInt(localStorage.getItem(FEED_CACHE_TIME_KEY) || '0', 10);
      if (now - cacheTime < CACHE_TTL_MS) {
        const cached = localStorage.getItem(FEED_CACHE_KEY);
        if (cached) {
          const list: VlogItem[] = JSON.parse(cached);
          if (Array.isArray(list)) {
            const cachedIds = new Set(list.map((v) => v.id));
            const blockedList = getBlockedCreators();
            const missingSeeds = SEED_APPROVED_VLOGS.filter(
              (s) => !cachedIds.has(s.id) && !blockedList.includes(s.uid)
            );
            return missingSeeds.length > 0 ? [...list, ...missingSeeds] : list;
          }
        }
      }
    } catch {}
  }

  const blocked = getBlockedCreators();
  let vlogs: VlogItem[] = [];

  const db = getFirestoreDB();
  if (db) {
    try {
      let snap;
      try {
        const q = query(
          collection(db, 'vlogs'),
          where('status', '==', 'approved'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        snap = await getDocs(q);
      } catch (indexErr: any) {
        // Fallback when composite index (status + createdAt) is not yet created
        const qFallback = query(
          collection(db, 'vlogs'),
          where('status', '==', 'approved'),
          limit(50)
        );
        snap = await getDocs(qFallback);
      }
      snap.forEach((d) => {
        const item = d.data() as VlogItem;
        if (item && (item.reportCount || 0) < 3 && !blocked.includes(item.uid)) {
          vlogs.push({ ...item, id: d.id, likeCount: item.likeCount || 0 });
        }
      });
      vlogs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Firestore approved vlogs query notice:', err);
    }
  }

  // Ensure curated seed reels & vlogs are always available alongside user uploads
  const existingIds = new Set(vlogs.map((v) => v.id));
  if (vlogs.length === 0) {
    const mirror = getLocalMirrorVlogs();
    vlogs = mirror.filter((v) => v.status === 'approved' && v.reportCount < 3 && !blocked.includes(v.uid));
  } else {
    const localApprovedReels = getLocalMirrorVlogs().filter(
      (v) => v.status === 'approved' && v.reportCount < 3 && !blocked.includes(v.uid) && !existingIds.has(v.id)
    );
    vlogs = [...vlogs, ...localApprovedReels];
  }

  // Also ensure any new local approved reels are present when reading cache
  if (typeof window !== 'undefined' && vlogs.length > 0) {
    try {
      localStorage.setItem(FEED_CACHE_KEY, JSON.stringify(vlogs));
      localStorage.setItem(FEED_CACHE_TIME_KEY, String(now));
    } catch {}
  }

  return vlogs;
}

/**
 * GET CREATOR'S OWN VLOGS:
 * Shows pending, approved, and rejected vlogs with rejection reason.
 */
export async function getUserVlogs(uid: string): Promise<VlogItem[]> {
  if (!uid) return [];
  let userVlogs: VlogItem[] = [];

  const db = getFirestoreDB();
  if (db) {
    try {
      const q = query(collection(db, 'vlogs'), where('uid', '==', uid), limit(30));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        userVlogs.push({ ...(d.data() as VlogItem), id: d.id });
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  // Merge local mirror for offline/guest submissions
  const mirror = getLocalMirrorVlogs().filter((v) => v.uid === uid);
  mirror.forEach((m) => {
    if (!userVlogs.some((u) => u.id === m.id)) {
      userVlogs.push(m);
    }
  });

  // Sort newest first
  userVlogs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return userVlogs;
}

/**
 * REPORT VLOG:
 * Increments report count. If reportCount >= 3, automatically hides the vlog.
 */
export async function reportVlog(
  vlogId: string,
  reason: VlogReportReason,
  reporterUid?: string
): Promise<{ success: boolean; autoHidden: boolean }> {
  let autoHidden = false;
  const db = getFirestoreDB();

  if (db) {
    try {
      // 1. Record individual report
      const reportId = `rep_${vlogId}_${Date.now()}`;
      await setDoc(doc(db, 'vlog_reports', reportId), {
        vlogId,
        reason,
        reporterUid: reporterUid || 'anonymous',
        createdAt: new Date().toISOString(),
      });

      // 2. Increment reportCount on vlog doc
      const vlogRef = doc(db, 'vlogs', vlogId);
      const snap = await getDoc(vlogRef);
      if (snap.exists()) {
        const currentCount = snap.data().reportCount || 0;
        const newCount = currentCount + 1;
        await updateDoc(vlogRef, { reportCount: increment(1) });
        if (newCount >= 3) {
          autoHidden = true;
        }
      }
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  // Update local mirror
  const mirror = getLocalMirrorVlogs();
  const target = mirror.find((v) => v.id === vlogId);
  if (target) {
    target.reportCount = (target.reportCount || 0) + 1;
    if (target.reportCount >= 3) {
      autoHidden = true;
    }
    saveLocalMirrorVlogs(mirror);
  }

  // Invalidate feed cache so hidden vlogs disappear immediately
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return { success: true, autoHidden };
}

// ============================================================================
// ADMIN WORKFLOW METHODS (romeelajutt23@gmail.com)
// ============================================================================

export async function getAdminPendingVlogs(): Promise<VlogItem[]> {
  const db = getFirestoreDB();
  let list: VlogItem[] = [];

  if (db) {
    try {
      const q = query(collection(db, 'vlogs'), where('status', '==', 'pending'), limit(50));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        list.push({ ...(d.data() as VlogItem), id: d.id });
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  const mirror = getLocalMirrorVlogs().filter((v) => v.status === 'pending');
  mirror.forEach((m) => {
    if (!list.some((l) => l.id === m.id)) list.push(m);
  });

  return list;
}

export async function getAdminReportedVlogs(): Promise<VlogItem[]> {
  const db = getFirestoreDB();
  let list: VlogItem[] = [];

  if (db) {
    try {
      const q = query(
        collection(db, 'vlogs'),
        where('reportCount', '>', 0),
        orderBy('reportCount', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        list.push({ ...(d.data() as VlogItem), id: d.id });
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  const mirror = getLocalMirrorVlogs().filter((v) => (v.reportCount || 0) > 0);
  mirror.forEach((m) => {
    if (!list.some((l) => l.id === m.id)) list.push(m);
  });

  list.sort((a, b) => (b.reportCount || 0) - (a.reportCount || 0));
  return list;
}

export async function approveVlog(vlogId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (db) {
    try {
      await updateDoc(doc(db, 'vlogs', vlogId), {
        status: 'approved',
        reportCount: 0, // reset on approval
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  const mirror = getLocalMirrorVlogs();
  const target = mirror.find((v) => v.id === vlogId);
  if (target) {
    target.status = 'approved';
    target.reportCount = 0;
    saveLocalMirrorVlogs(mirror);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return true;
}

export async function rejectVlog(vlogId: string, reason: string): Promise<boolean> {
  const cleanReason = reason.trim() || 'Content did not meet family-friendly guidelines.';
  const db = getFirestoreDB();
  if (db) {
    try {
      await updateDoc(doc(db, 'vlogs', vlogId), {
        status: 'rejected',
        rejectionReason: cleanReason,
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  const mirror = getLocalMirrorVlogs();
  const target = mirror.find((v) => v.id === vlogId);
  if (target) {
    target.status = 'rejected';
    target.rejectionReason = cleanReason;
    saveLocalMirrorVlogs(mirror);
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return true;
}

export async function deleteVlog(vlogId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (db) {
    try {
      await deleteDoc(doc(db, 'vlogs', vlogId));
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }

  const mirror = getLocalMirrorVlogs().filter((v) => v.id !== vlogId);
  saveLocalMirrorVlogs(mirror);

  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return true;
}

export async function blockCreatorGlobally(creatorUid: string): Promise<boolean> {
  blockCreator(creatorUid);
  const db = getFirestoreDB();
  if (db) {
    try {
      await setDoc(doc(db, 'blocked_creators', creatorUid), {
        blockedAt: new Date().toISOString(),
        blockedBy: 'romeelajutt23@gmail.com',
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }
  return true;
}

// ============================================================================
// REELS ENGAGEMENT, SAFETY-FILTERED COMMENTS & WATCH REWARDS
// ============================================================================

export interface ReelComment {
  id: string;
  vlogId: string;
  uid: string;
  authorName: string;
  text: string;
  createdAt: string;
}

const LIKED_REELS_PREFIX = 'joyearn_liked_reels_';
const SAVED_REELS_PREFIX = 'joyearn_saved_reels_';
const REEL_LIKE_COUNTS_KEY = 'joyearn_reel_like_counts';
const REEL_COMMENTS_KEY = 'joyearn_reel_comments_map';
const REEL_REWARDS_PREFIX = 'joyearn_reel_watch_rewards_';
export const MAX_DAILY_REEL_WATCH_REWARDS = 5;
export const REEL_WATCH_BONUS_POINTS = 5;

const SEED_REEL_COMMENTS: Record<string, ReelComment[]> = {
  reel_seed_1: [
    {
      id: 'rc_seed_1',
      vlogId: 'reel_seed_1',
      uid: 'seed_user_1',
      authorName: 'Sana Tariq',
      text: 'Tried this with fresh pudina leaves from our pot — super refreshing!',
      createdAt: '2026-11-12T12:10:00.000Z',
    },
  ],
  reel_seed_3: [
    {
      id: 'rc_seed_2',
      vlogId: 'reel_seed_3',
      uid: 'seed_user_2',
      authorName: 'Bilal Ahmad',
      text: 'My younger sister folded three colorful butterflies after watching this reel.',
      createdAt: '2026-11-14T16:40:00.000Z',
    },
  ],
};

export function getLikedReelIds(uid?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LIKED_REELS_PREFIX}${uid || 'guest'}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getReelLikeCountsMap(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REEL_LIKE_COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getEffectiveReelLikeCount(vlog: VlogItem): number {
  const counts = getReelLikeCountsMap();
  if (typeof counts[vlog.id] === 'number') {
    return counts[vlog.id];
  }
  return vlog.likeCount || 0;
}

export function toggleReelLike(
  vlog: VlogItem,
  uid?: string | null
): { liked: boolean; count: number } {
  const safeUid = uid || 'guest';
  const likedIds = getLikedReelIds(safeUid);
  const currentlyLiked = likedIds.includes(vlog.id);
  const currentCount = getEffectiveReelLikeCount(vlog);

  const nextLiked = !currentlyLiked;
  const nextIds = nextLiked
    ? Array.from(new Set([...likedIds, vlog.id]))
    : likedIds.filter((id) => id !== vlog.id);
  const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${LIKED_REELS_PREFIX}${safeUid}`, JSON.stringify(nextIds));
      const counts = getReelLikeCountsMap();
      counts[vlog.id] = nextCount;
      localStorage.setItem(REEL_LIKE_COUNTS_KEY, JSON.stringify(counts));
    } catch {}
  }

  return { liked: nextLiked, count: nextCount };
}

export function getSavedReelIds(uid?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${SAVED_REELS_PREFIX}${uid || 'guest'}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleReelSave(vlogId: string, uid?: string | null): boolean {
  const safeUid = uid || 'guest';
  const saved = getSavedReelIds(safeUid);
  const isSaved = saved.includes(vlogId);
  const nextSaved = !isSaved;
  const nextIds = nextSaved
    ? Array.from(new Set([...saved, vlogId]))
    : saved.filter((id) => id !== vlogId);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${SAVED_REELS_PREFIX}${safeUid}`, JSON.stringify(nextIds));
    } catch {}
  }
  return nextSaved;
}

export function getReelComments(vlogId: string): ReelComment[] {
  if (typeof window === 'undefined') return SEED_REEL_COMMENTS[vlogId] || [];
  try {
    const raw = localStorage.getItem(REEL_COMMENTS_KEY);
    const map: Record<string, ReelComment[]> = raw ? JSON.parse(raw) : {};
    const localList = Array.isArray(map[vlogId]) ? map[vlogId] : [];
    const seeds = SEED_REEL_COMMENTS[vlogId] || [];
    const seen = new Set(localList.map((c) => c.id));
    return [...localList, ...seeds.filter((s) => !seen.has(s.id))];
  } catch {
    return SEED_REEL_COMMENTS[vlogId] || [];
  }
}

export function addReelComment(
  vlogId: string,
  uid: string,
  authorName: string,
  text: string
): { success: boolean; comment?: ReelComment; error?: string } {
  const cleanText = text.trim().slice(0, 220);
  if (!cleanText) {
    return { success: false, error: 'Please write a comment before posting.' };
  }

  const safety = checkVlogContentSafety(cleanText, '');
  if (!safety.isSafe) {
    return {
      success: false,
      error: 'Comment blocked by Family Safety Guidelines. Please keep comments respectful and all-ages friendly.',
    };
  }

  const newComment: ReelComment = {
    id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    vlogId,
    uid,
    authorName: authorName.trim().slice(0, 40) || 'Learner',
    text: cleanText,
    createdAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(REEL_COMMENTS_KEY);
      const map: Record<string, ReelComment[]> = raw ? JSON.parse(raw) : {};
      const existing = Array.isArray(map[vlogId]) ? map[vlogId] : [];
      map[vlogId] = [newComment, ...existing].slice(0, 60);
      localStorage.setItem(REEL_COMMENTS_KEY, JSON.stringify(map));
    } catch {}
  }

  return { success: true, comment: newComment };
}

export function getReelsRewardedToday(uid?: string | null): string[] {
  if (typeof window === 'undefined') return [];
  const todayStr = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(`${REEL_REWARDS_PREFIX}${uid || 'guest'}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.date === todayStr && Array.isArray(parsed.ids)) {
        return parsed.ids;
      }
    }
  } catch {}
  return [];
}

export function recordReelWatchReward(
  vlogId: string,
  uid?: string | null
): { awarded: boolean; countToday: number } {
  const todayStr = new Date().toISOString().slice(0, 10);
  const safeUid = uid || 'guest';
  const ids = getReelsRewardedToday(safeUid);
  if (ids.includes(vlogId) || ids.length >= MAX_DAILY_REEL_WATCH_REWARDS) {
    return { awarded: false, countToday: ids.length };
  }
  const nextIds = [...ids, vlogId];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(
        `${REEL_REWARDS_PREFIX}${safeUid}`,
        JSON.stringify({ date: todayStr, ids: nextIds })
      );
    } catch {}
  }
  return { awarded: true, countToday: nextIds.length };
}

