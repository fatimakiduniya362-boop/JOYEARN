import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from './googleAuth';
import { getFirestoreDB } from './firestoreService';
import { QuizItem } from '../types';

export interface OfflineLessonItem {
  id: string;
  category: string;
  difficulty: string;
  question: string;
  urduQuestion?: string;
  options: string[];
  correctIndex: number;
  fact?: string;
  explanation?: string;
  points: number;
}

export interface OfflinePackCatalogEntry {
  packId: string;
  category: string;
  title: string;
  itemCount: number;
  estimatedBytes: number;
  checksum: string;
  authorizedForOffline: true;
  items: OfflineLessonItem[];
}

export interface DownloadedOfflinePack {
  packId: string;
  category: string;
  title: string;
  itemCount: number;
  sizeBytes: number;
  checksum: string;
  downloadedAt: string;
  items: OfflineLessonItem[];
}

export interface DownloadCheckpoint {
  packId: string;
  category: string;
  title: string;
  totalItems: number;
  savedItems: OfflineLessonItem[];
  expectedChecksum: string;
  updatedAt: number;
}

export interface OfflineProgressQueueItem {
  entryKey: string; // `${uid}::${packId}::${lessonId}`
  uid: string;
  packId: string;
  lessonId: string;
  completedAt: string;
  status: 'pending_sync' | 'synced';
}

export interface StorageQuotaInfo {
  supported: boolean;
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  offlinePacksBytes: number;
  lowStorage: boolean;
}

export interface SyncOfflineProgressResult {
  success: boolean;
  syncedCount: number;
  pendingCount: number;
  error?: string;
}

const DB_NAME = 'joyearn_offline_learning_db';
const DB_VERSION = 1;
const STORE_PACKS = 'lesson_packs';
const STORE_CHECKPOINTS = 'download_checkpoints';

const FALLBACK_PACKS_KEY = 'joyearn_offline_packs_fallback_v1';
const FALLBACK_CHECKPOINTS_KEY = 'joyearn_offline_checkpoints_fallback_v1';
const PROGRESS_QUEUE_KEY = 'joyearn_offline_progress_queue_v1';
const COMPLETED_LESSONS_KEY = 'joyearn_offline_completed_lessons_v1';

// Minimum free storage safety reserve (5 MB)
export const MIN_FREE_STORAGE_BYTES = 5 * 1024 * 1024;
const MAX_ITEMS_PER_PACK = 25;

// In-memory guard preventing duplicate concurrent downloads of the same pack
const activeDownloads = new Set<string>();

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

export function computeItemsChecksum(items: OfflineLessonItem[]): string {
  let hash = 2166136261;
  for (const item of items) {
    const str = `${item.id}|${item.question}|${item.correctIndex}|${item.options.length}`;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  }
  return `chk_${(hash >>> 0).toString(16)}`;
}

export function formatStorageBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Builds authorized offline lesson packs directly from existing JoyEarn curriculum quizzes.
 * Never duplicates lessons or auto-downloads external videos.
 */
