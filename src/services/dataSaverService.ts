import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirestoreDB } from './firestoreService';

export type VideoQualityPreference = 'auto' | 'low' | 'high';
export type VideoSourceKind = 'youtube' | 'direct_file' | 'adaptive';

export interface DataSaverPreferences {
  dataSaverEnabled: boolean;
  quality: VideoQualityPreference;
  autoplayOnMobileData: boolean;
  updatedAt: string;
}

export interface NetworkProfile {
  isOnline: boolean;
  isMobileData: boolean;
  isWifi: boolean;
  isSlowConnection: boolean;
  osSaveData: boolean;
  effectiveType: string;
  label: string;
}

export interface VideoPlaybackPolicy {
  shouldAutoplay: boolean;
  preloadMode: 'none' | 'metadata';
  effectiveQuality: VideoQualityPreference;
  youtubeVqParam: string | null;
  sourceQualityNote: string;
  reducedForSlowNetwork: boolean;
}

const STORAGE_KEY = 'joyearn_data_saver_prefs_v1';
const CHANGE_EVENT = 'joyearn_data_saver_changed';

function isAuthenticatedUid(uid?: string): uid is string {
  return Boolean(uid && uid !== 'guest' && uid !== 'local');
}

export function getNetworkProfile(): NetworkProfile {
  if (typeof navigator === 'undefined') {
    return {
      isOnline: true,
      isMobileData: false,
      isWifi: false,
      isSlowConnection: false,
      osSaveData: false,
      effectiveType: 'unknown',
      label: 'Connected',
    };
  }

  const isOnline = navigator.onLine !== false;
  if (!isOnline) {
    return {
      isOnline: false,
      isMobileData: false,
      isWifi: false,
      isSlowConnection: true,
      osSaveData: false,
      effectiveType: 'offline',
      label: 'Offline',
    };
  }

  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  const connType = String(conn?.type || '').toLowerCase();
  const effectiveType = String(conn?.effectiveType || 'unknown').toLowerCase();
  const downlink = typeof conn?.downlink === 'number' ? conn.downlink : null;
  const osSaveData = Boolean(conn?.saveData);

  const isMobileData = connType === 'cellular';
  const isWifi = connType === 'wifi' || connType === 'ethernet';
  const isSlowConnection =
    effectiveType === 'slow-2g' ||
    effectiveType === '2g' ||
    effectiveType === '3g' ||
    (downlink !== null && downlink > 0 && downlink < 1.5);

  let label = 'Connected';
  if (isSlowConnection) {
    label = isMobileData ? 'Slow Mobile Data' : 'Slow Connection';
  } else if (isMobileData) {
    label = 'Mobile Data';
  } else if (isWifi) {
    label = 'Wi-Fi';
  }

  return {
    isOnline,
    isMobileData,
    isWifi,
    isSlowConnection,
    osSaveData,
    effectiveType,
    label,
  };
}

export function getDefaultDataSaverPreferences(): DataSaverPreferences {
  const net = getNetworkProfile();
  return {
    dataSaverEnabled: net.osSaveData,
    quality: net.osSaveData ? 'low' : 'auto',
    autoplayOnMobileData: false,
    updatedAt: new Date(0).toISOString(),
  };
}

function normalizePrefs(raw: Partial<DataSaverPreferences> | null | undefined): DataSaverPreferences {
  const def = getDefaultDataSaverPreferences();
  if (!raw || typeof raw !== 'object') return def;

  const quality: VideoQualityPreference =
    raw.quality === 'low' || raw.quality === 'high' || raw.quality === 'auto'
      ? raw.quality
      : def.quality;

  return {
    dataSaverEnabled:
      typeof raw.dataSaverEnabled === 'boolean' ? raw.dataSaverEnabled : def.dataSaverEnabled,
    quality,
    autoplayOnMobileData:
      typeof raw.autoplayOnMobileData === 'boolean'
        ? raw.autoplayOnMobileData
        : def.autoplayOnMobileData,
    updatedAt:
      typeof raw.updatedAt === 'string' && !Number.isNaN(Date.parse(raw.updatedAt))
        ? raw.updatedAt
        : def.updatedAt,
  };
}

export function getDataSaverPreferences(): DataSaverPreferences {
  if (typeof localStorage === 'undefined') return getDefaultDataSaverPreferences();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizePrefs(JSON.parse(raw));
    }
  } catch {}
  return getDefaultDataSaverPreferences();
}

function writeLocalDataSaverPreferences(prefs: DataSaverPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: prefs }));
    }
  } catch {}
}

export function subscribeDataSaverPreferences(
  callback: (prefs: DataSaverPreferences) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail) {
      callback(normalizePrefs(detail));
    }
  };
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}

