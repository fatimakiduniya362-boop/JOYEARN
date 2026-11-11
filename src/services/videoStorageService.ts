/**
 * 📹 JOYEARN NATIVE VIDEO STORAGE SERVICE (IndexedDB)
 * 
 * Provides local, persistent storage for user-recorded and uploaded
 * native video files (MP4, WebM, MOV, OGG).
 * Allows smooth playback of both short and long videos directly inside the app.
 */

const DB_NAME = 'joyearn_vlogs_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'video_blobs';

interface StoredVideoRecord {
  id: string;
  blob: Blob;
  mimeType: string;
  name?: string;
  createdAt: string;
  sizeBytes: number;
}

// In-memory cache of active Object URLs to prevent repeated URL creations
const activeBlobUrls = new Map<string, string>();

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a native video Blob to IndexedDB
 */
export async function saveVideoBlob(
  id: string,
  blob: Blob,
  mimeType = 'video/mp4',
  name?: string
): Promise<string> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record: StoredVideoRecord = {
        id,
        blob,
        mimeType: mimeType || blob.type || 'video/mp4',
        name: name || `video_${id}`,
        createdAt: new Date().toISOString(),
        sizeBytes: blob.size,
      };

      const request = store.put(record);
      request.onsuccess = () => {
        // Create and cache an Object URL
        const blobUrl = URL.createObjectURL(blob);
        activeBlobUrls.set(id, blobUrl);
        resolve(id);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not save video blob to IndexedDB, using memory fallback:', err);
    // In-memory fallback
    const fallbackUrl = URL.createObjectURL(blob);
    activeBlobUrls.set(id, fallbackUrl);
    return id;
  }
}

/**
 * Retrieves a stored video Blob from IndexedDB
 */
export async function getVideoBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => {
        const record = request.result as StoredVideoRecord | undefined;
        resolve(record ? record.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not read video from IndexedDB:', err);
    return null;
  }
}

/**
 * Retrieves or creates a playable Object URL for a stored video
 */
export async function getVideoBlobUrl(id: string): Promise<string | null> {
  if (activeBlobUrls.has(id)) {
    return activeBlobUrls.get(id)!;
  }

  const blob = await getVideoBlob(id);
  if (!blob) return null;

  const url = URL.createObjectURL(blob);
  activeBlobUrls.set(id, url);
  return url;
}

/**
 * Removes a stored video Blob
 */
export async function deleteVideoBlob(id: string): Promise<void> {
  if (activeBlobUrls.has(id)) {
    try {
      URL.revokeObjectURL(activeBlobUrls.get(id)!);
    } catch {}
    activeBlobUrls.delete(id);
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not delete video blob:', err);
  }
}

/**
 * Generates an automatic video thumbnail by seeking into the first half-second
 */
export async function generateVideoThumbnail(videoBlobOrUrl: Blob | string): Promise<string> {
  if (typeof window === 'undefined') return '';

  return new Promise((resolve) => {
    let urlToRevoke: string | null = null;
    let videoUrl: string;

    if (typeof videoBlobOrUrl === 'string') {
      videoUrl = videoBlobOrUrl;
    } else {
      videoUrl = URL.createObjectURL(videoBlobOrUrl);
      urlToRevoke = videoUrl;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';

    let resolved = false;
    const cleanup = () => {
      if (urlToRevoke) {
        try {
          URL.revokeObjectURL(urlToRevoke);
        } catch {}
      }
    };

    const finish = (result: string) => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(result);
      }
    };

    // Timeout safety: if canvas capture fails after 3s, return empty string
    const timer = setTimeout(() => {
      finish('');
    }, 3500);

    video.onloadeddata = () => {
      video.currentTime = Math.min(1.0, (video.duration || 2) * 0.25);
    };

    video.onseeked = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const width = Math.min(640, video.videoWidth || 640);
        const height = Math.min(360, video.videoHeight || 360);
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
          finish(dataUrl);
          return;
        }
      } catch (err) {
        console.warn('Canvas thumbnail capture error:', err);
      }
      finish('');
    };

    video.onerror = () => {
      clearTimeout(timer);
      finish('');
    };

    video.src = videoUrl;
  });
}

/**
 * Extracts duration and size metadata from a video file or blob
 */
export async function getVideoMetadata(
  file: File | Blob
): Promise<{ duration: number; formattedDuration: string; isShort: boolean; sizeMb: number }> {
  if (typeof window === 'undefined') {
    return { duration: 0, formattedDuration: '0:00', isShort: false, sizeMb: 0 };
  }

  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    const url = URL.createObjectURL(file);
    const sizeMb = +(file.size / (1024 * 1024)).toFixed(1);

    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration || 0);
      const mins = Math.floor(dur / 60);
      const secs = Math.floor(dur % 60);
      const formattedDuration = `${mins}:${secs.toString().padStart(2, '0')}`;
      const isShort = dur <= 60; // 60 seconds or less is classified as a short video
      URL.revokeObjectURL(url);
      resolve({ duration: dur, formattedDuration, isShort, sizeMb });
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: 0, formattedDuration: '0:00', isShort: false, sizeMb });
    };

    video.src = url;
  });
}
