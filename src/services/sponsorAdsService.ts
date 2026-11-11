import { SponsorAd, SponsorEnquiry, SponsorRequest } from '../types';
import { getFirestoreDB } from './firestoreService';
import { getSponsorPackageByName } from '../data/sponsorPackages';
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
  serverTimestamp
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'joyearn_sponsor_ads_cache';
const LOCAL_STORAGE_TIME_KEY = 'joyearn_sponsor_ads_cache_time';
const LOCAL_STORAGE_REQUESTS_KEY = 'joyearn_sponsor_requests_cache';
export const SPONSOR_ADS_CACHE_TTL = 60 * 60 * 1000; // 1-hour TTL
export const BATCH_IMPRESSIONS_THRESHOLD = 25; // Flush metrics every 25 impressions

// Built-in verified sponsor ads: only genuine paid Firestore ads are served
const DEFAULT_SPONSOR_ADS: SponsorAd[] = [];

/**
 * Checks if a sponsor ad is currently qualified to run.
 * Rules:
 * 1. Must be marked active (isActive === true)
 * 2. Paid status must not be 'no'
 * 3. Destination link must be http:// or https://
 * 4. Must be within schedule window (startDate <= today <= endDate)
 * 5. Automatically stops once delivered impressions reach target reach
 */
export function isSponsorAdRunning(ad: SponsorAd): boolean {
  if (!ad.isActive) return false;

  // Ad runs unless explicitly marked unpaid
  if (ad.paid && ad.paid === 'no') return false;

  // Safe destination link
  const link = ad.destinationLink || ad.targetUrl || '';
  if (link && !link.startsWith('https://') && !link.startsWith('http://')) return false;

  const todayStr = new Date().toISOString().slice(0, 10);
  if (ad.startDate && ad.startDate > todayStr) return false;
  if (ad.endDate && ad.endDate < todayStr) return false;

  // Reach limit check: if reach limit is hit, ad stops automatically
  const deliveredImpressions = ad.impressions || 0;
  const targetReach =
    ad.targetReach !== undefined && ad.targetReach > 0
      ? ad.targetReach
      : ad.packageImpressions || (ad.package ? getSponsorPackageByName(ad.package)?.impressions : 0) || 0;

  if (targetReach > 0 && deliveredImpressions >= targetReach) {
    return false;
  }

  return true;
}

export async function loadActiveSponsorAds(forceRefresh = false): Promise<SponsorAd[]> {
  const now = Date.now();

  // 1. One-time read with 1-hour local cache limit
  if (!forceRefresh) {
    try {
      const lastFetched = parseInt(localStorage.getItem(LOCAL_STORAGE_TIME_KEY) || '0', 10);
      if (now - lastFetched < SPONSOR_ADS_CACHE_TTL) {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed: SponsorAd[] = JSON.parse(saved);
          const filtered = parsed.filter((a) => isSponsorAdRunning(a));
          if (filtered.length > 0) return filtered;
        }
      }
    } catch {}
  }

  const db = getFirestoreDB();

  if (db) {
    try {
      const colRef = collection(db, 'sponsor_ads');
      const q = query(colRef, where('isActive', '==', true));
      const snap = await getDocs(q);
      const list: SponsorAd[] = [];
      snap.forEach((d) => {
        const data = d.data() as SponsorAd;
        if (isSponsorAdRunning(data)) {
          list.push(data);
        }
      });

      if (list.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
        localStorage.setItem(LOCAL_STORAGE_TIME_KEY, String(now));
        return list;
      }
    } catch (e) {
      console.warn('Firestore active sponsor ads query error, using local:', e);
    }
  }

  // Fallback to local storage or defaults
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: SponsorAd[] = JSON.parse(saved);
      const filtered = parsed.filter((a) => isSponsorAdRunning(a));
      if (filtered.length > 0) return filtered;
    }
  } catch {}

  return DEFAULT_SPONSOR_ADS.filter((a) => isSponsorAdRunning(a));
}