export async function loadDataSaverPreferences(uid?: string): Promise<DataSaverPreferences> {
  const local = getDataSaverPreferences();
  if (!isAuthenticatedUid(uid)) return local;

  const db = getFirestoreDB();
  if (!db) return local;

  try {
    const ref = doc(db, 'users', uid, 'app_preferences', 'data_saver');
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      if (Date.parse(local.updatedAt) > 0) {
        await setDoc(ref, { ...local, uid }, { merge: true });
      }
      return local;
    }
    const cloud = normalizePrefs(snap.data() as Partial<DataSaverPreferences>);
    const localTs = Date.parse(local.updatedAt) || 0;
    const cloudTs = Date.parse(cloud.updatedAt) || 0;
    if (cloudTs >= localTs) {
      writeLocalDataSaverPreferences(cloud);
      return cloud;
    }
    await setDoc(ref, { ...local, uid }, { merge: true });
    return local;
  } catch {
    return local;
  }
}

export async function saveDataSaverPreferences(
  updates: Partial<DataSaverPreferences>,
  uid?: string
): Promise<DataSaverPreferences> {
  const current = getDataSaverPreferences();
  const next = normalizePrefs({
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  });

  writeLocalDataSaverPreferences(next);

  if (isAuthenticatedUid(uid)) {
    const db = getFirestoreDB();
    if (db) {
      try {
        const ref = doc(db, 'users', uid, 'app_preferences', 'data_saver');
        await setDoc(ref, { ...next, uid }, { merge: true });
      } catch {
        // Local persistence already succeeded
      }
    }
  }

  return next;
}

/**
 * Resolves real playback behavior (autoplay, preloading, quality hint, and honest
 * source capability explanation) based on user preferences + current network.
 */
export function resolveVideoPlaybackPolicy(
  prefs: DataSaverPreferences,
  network: NetworkProfile = getNetworkProfile(),
  sourceKind: VideoSourceKind = 'youtube'
): VideoPlaybackPolicy {
  const saverActive = prefs.dataSaverEnabled || network.osSaveData;

  // Never autoplay offline, in Data Saver mode, on slow connections, or on mobile data unless allowed
  const shouldAutoplay =
    network.isOnline &&
    !saverActive &&
    !network.isSlowConnection &&
    (!network.isMobileData || prefs.autoplayOnMobileData);

  // Never use preload="auto" (avoids downloading full videos unnecessarily)
  const preloadMode: 'none' | 'metadata' =
    saverActive || prefs.quality === 'low' || network.isSlowConnection || network.isMobileData
      ? 'none'
      : 'metadata';

  let effectiveQuality: VideoQualityPreference = prefs.quality;
  let reducedForSlowNetwork = false;

  if (saverActive) {
    effectiveQuality = 'low';
  } else if (prefs.quality === 'high' && network.isSlowConnection) {
    effectiveQuality = 'auto';
    reducedForSlowNetwork = true;
  }

  const youtubeVqParam =
    effectiveQuality === 'low'
      ? 'small'
      : effectiveQuality === 'high'
        ? 'hd720'
        : null;

  let sourceQualityNote = '';
  if (sourceKind === 'youtube') {
    sourceQualityNote =
      effectiveQuality === 'low'
        ? 'Data Saver active: autoplay is off and lower quality is requested. YouTube adapts stream bitrate to your connection (you can also pick exact resolution in the player gear menu).'
        : effectiveQuality === 'high'
          ? 'Higher quality requested. YouTube uses adaptive streaming when your connection supports it.'
          : 'Auto adaptive streaming: YouTube automatically matches quality to your connection speed.';
  } else if (sourceKind === 'direct_file') {
    sourceQualityNote =
      'This video uses a single-quality file. Data Saver reduces data usage by disabling autoplay and video preloading until you press Play.';
  } else {
    sourceQualityNote =
      'Adaptive streaming adjusts video resolution automatically based on your selected preference and network speed.';
  }

  return {
    shouldAutoplay,
    preloadMode,
    effectiveQuality,
    youtubeVqParam,
    sourceQualityNote,
    reducedForSlowNetwork,
  };
}

/**
 * Builds a privacy-enhanced YouTube embed URL applying Data Saver autoplay & quality hints.
 */
export function buildYouTubeEmbedUrl(
  videoId: string,
  policy: VideoPlaybackPolicy,
  options?: { forcePlay?: boolean; mute?: boolean; loop?: boolean }
): string {
  const params = new URLSearchParams();
  params.set('rel', '0');
  params.set('modestbranding', '1');
  params.set('playsinline', '1');
  params.set('autoplay', options?.forcePlay || policy.shouldAutoplay ? '1' : '0');
  if (options?.mute) params.set('mute', '1');
  if (options?.loop) {
    params.set('loop', '1');
    params.set('playlist', videoId);
  }
  if (policy.youtubeVqParam) {
    params.set('vq', policy.youtubeVqParam);
  }
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}
