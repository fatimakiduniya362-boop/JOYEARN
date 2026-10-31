import { AdminVideo, VideoContent } from '../types';
export type { AdminVideo };
import { getFirestoreDB, isQuotaOrResourceExhausted, notifyServerBusy } from './firestoreService';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ALL_VIDEOS } from '../data/videos';

const MERGED_VIDEOS_CACHE_KEY = 'joyearn_merged_videos_cache';
const MERGED_VIDEOS_CACHE_TIME_KEY = 'joyearn_merged_videos_cache_time';
const MERGED_VIDEOS_CACHE_TTL = 60 * 60 * 1000; // 1-hour local cache

const LOCAL_ADMIN_VIDEOS_KEY = 'joyearn_local_admin_videos';

/**
 * Extracts YouTube 11-character video ID from any standard link format:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 * - Or raw 11-character ID (alphanumeric, -, _)
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();

  // Raw 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // Regex covering watch?v=, youtu.be/, /embed/, /shorts/, /v/
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/|youtube-nocookie\.com\/embed\/)([a-zA-Z0-9_-]{11})/i;
  const match = str.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

export interface ParsedBulkVideoResult {
  lineIndex: number;
  category: string;
  title: string;
  rawLink: string;
  videoId: string | null;
  thumbnail: string;
  videoUrl: string;
  isValid: boolean;
  error?: string;
}

/**
 * Parses multi-line bulk input in format:
 * category | title | YouTube link
 * One video per line.
 */
export function parseBulkVideoLines(text: string): ParsedBulkVideoResult[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const results: ParsedBulkVideoResult[] = [];

  lines.forEach((rawLine, index) => {
    const trimmed = rawLine.trim();
    if (!trimmed) return; // Skip empty lines

    const parts = trimmed.split('|').map((p) => p.trim());
    const lineIndex = index + 1;

    if (parts.length < 3) {
      results.push({
        lineIndex,
        category: parts[0] || '',
        title: parts[1] || '',
        rawLink: parts[2] || '',
        videoId: null,
        thumbnail: '',
        videoUrl: '',
        isValid: false,
        error: 'Expected format: category | title | YouTube link',
      });
      return;
    }

    const [category, title, link] = parts;

    if (!category) {
      results.push({
        lineIndex,
        category: '',
        title,
        rawLink: link,
        videoId: null,
        thumbnail: '',
        videoUrl: '',
        isValid: false,
        error: 'Missing category',
      });
      return;
    }

    if (!title) {
      results.push({
        lineIndex,
        category,
        title: '',
        rawLink: link,
        videoId: null,
        thumbnail: '',
        videoUrl: '',
        isValid: false,
        error: 'Missing video title',
      });
      return;
    }

    const videoId = extractYouTubeId(link);
    if (!videoId) {
      results.push({
        lineIndex,
        category,
        title,
        rawLink: link,
        videoId: null,
        thumbnail: '',
        videoUrl: '',
        isValid: false,
        error: 'Could not extract valid 11-character YouTube video ID',
      });
      return;
    }

    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const videoUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;

    results.push({
      lineIndex,
      category,
      title,
      rawLink: link,
      videoId,
      thumbnail,
      videoUrl,
      isValid: true,
    });
  });

  return results;
}

/**
 * Reads all videos stored in Firestore collection 'videos' with local mirror fallback
 */
export async function loadAllFirestoreVideos(): Promise<AdminVideo[]> {
  const db = getFirestoreDB();
  const list: AdminVideo[] = [];

  if (db) {
    try {
      const colRef = collection(db, 'videos');
      const q = query(colRef, orderBy('order', 'asc'));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || 'Educational Video',
          category: data.category || 'Science',
          videoId: data.videoId || '',
          approved: data.approved !== false,
          createdAt: data.createdAt || new Date().toISOString(),
          order: typeof data.order === 'number' ? data.order : 100,
          thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`,
          videoUrl: data.videoUrl || `https://www.youtube-nocookie.com/embed/${data.videoId}?rel=0`,
        });
      });

      // Update local storage mirror
      try {
        localStorage.setItem(LOCAL_ADMIN_VIDEOS_KEY, JSON.stringify(list));
      } catch {}

      return list;
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error loading videos from Firestore, trying local mirror:', err);
    }
  }

  // Fallback to local storage
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_VIDEOS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return [];
}

/**
 * Saves an array of parsed valid bulk videos to Firestore 'videos' collection
 */