export async function loadAllSponsorAdsForAdmin(): Promise<SponsorAd[]> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const colRef = collection(db, 'sponsor_ads');
      const snap = await getDocs(colRef);
      const list: SponsorAd[] = [];
      snap.forEach((d) => {
        list.push(d.data() as SponsorAd);
      });
      if (list.length > 0) {
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return list;
      }
    } catch (e) {
      console.warn('Firestore admin sponsor ads query error:', e);
    }
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed: SponsorAd[] = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
  } catch {}

  return DEFAULT_SPONSOR_ADS;
}

export async function createSponsorAd(adData: Omit<SponsorAd, 'id'>): Promise<SponsorAd> {
  const newId = 'sp_ad_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const newAd: SponsorAd = {
    ...adData,
    id: newId,
    impressions: 0,
    clicks: 0,
    createdAt: new Date().toISOString(),
  };

  // 1. Local update
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = [newAd, ...all.filter((a) => a.id !== newId)];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Firestore update
  const db = getFirestoreDB();
  if (db) {
    try {
      await setDoc(doc(db, 'sponsor_ads', newId), newAd);
    } catch (e) {
      console.warn('Error saving sponsor ad in Firestore:', e);
    }
  }

  return newAd;
}

export async function updateSponsorAd(id: string, updates: Partial<SponsorAd>): Promise<boolean> {
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.map((a) => (a.id === id ? { ...a, ...updates } : a));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  const db = getFirestoreDB();
  if (db) {
    try {
      await updateDoc(doc(db, 'sponsor_ads', id), updates);
      return true;
    } catch (e) {
      console.warn('Error updating sponsor ad in Firestore:', e);
    }
  }
  return true;
}

export async function deleteSponsorAd(id: string): Promise<boolean> {
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.filter((a) => a.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  const db = getFirestoreDB();
  if (db) {
    try {
      await deleteDoc(doc(db, 'sponsor_ads', id));
      return true;
    } catch (e) {
      console.warn('Error deleting sponsor ad in Firestore:', e);
    }
  }
  return true;
}

// ============================================================================
// 📊 BATCHED AD METRICS (Send once every 25 impressions or when app closes)
// ============================================================================
const PENDING_METRICS_KEY = 'joyearn_pending_ad_metrics';

interface PendingMetricsMap {
  [adId: string]: {
    impressions: number;
    clicks: number;
  };
}

function getPendingMetrics(): PendingMetricsMap {
  try {
    return JSON.parse(localStorage.getItem(PENDING_METRICS_KEY) || '{}');
  } catch {
    return {};
  }
}

function savePendingMetrics(metrics: PendingMetricsMap) {
  try {
    localStorage.setItem(PENDING_METRICS_KEY, JSON.stringify(metrics));
  } catch {}
}

/**
 * Sends all accumulated local impressions and clicks in one batched increment
 */
export async function flushPendingAdMetrics(): Promise<void> {
  const metrics = getPendingMetrics();
  const adIds = Object.keys(metrics);
  if (adIds.length === 0) return;

  // Clear local pending map first to avoid duplicate pushes
  localStorage.removeItem(PENDING_METRICS_KEY);

  const db = getFirestoreDB();
  if (!db) return;

  try {
    // Process in batches
    for (const adId of adIds) {
      const data = metrics[adId];
      if (!data) continue;
      const docRef = doc(db, 'sponsor_ads', adId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const curImpressions = snap.data()?.impressions || 0;
        const curClicks = snap.data()?.clicks || 0;
        await updateDoc(docRef, {
          impressions: curImpressions + (data.impressions || 0),
          clicks: curClicks + (data.clicks || 0),
        });
      }
    }
  } catch (err) {
    console.warn('Could not flush batched ad metrics to Firestore:', err);
    // Restore unwritten metrics back to localStorage queue
    try {
      const current = getPendingMetrics();
      adIds.forEach((id) => {
        if (!current[id]) current[id] = { impressions: 0, clicks: 0 };
        current[id].impressions += metrics[id].impressions;
        current[id].clicks += metrics[id].clicks;
      });
      savePendingMetrics(current);
    } catch {}
  }
}

// Auto flush when window closes or user navigates away
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    flushPendingAdMetrics();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingAdMetrics();
    }
  });
}