export function buildAuthorizedOfflineCatalog(quizzes: QuizItem[]): OfflinePackCatalogEntry[] {
  const byCategory = new Map<string, OfflineLessonItem[]>();

  for (const q of quizzes) {
    if (!q || !q.id || !q.question || !Array.isArray(q.options) || q.options.length < 2) {
      continue;
    }
    const category = (q.category || 'General').trim();
    const list = byCategory.get(category) || [];
    if (list.length >= MAX_ITEMS_PER_PACK) continue;

    const correctIndex =
      typeof q.correctAnswer === 'number'
        ? q.correctAnswer
        : typeof q.correctIndex === 'number'
        ? q.correctIndex
        : 0;

    list.push({
      id: q.id,
      category,
      difficulty: String(q.difficulty || 'Beginner'),
      question: q.question,
      urduQuestion: q.urduQuestion,
      options: q.options,
      correctIndex,
      fact: q.fact,
      explanation: q.explanation,
      points: typeof q.points === 'number' && q.points > 0 ? q.points : 10,
    });
    byCategory.set(category, list);
  }

  const catalog: OfflinePackCatalogEntry[] = [];
  byCategory.forEach((items, category) => {
    if (items.length === 0) return;
    const slug = category.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const packId = `pack_${slug || 'general'}`;
    const serialized = JSON.stringify(items);
    const estimatedBytes = new Blob([serialized]).size;

    catalog.push({
      packId,
      category,
      title: `${category} Study Pack`,
      itemCount: items.length,
      estimatedBytes,
      checksum: computeItemsChecksum(items),
      authorizedForOffline: true,
      items,
    });
  });

  return catalog.sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Verifies that a downloaded pack is complete and uncorrupted.
 */
export function verifyDownloadedPackIntegrity(pack: DownloadedOfflinePack | null | undefined): boolean {
  if (!pack || !pack.packId || !Array.isArray(pack.items)) return false;
  if (pack.items.length === 0 || pack.items.length !== pack.itemCount) return false;
  return computeItemsChecksum(pack.items) === pack.checksum;
}

// ============================================================================
// IndexedDB Storage Layer (with graceful localStorage fallback)
// ============================================================================

function openOfflineDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const dbInst = req.result;
        if (!dbInst.objectStoreNames.contains(STORE_PACKS)) {
          dbInst.createObjectStore(STORE_PACKS, { keyPath: 'packId' });
        }
        if (!dbInst.objectStoreNames.contains(STORE_CHECKPOINTS)) {
          dbInst.createObjectStore(STORE_CHECKPOINTS, { keyPath: 'packId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function readFallbackMap<T>(key: string): Record<string, T> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Record<string, T>) : {};
  } catch {
    return {};
  }
}

function writeFallbackMap<T>(key: string, map: Record<string, T>): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, JSON.stringify(map));
    return true;
  } catch {
    return false;
  }
}

