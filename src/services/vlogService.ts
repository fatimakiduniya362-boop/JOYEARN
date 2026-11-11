// ============================================================================
// 📹 JOYEARN VLOGS SERVICE (YOUTUBE-EMBEDDED COMMUNITY SHARING & MODERATION)
// ============================================================================

import { getFirestoreDB, isQuotaOrResourceExhausted, notifyServerBusy } from './firestoreService';
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
  writeBatch
} from 'firebase/firestore';

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
  title: string; // max 80 characters
  description: string; // max 300 characters
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

// Fallback curated seed vlogs (Family-friendly YouTube links)
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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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

const DEFAULT_CATEGORY_THUMBNAILS: Record<VlogCategory, string> = {
  cooking: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
  gardening: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
  'home and family': 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80',
  health: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=600&auto=format&fit=crop&q=80',
  nature: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&auto=format&fit=crop&q=80',
  learning: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&auto=format&fit=crop&q=80',
  travel: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&auto=format&fit=crop&q=80',
  'funny and wholesome': 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=600&auto=format&fit=crop&q=80',
  other: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&auto=format&fit=crop&q=80',
};

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
 * SUBMIT VLOG:
 * Enforces:
 * - YouTube link completely optional
 * - Native video upload & in-app camera recording
 * - Strict Community Safety Guidelines (no vulgarity/adult content)
 * - Max 2 submissions per day & max 5 pending vlogs at once
 * - Default status 'pending' for safety moderation before public visibility
 */
export async function submitVlog(data: {
  uid: string;
  creatorName: string;
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
}): Promise<{ success: boolean; vlog?: VlogItem; error?: string }> {
  // 1. Check daily limit (max 2)
  if (getSubmissionsCountToday() >= 2) {
    return {
      success: false,
      error: 'Daily limit reached: You can submit at most 2 vlogs per day. Please return tomorrow!',
    };
  }

  // 2. Check pending limit (max 5 at once)
  const userExisting = await getUserVlogs(data.uid);
  const pendingCount = userExisting.filter((v) => v.status === 'pending').length;
  if (pendingCount >= 5) {
    return {
      success: false,
      error: 'Pending limit reached: You currently have 5 vlogs awaiting safety review. Please wait for them to be reviewed.',
    };
  }

  // 3. Strict Community Safety Guidelines Check
  const safety = checkVlogContentSafety(data.title, data.description);
  if (!safety.isSafe) {
    return {
      success: false,
      error: safety.flaggedReason,
    };
  }

  // 4. Video Source Check: YouTube link is optional, but user must provide either native video or YouTube link
  const cleanVideoId = data.videoId ? data.videoId.trim() : '';
  const hasYouTube = cleanVideoId.length === 11;
  const hasNativeVideo = Boolean(data.videoBlob || data.nativeMediaId);

  if (!hasYouTube && !hasNativeVideo) {
    return {
      success: false,
      error: 'Please select a video from your gallery, record with your camera, or enter an optional YouTube link.',
    };
  }

  const cleanTitle = data.title.trim().slice(0, 80);
  const cleanDesc = data.description.trim().slice(0, 300);
  const cleanCreator = data.creatorName.trim().slice(0, 80) || 'Community Learner';
  const vlogId = `vlog_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const mediaId = data.nativeMediaId || (hasNativeVideo ? `native_${vlogId}` : undefined);

  // If videoBlob passed, save into persistent IndexedDB storage
  let localBlobUrl: string | undefined = undefined;
  if (data.videoBlob && mediaId) {
    try {
      await saveVideoBlob(mediaId, data.videoBlob, data.videoBlob.type);
      localBlobUrl = URL.createObjectURL(data.videoBlob);
    } catch (e) {
      console.warn('Could not persist video blob to IndexedDB:', e);
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

  const newVlog: VlogItem = {
    id: vlogId,
    uid: data.uid,
    creatorName: cleanCreator,
    title: cleanTitle,
    description: cleanDesc,
    category: data.category,
    videoId: hasYouTube ? cleanVideoId : undefined,
    videoType,
    nativeMediaId: mediaId,
    videoUrl: localBlobUrl || data.videoUrl,
    thumbnail,
    duration: data.duration,
    isShort: data.isShort,
    fileSizeMb: data.fileSizeMb,
    status: 'pending',
    reportCount: 0,
    createdAt: new Date().toISOString(),
  };

  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'vlogs', vlogId);
      // Strip in-memory blob URLs before Firestore save
      const { videoUrl, ...firestoreData } = newVlog;
      await setDoc(docRef, {
        ...firestoreData,
        createdAtServer: serverTimestamp(),
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Firestore vlog submission notice (saving locally):', err);
    }
  }

  // Save to local mirror so user sees it in "My Vlogs" immediately with status "Pending review"
  const mirror = getLocalMirrorVlogs();
  mirror.unshift(newVlog);
  saveLocalMirrorVlogs(mirror);

  incrementSubmissionsCountToday();

  // Clear feed cache
  if (typeof window !== 'undefined') {
    localStorage.removeItem(FEED_CACHE_KEY);
    localStorage.removeItem(FEED_CACHE_TIME_KEY);
  }

  return { success: true, vlog: newVlog };
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
          if (Array.isArray(list)) return list;
        }
      }
    } catch {}
  }

  const blocked = getBlockedCreators();
  let vlogs: VlogItem[] = [];

  const db = getFirestoreDB();
  if (db) {
    try {
      const q = query(
        collection(db, 'vlogs'),
        where('status', '==', 'approved'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const item = d.data() as VlogItem;
        if (item && item.reportCount < 3 && !blocked.includes(item.uid)) {
          vlogs.push({ ...item, id: d.id });
        }
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Firestore approved vlogs query notice:', err);
    }
  }

  // If Firestore returned fewer than seed, merge local mirror
  if (vlogs.length === 0) {
    const mirror = getLocalMirrorVlogs();
    vlogs = mirror.filter((v) => v.status === 'approved' && v.reportCount < 3 && !blocked.includes(v.uid));
  }

  // Cache locally for 10 minutes
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
// ADMIN WORKFLOW METHODS (fatimakiduniya362@gmail.com)
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
        blockedBy: 'fatimakiduniya362@gmail.com',
      });
    } catch (err: any) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
    }
  }
  return true;
}