/**
 * Records an ad impression locally, flushing in one batch every 25 impressions
 */
export async function recordAdImpression(adId: string): Promise<void> {
  if (!adId) return;

  // 1. Update local cache immediately
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.map((a) =>
      a.id === adId ? { ...a, impressions: (a.impressions || 0) + 1 } : a
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Accumulate in pending batch
  const pending = getPendingMetrics();
  if (!pending[adId]) pending[adId] = { impressions: 0, clicks: 0 };
  pending[adId].impressions += 1;
  savePendingMetrics(pending);

  // 3. Count total pending impressions
  const totalPendingImpressions = Object.values(pending).reduce(
    (sum, m) => sum + (m.impressions || 0),
    0
  );

  // Send in ONE batched increment every 25 impressions
  if (totalPendingImpressions >= BATCH_IMPRESSIONS_THRESHOLD) {
    flushPendingAdMetrics();
  }
}

/**
 * Records an ad click locally
 */
export async function recordAdClick(adId: string): Promise<void> {
  if (!adId) return;

  // 1. Update local cache immediately
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.map((a) =>
      a.id === adId ? { ...a, clicks: (a.clicks || 0) + 1 } : a
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // 2. Accumulate in pending batch
  const pending = getPendingMetrics();
  if (!pending[adId]) pending[adId] = { impressions: 0, clicks: 0 };
  pending[adId].clicks += 1;
  savePendingMetrics(pending);
}

export async function submitSponsorEnquiry(
  userId: string,
  data: {
    businessName: string;
    websiteLink: string;
    email: string;
    phone?: string;
    message: string;
    package?: string;
    languageOption?: 'English' | 'Urdu' | 'both';
  }
): Promise<{ success: boolean; id: string }> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const docId = `${userId}_${todayStr}`;
  const db = getFirestoreDB();

  const packageName = data.package || 'Starter';

  const enquiryData: any = {
    id: docId,
    userId,
    businessName: data.businessName.trim(),
    websiteLink: data.websiteLink.trim(),
    email: data.email.trim(),
    phone: data.phone?.trim() || '',
    message: data.message.trim().slice(0, 1000),
    package: packageName,
    status: 'new',
    createdAt: serverTimestamp(),
  };

  if (data.languageOption) {
    enquiryData.languageOption = data.languageOption;
  }

  if (db) {
    const docRef = doc(db, 'sponsor_enquiries', docId);
    await setDoc(docRef, enquiryData);
  }

  // Also mirror to local storage
  try {
    const key = 'joyearn_sponsor_enquiries_local';
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = existing.filter((e: any) => e.id !== docId);
    localStorage.setItem(
      key,
      JSON.stringify([
        { ...enquiryData, createdAt: new Date().toISOString() },
        ...filtered,
      ])
    );
  } catch {}

  return { success: true, id: docId };
}

export async function loadAllSponsorEnquiriesForAdmin(): Promise<SponsorEnquiry[]> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const colRef = collection(db, 'sponsor_enquiries');
      const snap = await getDocs(colRef);
      const list: SponsorEnquiry[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SponsorEnquiry);
      });
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis
          ? a.createdAt.toMillis()
          : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toMillis
          ? b.createdAt.toMillis()
          : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
      if (list.length > 0) return list;
    } catch (e) {
      console.warn('Error loading sponsor enquiries from Firestore:', e);
    }
  }

  try {
    const key = 'joyearn_sponsor_enquiries_local';
    const list: SponsorEnquiry[] = JSON.parse(localStorage.getItem(key) || '[]');
    return list;
  } catch {
    return [];
  }
}

export async function markSponsorEnquiryContacted(enquiryId: string): Promise<boolean> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'sponsor_enquiries', enquiryId);
      await updateDoc(docRef, { status: 'contacted' });
    } catch (e) {
      console.warn('Error updating sponsor enquiry status in Firestore:', e);
    }
  }

  try {
    const key = 'joyearn_sponsor_enquiries_local';
    const list: SponsorEnquiry[] = JSON.parse(localStorage.getItem(key) || '[]');
    const updated = list.map((item) =>
      item.id === enquiryId ? { ...item, status: 'contacted' as const } : item
    );
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {}

  return true;
}