export async function listDownloadedPacks(): Promise<DownloadedOfflinePack[]> {
  const idb = await openOfflineDb();
  if (idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(STORE_PACKS, 'readonly');
        const req = tx.objectStore(STORE_PACKS).getAll();
        req.onsuccess = () => resolve((req.result as DownloadedOfflinePack[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
  return Object.values(readFallbackMap<DownloadedOfflinePack>(FALLBACK_PACKS_KEY));
}

export async function getDownloadedPack(packId: string): Promise<DownloadedOfflinePack | null> {
  const idb = await openOfflineDb();
  if (idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(STORE_PACKS, 'readonly');
        const req = tx.objectStore(STORE_PACKS).get(packId);
        req.onsuccess = () => resolve((req.result as DownloadedOfflinePack) || null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  const map = readFallbackMap<DownloadedOfflinePack>(FALLBACK_PACKS_KEY);
  return map[packId] || null;
}

async function saveDownloadedPackRecord(pack: DownloadedOfflinePack): Promise<void> {
  const idb = await openOfflineDb();
  if (idb) {
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = idb.transaction(STORE_PACKS, 'readwrite');
        tx.objectStore(STORE_PACKS).put(pack);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
      } catch (err) {
        reject(err);
      }
    });
    return;
  }
  const map = readFallbackMap<DownloadedOfflinePack>(FALLBACK_PACKS_KEY);
  map[pack.packId] = pack;
  if (!writeFallbackMap(FALLBACK_PACKS_KEY, map)) {
    const err = new Error('Device storage quota exceeded.');
    err.name = 'QuotaExceededError';
    throw err;
  }
}

export async function removeDownloadedPack(packId: string): Promise<void> {
  const idb = await openOfflineDb();
  if (idb) {
    await new Promise<void>((resolve) => {
      try {
        const tx = idb.transaction([STORE_PACKS, STORE_CHECKPOINTS], 'readwrite');
        tx.objectStore(STORE_PACKS).delete(packId);
        tx.objectStore(STORE_CHECKPOINTS).delete(packId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return;
  }
  const packs = readFallbackMap<DownloadedOfflinePack>(FALLBACK_PACKS_KEY);
  delete packs[packId];
  writeFallbackMap(FALLBACK_PACKS_KEY, packs);

  const cps = readFallbackMap<DownloadCheckpoint>(FALLBACK_CHECKPOINTS_KEY);
  delete cps[packId];
  writeFallbackMap(FALLBACK_CHECKPOINTS_KEY, cps);
}

export async function listDownloadCheckpoints(): Promise<DownloadCheckpoint[]> {
  const idb = await openOfflineDb();
  if (idb) {
    return new Promise((resolve) => {
      try {
        const tx = idb.transaction(STORE_CHECKPOINTS, 'readonly');
        const req = tx.objectStore(STORE_CHECKPOINTS).getAll();
        req.onsuccess = () => resolve((req.result as DownloadCheckpoint[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  }
  return Object.values(readFallbackMap<DownloadCheckpoint>(FALLBACK_CHECKPOINTS_KEY));
}

async function saveCheckpoint(cp: DownloadCheckpoint): Promise<void> {
  const idb = await openOfflineDb();
  if (idb) {
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = idb.transaction(STORE_CHECKPOINTS, 'readwrite');
        tx.objectStore(STORE_CHECKPOINTS).put(cp);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Checkpoint save failed'));
      } catch (err) {
        reject(err);
      }
    });
    return;
  }
  const cps = readFallbackMap<DownloadCheckpoint>(FALLBACK_CHECKPOINTS_KEY);
  cps[cp.packId] = cp;
  if (!writeFallbackMap(FALLBACK_CHECKPOINTS_KEY, cps)) {
    const err = new Error('Device storage quota exceeded.');
    err.name = 'QuotaExceededError';
    throw err;
  }
}

async function deleteCheckpoint(packId: string): Promise<void> {
  const idb = await openOfflineDb();
  if (idb) {
    await new Promise<void>((resolve) => {
      try {
        const tx = idb.transaction(STORE_CHECKPOINTS, 'readwrite');
        tx.objectStore(STORE_CHECKPOINTS).delete(packId);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
    return;
  }
  const cps = readFallbackMap<DownloadCheckpoint>(FALLBACK_CHECKPOINTS_KEY);
  delete cps[packId];
  writeFallbackMap(FALLBACK_CHECKPOINTS_KEY, cps);
}

/**
 * Queries real device storage quota via StorageManager API and computes offline packs footprint.
 */
export async function getOfflineStorageQuotaInfo(): Promise<StorageQuotaInfo> {
  const packs = await listDownloadedPacks();
  const offlinePacksBytes = packs.reduce((sum, p) => sum + (p.sizeBytes || 0), 0);

  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    try {
      const est = await navigator.storage.estimate();
      const quotaBytes = est.quota || 0;
      const usedBytes = est.usage || 0;
      const remainingBytes = Math.max(0, quotaBytes - usedBytes);
      return {
        supported: quotaBytes > 0,
        usedBytes,
        quotaBytes,
        remainingBytes,
        offlinePacksBytes,
        lowStorage: quotaBytes > 0 && remainingBytes < MIN_FREE_STORAGE_BYTES,
      };
    } catch {
      // fall through
    }
  }

  return {
    supported: false,
    usedBytes: offlinePacksBytes,
    quotaBytes: 0,
    remainingBytes: 0,
    offlinePacksBytes,
    lowStorage: false,
  };
}

/**
 * Checks whether a storage quota check permits downloading a pack of `requiredBytes`.
 */
export function hasEnoughStorageForPack(quota: StorageQuotaInfo, requiredBytes: number): boolean {
  if (!quota.supported) return true;
  return quota.remainingBytes >= requiredBytes + MIN_FREE_STORAGE_BYTES;
}

/**
 * Downloads (or safely resumes an interrupted download of) an authorized offline lesson pack.
 * - Prevents duplicate concurrent or already-complete downloads.
 * - Checks storage quota before persisting.
 * - Supports AbortSignal so interrupted downloads save a checkpoint and resume cleanly.
 */
export async function downloadOrResumeOfflinePack(
  entry: OfflinePackCatalogEntry,
  opts?: {
    signal?: AbortSignal;
    onProgress?: (percent: number, savedCount: number, totalCount: number) => void;
    quotaOverride?: StorageQuotaInfo;
  }
): Promise<{
  success: boolean;
  alreadyDownloaded?: boolean;
  interrupted?: boolean;
  pack?: DownloadedOfflinePack;
  error?: string;
}> {
  if (!entry.authorizedForOffline) {
    return { success: false, error: 'This content is not authorized for offline storage.' };
  }

  if (activeDownloads.has(entry.packId)) {
    return { success: false, error: 'This lesson pack is already downloading.' };
  }

  // Prevent downloading the same verified content multiple times
  const existing = await getDownloadedPack(entry.packId);
  if (existing && verifyDownloadedPackIntegrity(existing) && existing.checksum === entry.checksum) {
    opts?.onProgress?.(100, existing.itemCount, existing.itemCount);
    return { success: true, alreadyDownloaded: true, pack: existing };
  }

  // Respect available device storage
  const quota = opts?.quotaOverride || (await getOfflineStorageQuotaInfo());
  if (!hasEnoughStorageForPack(quota, entry.estimatedBytes)) {
    return {
      success: false,
      error: `Not enough device storage available (${formatStorageBytes(quota.remainingBytes)} remaining). Remove old packs to free space.`,
    };
  }

  activeDownloads.add(entry.packId);
  try {
    // Check for an existing interrupted checkpoint to resume from
    const checkpoints = await listDownloadCheckpoints();
    const existingCp = checkpoints.find(
      (c) => c.packId === entry.packId && c.expectedChecksum === entry.checksum
    );

    const savedItems: OfflineLessonItem[] = existingCp ? [...existingCp.savedItems] : [];
    const total = entry.items.length;
    const chunkSize = Math.max(1, Math.ceil(total / 5));

    opts?.onProgress?.(Math.round((savedItems.length / total) * 100), savedItems.length, total);

    for (let i = savedItems.length; i < total; i += chunkSize) {
      if (opts?.signal?.aborted) {
        await saveCheckpoint({
          packId: entry.packId,
          category: entry.category,
          title: entry.title,
          totalItems: total,
          savedItems,
          expectedChecksum: entry.checksum,
          updatedAt: Date.now(),
        });
        return {
          success: false,
          interrupted: true,
          error: `Download paused at ${Math.round((savedItems.length / total) * 100)}%. Tap Resume to continue.`,
        };
      }

      const slice = entry.items.slice(i, i + chunkSize);
      savedItems.push(...slice);

      // Persist checkpoint after each chunk so interruptions never lose progress
      await saveCheckpoint({
        packId: entry.packId,
        category: entry.category,
        title: entry.title,
        totalItems: total,
        savedItems,
        expectedChecksum: entry.checksum,
        updatedAt: Date.now(),
      });

      const pct = Math.min(99, Math.round((savedItems.length / total) * 100));
      opts?.onProgress?.(pct, savedItems.length, total);

      // Yield briefly to keep UI responsive on mobile devices
      await new Promise((r) => setTimeout(r, 45));
    }

    const finalPack: DownloadedOfflinePack = {
      packId: entry.packId,
      category: entry.category,
      title: entry.title,
      itemCount: savedItems.length,
      sizeBytes: new Blob([JSON.stringify(savedItems)]).size,
      checksum: computeItemsChecksum(savedItems),
      downloadedAt: new Date().toISOString(),
      items: savedItems,
    };

    if (!verifyDownloadedPackIntegrity(finalPack) || finalPack.checksum !== entry.checksum) {
      await deleteCheckpoint(entry.packId);
      return {
        success: false,
        error: 'Downloaded lesson pack failed integrity verification. Please retry.',
      };
    }

    await saveDownloadedPackRecord(finalPack);
    await deleteCheckpoint(entry.packId);
    opts?.onProgress?.(100, finalPack.itemCount, finalPack.itemCount);
    return { success: true, pack: finalPack };
  } catch (err: unknown) {
    const errObj = err as { name?: string; message?: string } | null;
    if (errObj?.name === 'QuotaExceededError') {
      return {
        success: false,
        error: 'Device storage is full. Remove downloaded lessons to free space and retry.',
      };
    }
    return {
      success: false,
      error: errObj?.message || 'Download failed. Please retry.',
    };
  } finally {
    activeDownloads.delete(entry.packId);
  }
}

// ============================================================================
// Offline Progress Queue & Conflict-Free Account Synchronization
// ============================================================================

export function getOfflineCompletedLessonIds(uid: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${COMPLETED_LESSONS_KEY}_${uid || 'local'}`);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveOfflineCompletedLessonIds(uid: string, ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const unique = Array.from(new Set(ids));
    localStorage.setItem(`${COMPLETED_LESSONS_KEY}_${uid || 'local'}`, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

export function getOfflineProgressQueue(uid?: string): OfflineProgressQueueItem[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PROGRESS_QUEUE_KEY);
    const all: OfflineProgressQueueItem[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(all)) return [];
    return uid ? all.filter((item) => item.uid === uid) : all;
  } catch {
    return [];
  }
}

function writeOfflineProgressQueue(items: OfflineProgressQueueItem[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_QUEUE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Conflict-free set-union merge so syncing never overwrites newer valid progress from another device.
 */
export function mergeOfflineProgressSets(remoteIds: string[], localIds: string[]): string[] {
  return Array.from(new Set([...remoteIds, ...localIds]));
}

/**
 * Records a completed offline lesson idempotently.
 * - Returns `isDuplicate: true` if already completed so no duplicate progress or points are awarded.
 * - Queues for account sync (`status: 'pending_sync'`) without faking sync success while offline.
 */
export function recordOfflineLessonCompletion(
  uid: string,
  packId: string,
  lessonId: string
): { recorded: boolean; isDuplicate: boolean; pendingCount: number } {
  const effectiveUid = uid || 'local';
  const existingCompleted = getOfflineCompletedLessonIds(effectiveUid);
  if (existingCompleted.includes(lessonId)) {
    const pendingCount = getOfflineProgressQueue(effectiveUid).filter(
      (i) => i.status === 'pending_sync'
    ).length;
    return { recorded: false, isDuplicate: true, pendingCount };
  }

  saveOfflineCompletedLessonIds(effectiveUid, [...existingCompleted, lessonId]);

  const entryKey = `${effectiveUid}::${packId}::${lessonId}`;
  const allQueue = getOfflineProgressQueue();
  if (!allQueue.some((i) => i.entryKey === entryKey)) {
    allQueue.push({
      entryKey,
      uid: effectiveUid,
      packId,
      lessonId,
      completedAt: new Date().toISOString(),
      status: 'pending_sync',
    });
    writeOfflineProgressQueue(allQueue);
  }

  const pendingCount = allQueue.filter(
    (i) => i.uid === effectiveUid && i.status === 'pending_sync'
  ).length;
  return { recorded: true, isDuplicate: false, pendingCount };
}

/**
 * Synchronizes queued offline lesson completions to Firestore `/users/{uid}/offline_learning_progress/{packId}`
 * using conflict-free union merge. Never fakes sync success if offline or unauthenticated.
 */
export async function syncOfflineLearningProgress(uid: string): Promise<SyncOfflineProgressResult> {
  const effectiveUid = uid || 'local';
  const allQueue = getOfflineProgressQueue();
  const pendingForUser = allQueue.filter(
    (i) => i.uid === effectiveUid && i.status === 'pending_sync'
  );

  if (pendingForUser.length === 0) {
    return { success: true, syncedCount: 0, pendingCount: 0 };
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      success: false,
      syncedCount: 0,
      pendingCount: pendingForUser.length,
      error: 'Offline — progress is safely queued and will sync when internet returns.',
    };
  }

  const db = getFirestoreDB();
  if (!isAuthenticatedUid(uid) || !db || !auth?.currentUser || auth.currentUser.uid !== uid) {
    return {
      success: false,
      syncedCount: 0,
      pendingCount: pendingForUser.length,
      error: 'Sign in with your Google account to sync offline progress to the cloud.',
    };
  }

  // Group pending items by packId
  const byPack = new Map<string, OfflineProgressQueueItem[]>();
  for (const item of pendingForUser) {
    const list = byPack.get(item.packId) || [];
    list.push(item);
    byPack.set(item.packId, list);
  }

  let syncedCount = 0;
  const syncedKeys = new Set<string>();

  try {
    for (const [packId, items] of byPack.entries()) {
      const ref = doc(db, 'users', uid, 'offline_learning_progress', packId);
      const snap = await getDoc(ref);
      const remoteCompleted: string[] =
        snap.exists() && Array.isArray(snap.data().completedLessonIds)
          ? (snap.data().completedLessonIds as string[])
          : [];

      const localIds = items.map((i) => i.lessonId);
      const merged = mergeOfflineProgressSets(remoteCompleted, localIds);

      await setDoc(
        ref,
        {
          uid,
          packId,
          completedLessonIds: merged,
          completedCount: merged.length,
          lastSyncedAt: serverTimestamp(),
          updatedAtIso: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update local completed set with any remote completions merged from another device
      const currentLocal = getOfflineCompletedLessonIds(uid);
      saveOfflineCompletedLessonIds(uid, mergeOfflineProgressSets(currentLocal, merged));

      items.forEach((i) => syncedKeys.add(i.entryKey));
      syncedCount += items.length;
    }

    const updatedQueue = allQueue.map((item) =>
      syncedKeys.has(item.entryKey) ? { ...item, status: 'synced' as const } : item
    );
    writeOfflineProgressQueue(updatedQueue);

    const remainingPending = updatedQueue.filter(
      (i) => i.uid === uid && i.status === 'pending_sync'
    ).length;

    return {
      success: true,
      syncedCount,
      pendingCount: remainingPending,
    };
  } catch (err: unknown) {
    const msg = (err as { message?: string } | null)?.message || 'Cloud sync failed. Will retry when online.';
    return {
      success: false,
      syncedCount,
      pendingCount: pendingForUser.length - syncedCount,
      error: msg,
    };
  }
}

/**
 * Loads synced offline learning completions from Firestore on login/device switch
 * and merges them into local state without overwriting newer local progress.
 */
export async function loadSyncedOfflineProgress(uid: string): Promise<string[]> {
  const localIds = getOfflineCompletedLessonIds(uid);
  const db = getFirestoreDB();
  if (
    !isAuthenticatedUid(uid) ||
    !db ||
    !auth?.currentUser ||
    auth.currentUser.uid !== uid ||
    (typeof navigator !== 'undefined' && navigator.onLine === false)
  ) {
    return localIds;
  }

  try {
    const colRef = collection(db, 'users', uid, 'offline_learning_progress');
    const snap = await getDocs(colRef);
    const remoteIds: string[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (Array.isArray(data.completedLessonIds)) {
        for (const id of data.completedLessonIds) {
          if (typeof id === 'string') remoteIds.push(id);
        }
      }
    });
    const merged = mergeOfflineProgressSets(remoteIds, localIds);
    saveOfflineCompletedLessonIds(uid, merged);
    return merged;
  } catch {
    return localIds;
  }
}