export async function saveBulkFirestoreVideos(
  validVideos: Array<{ category: string; title: string; videoId: string; order?: number }>
): Promise<{ addedCount: number; errors: string[] }> {
  if (!validVideos || validVideos.length === 0) {
    return { addedCount: 0, errors: ['No valid videos to save.'] };
  }

  const db = getFirestoreDB();
  let addedCount = 0;
  const errors: string[] = [];
  const existing = await loadAllFirestoreVideos();
  let currentMaxOrder = existing.reduce((max, v) => Math.max(max, v.order || 0), 0);

  const localUpdatedList = [...existing];

  for (const item of validVideos) {
    currentMaxOrder += 1;
    const docId = `yt_${item.videoId}`;
    const thumbnail = `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
    const videoUrl = `https://www.youtube-nocookie.com/embed/${item.videoId}?rel=0`;

    const newVideo: AdminVideo = {
      id: docId,
      title: item.title,
      category: item.category,
      videoId: item.videoId,
      approved: true,
      createdAt: new Date().toISOString(),
      order: item.order ?? currentMaxOrder,
      thumbnail,
      videoUrl,
    };

    if (db) {
      try {
        const docRef = doc(db, 'videos', docId);
        await setDoc(docRef, newVideo, { merge: true });
        addedCount++;
      } catch (err: any) {
        if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
        errors.push(`Failed saving ${item.title}: ${err?.message || 'Firestore write error'}`);
      }
    } else {
      addedCount++;
    }

    // Update local mirror
    const existingIdx = localUpdatedList.findIndex((v) => v.id === docId);
    if (existingIdx >= 0) {
      localUpdatedList[existingIdx] = newVideo;
    } else {
      localUpdatedList.push(newVideo);
    }
  }

  try {
    localStorage.setItem(LOCAL_ADMIN_VIDEOS_KEY, JSON.stringify(localUpdatedList));
    // Invalidate merged cache so new videos appear immediately
    localStorage.removeItem(MERGED_VIDEOS_CACHE_KEY);
    localStorage.removeItem(MERGED_VIDEOS_CACHE_TIME_KEY);
  } catch {}

  return { addedCount, errors };
}

/**
 * Adds a single video to Firestore
 */
export async function addSingleFirestoreVideo(data: {
  category: string;
  title: string;
  videoId: string;
  order?: number;
}): Promise<AdminVideo> {
  const existing = await loadAllFirestoreVideos();
  const currentMaxOrder = existing.reduce((max, v) => Math.max(max, v.order || 0), 0);
  const docId = `yt_${data.videoId}`;
  const thumbnail = `https://i.ytimg.com/vi/${data.videoId}/hqdefault.jpg`;
  const videoUrl = `https://www.youtube-nocookie.com/embed/${data.videoId}?rel=0`;

  const newVideo: AdminVideo = {
    id: docId,
    title: data.title,
    category: data.category,
    videoId: data.videoId,
    approved: true,
    createdAt: new Date().toISOString(),
    order: data.order ?? currentMaxOrder + 1,
    thumbnail,
    videoUrl,
  };

  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'videos', docId);
      await setDoc(docRef, newVideo, { merge: true });
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error adding video to Firestore:', err);
    }
  }

  // Update local storage
  try {
    const updated = [newVideo, ...existing.filter((v) => v.id !== docId)];
    localStorage.setItem(LOCAL_ADMIN_VIDEOS_KEY, JSON.stringify(updated));
    localStorage.removeItem(MERGED_VIDEOS_CACHE_KEY);
  } catch {}

  return newVideo;
}

/**
 * Updates video fields (title, category, videoId, order, approved)
 */
export async function updateFirestoreVideo(id: string, updates: Partial<AdminVideo>): Promise<void> {
  const cleanUpdates = { ...updates };
  if (cleanUpdates.videoId) {
    cleanUpdates.thumbnail = `https://i.ytimg.com/vi/${cleanUpdates.videoId}/hqdefault.jpg`;
    cleanUpdates.videoUrl = `https://www.youtube-nocookie.com/embed/${cleanUpdates.videoId}?rel=0`;
  }

  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'videos', id);
      await updateDoc(docRef, cleanUpdates);
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error updating video in Firestore:', err);
    }
  }

  try {
    const existing = await loadAllFirestoreVideos();
    const updated = existing.map((v) => (v.id === id ? { ...v, ...cleanUpdates } : v));
    localStorage.setItem(LOCAL_ADMIN_VIDEOS_KEY, JSON.stringify(updated));
    localStorage.removeItem(MERGED_VIDEOS_CACHE_KEY);
  } catch {}
}