// ============================================================================
// 📦 SPONSOR REQUESTS SYSTEM (Buy Package / Contact Owner)
// ============================================================================

export async function submitSponsorRequest(
  data: Omit<SponsorRequest, 'id' | 'status' | 'submittedAt'>
): Promise<{ success: boolean; id: string }> {
  const newId = 'sp_req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
  const newRequest: SponsorRequest = {
    ...data,
    id: newId,
    status: 'pending',
    submittedAt: new Date().toISOString(),
  };

  // 1. Local update
  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY) || '[]');
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify([newRequest, ...existing]));
  } catch {}

  // 2. Firestore update
  const db = getFirestoreDB();
  if (db) {
    try {
      await setDoc(doc(db, 'sponsor_requests', newId), newRequest);
    } catch (e) {
      console.warn('Error saving sponsor request to Firestore:', e);
    }
  }

  return { success: true, id: newId };
}

export async function loadAllSponsorRequestsForAdmin(): Promise<SponsorRequest[]> {
  const db = getFirestoreDB();
  if (db) {
    try {
      const colRef = collection(db, 'sponsor_requests');
      const snap = await getDocs(colRef);
      const list: SponsorRequest[] = [];
      snap.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as SponsorRequest);
      });
      if (list.length > 0) {
        list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
        return list;
      }
    } catch (e) {
      console.warn('Error loading sponsor requests from Firestore:', e);
    }
  }

  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_STORAGE_REQUESTS_KEY) || '[]');
    return list;
  } catch {
    return [];
  }
}

export async function approveSponsorRequest(
  requestId: string,
  startDate: string,
  endDate: string,
  targetReach: number
): Promise<boolean> {
  const db = getFirestoreDB();
  const all = await loadAllSponsorRequestsForAdmin();
  const req = all.find((r) => r.id === requestId);
  if (!req) return false;

  const updatedReq: SponsorRequest = {
    ...req,
    status: 'approved',
    startDate,
    endDate,
  };

  // Update in local cache
  try {
    const updatedAll = all.map((r) => (r.id === requestId ? updatedReq : r));
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(updatedAll));
  } catch {}

  // Update in Firestore
  if (db) {
    try {
      await updateDoc(doc(db, 'sponsor_requests', requestId), {
        status: 'approved',
        startDate,
        endDate,
      });
    } catch (e) {
      console.warn('Error updating sponsor request status in Firestore:', e);
    }
  }

  // Create active SponsorAd so it automatically goes live for that period
  await createSponsorAd({
    title: req.adTitle || req.businessName,
    sponsorName: req.businessName || req.name,
    shortText: `${req.businessName} - Official Verified Sponsor`,
    destinationLink: req.adLink,
    startDate,
    endDate,
    isActive: true,
    paid: 'yes',
    amountPaid: req.packagePriceUSD,
    package: req.packageName,
    targetReach: targetReach || req.packageReach,
    imageUrl: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&auto=format&fit=crop&q=80',
  });

  return true;
}

export async function rejectSponsorRequest(requestId: string, reason?: string): Promise<boolean> {
  const db = getFirestoreDB();
  const all = await loadAllSponsorRequestsForAdmin();
  const updatedAll = all.map((r) =>
    r.id === requestId ? { ...r, status: 'rejected' as const, notes: reason } : r
  );
  try {
    localStorage.setItem(LOCAL_STORAGE_REQUESTS_KEY, JSON.stringify(updatedAll));
  } catch {}

  if (db) {
    try {
      await updateDoc(doc(db, 'sponsor_requests', requestId), {
        status: 'rejected',
        notes: reason || '',
      });
    } catch (e) {
      console.warn('Error rejecting sponsor request in Firestore:', e);
    }
  }

  return true;
}

