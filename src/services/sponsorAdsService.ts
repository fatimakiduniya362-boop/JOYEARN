import { SponsorAd } from '../types';
import { getFirestoreDB } from './firestoreService';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';

const LOCAL_STORAGE_KEY = 'joyearn_sponsor_ads_cache';

// Built-in verified sample sponsor ads (100% compliant with safety guidelines)
const DEFAULT_SPONSOR_ADS: SponsorAd[] = [
  {
    id: 'ad_green_roots',
    sponsorName: 'EcoFriendly Home & Garden',
    imageUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=600&auto=format&fit=crop&q=80',
    title: 'Grow Organic Herbs at Home',
    shortText: 'Discover easy beginner gardening starter kits with eco-safe organic seeds.',
    destinationLink: 'https://www.worldwildlife.org',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
    impressions: 48,
    clicks: 6,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ad_math_olympiad',
    sponsorName: 'Global Youth STEM Learning',
    imageUrl: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format&fit=crop&q=80',
    title: 'Free Science & Math Worksheets',
    shortText: 'Interactive, curriculum-aligned educational puzzle sets for students worldwide.',
    destinationLink: 'https://www.khanacademy.org',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    isActive: true,
    impressions: 62,
    clicks: 11,
    createdAt: new Date().toISOString(),
  }
];

export async function loadActiveSponsorAds(): Promise<SponsorAd[]> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const db = getFirestoreDB();

  if (db) {
    try {
      const colRef = collection(db, 'sponsor_ads');
      const q = query(colRef, where('isActive', '==', true));
      const snap = await getDocs(q);
      const list: SponsorAd[] = [];
      snap.forEach((d) => {
        const data = d.data() as SponsorAd;
        // Verify date window and valid https link
        if (
          (!data.startDate || data.startDate <= todayStr) &&
          (!data.endDate || data.endDate >= todayStr) &&
          data.destinationLink?.startsWith('https://')
        ) {
          list.push(data);
        }
      });

      if (list.length > 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
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
      const filtered = parsed.filter(
        (a) =>
          a.isActive &&
          (!a.startDate || a.startDate <= todayStr) &&
          (!a.endDate || a.endDate >= todayStr) &&
          a.destinationLink?.startsWith('https://')
      );
      if (filtered.length > 0) return filtered;
    }
  } catch {}

  return DEFAULT_SPONSOR_ADS;
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

export async function recordAdImpression(adId: string): Promise<void> {
  // Update local
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.map((a) =>
      a.id === adId ? { ...a, impressions: (a.impressions || 0) + 1 } : a
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Update Firestore
  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'sponsor_ads', adId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cur = snap.data()?.impressions || 0;
        await updateDoc(docRef, { impressions: cur + 1 });
      }
    } catch {}
  }
}

export async function recordAdClick(adId: string): Promise<void> {
  // Update local
  try {
    const all = await loadAllSponsorAdsForAdmin();
    const updated = all.map((a) =>
      a.id === adId ? { ...a, clicks: (a.clicks || 0) + 1 } : a
    );
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  // Update Firestore
  const db = getFirestoreDB();
  if (db) {
    try {
      const docRef = doc(db, 'sponsor_ads', adId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const cur = snap.data()?.clicks || 0;
        await updateDoc(docRef, { clicks: cur + 1 });
      }
    } catch {}
  }
}