/**
 * Toggles approved status (hide/show)
 */
export async function toggleFirestoreVideoApproved(id: string, currentApproved: boolean): Promise<boolean> {
  const next = !currentApproved;
  await updateFirestoreVideo(id, { approved: next });
  return next;
}

/**
 * Deletes a video from Firestore
 */
export async function deleteFirestoreVideo(id: string): Promise<void> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'videos', id);
      await deleteDoc(docRef);
    } catch (err) {
      if (isQuotaOrResourceExhausted(err)) notifyServerBusy();
      console.warn('Error deleting video from Firestore:', err);
    }
  }

  try {
    const existing = await loadAllFirestoreVideos();
    const updated = existing.filter((v) => v.id !== id);
    localStorage.setItem(LOCAL_ADMIN_VIDEOS_KEY, JSON.stringify(updated));
    localStorage.removeItem(MERGED_VIDEOS_CACHE_KEY);
  } catch {}
}

/**
 * Merges Firestore videos with valid entries from src/data/videos.ts
 * Filters out invalid/placeholder entries.
 * Cached locally for 1 hour.
 */
export async function getMergedVideos(forceRefresh = false): Promise<VideoContent[]> {
  const now = Date.now();

  // Check 1-hour cache
  if (!forceRefresh) {
    try {
      const cacheTime = parseInt(localStorage.getItem(MERGED_VIDEOS_CACHE_TIME_KEY) || '0', 10);
      if (now - cacheTime < MERGED_VIDEOS_CACHE_TTL) {
        const cached = localStorage.getItem(MERGED_VIDEOS_CACHE_KEY);
        if (cached) {
          const list = JSON.parse(cached);
          if (Array.isArray(list) && list.length > 0) {
            return list;
          }
        }
      }
    } catch {}
  }

  // 1. Load admin videos from Firestore / local storage
  const adminVideos = await loadAllFirestoreVideos();
  const approvedAdminVideos = adminVideos.filter((v) => v.approved !== false);

  const mappedAdminVideos: VideoContent[] = approvedAdminVideos.map((v) => ({
    id: v.id,
    title: v.title,
    category: v.category,
    videoId: v.videoId,
    duration: '3:30',
    points: 25,
    author: 'JoyEarn Educational Partner',
    thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
    isOffline: true,
    fileSize: '12 MB',
    summary: v.title,
    videoUrl: v.videoUrl || `https://www.youtube-nocookie.com/embed/${v.videoId}?rel=0`,
    videoType: 'embed',
    approved: true,
    order: v.order,
  }));

  // 2. Load static curriculum videos from src/data/videos.ts
  // Strictly filter out any entry that has a placeholder link, missing link, or invalid link
  const validStaticVideos: VideoContent[] = ALL_VIDEOS.filter((v) => {
    if (!v.videoUrl) return false;
    if (v.videoUrl.includes('PASTE_YOUR_CUSTOM_LINK_HERE')) return false;
    const vId = extractYouTubeId(v.videoUrl);
    if (!vId) return false;
    return true;
  }).map((v) => {
    const vId = extractYouTubeId(v.videoUrl!) || '';
    return {
      ...v,
      videoId: vId,
      thumbnail: v.thumbnail && v.thumbnail.startsWith('http')
        ? v.thumbnail
        : `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`,
      videoUrl: `https://www.youtube-nocookie.com/embed/${vId}?rel=0`,
      videoType: 'embed' as const,
      approved: true,
    };
  });

  // 3. Merge: Admin videos first (by order), followed by static videos
  // Deduplicate by videoId
  const seenVideoIds = new Set<string>();
  const merged: VideoContent[] = [];

  // Add admin videos
  mappedAdminVideos.forEach((v) => {
    if (v.videoId && !seenVideoIds.has(v.videoId)) {
      seenVideoIds.add(v.videoId);
      merged.push(v);
    }
  });

  // Add static curriculum videos
  validStaticVideos.forEach((v) => {
    if (v.videoId && !seenVideoIds.has(v.videoId)) {
      seenVideoIds.add(v.videoId);
      merged.push(v);
    }
  });

  // Cache merged list for 1 hour
  try {
    localStorage.setItem(MERGED_VIDEOS_CACHE_KEY, JSON.stringify(merged));
    localStorage.setItem(MERGED_VIDEOS_CACHE_TIME_KEY, String(now));
  } catch {}

  return merged;
}
