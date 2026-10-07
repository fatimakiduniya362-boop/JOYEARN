import { getFirestoreDB } from './firestoreService';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getTodayDateString } from './dailyQuizService';

const CONFIG_CACHE_KEY = 'joyearn_firestore_rotation_date';

/**
 * Reads from Firestore document `config/rotation`.
 * If document does not exist yet, initializes it with today's date
 * (the date the app is first opened by any user) and saves it once.
 */
export async function getLaunchDateFromFirestore(): Promise<string> {
  const db = getFirestoreDB();
  const fallbackToday = getTodayDateString();

  if (db) {
    try {
      const configDocRef = doc(db, 'config', 'rotation');
      const snap = await getDoc(configDocRef);

      if (snap.exists() && snap.data()?.launchDate) {
        const cloudDate = snap.data().launchDate;
        try {
          localStorage.setItem(CONFIG_CACHE_KEY, cloudDate);
        } catch {}
        return cloudDate;
      } else {
        // Document does not exist yet: initialize with first-open date
        const initialData = {
          launchDate: fallbackToday,
          createdAt: new Date().toISOString(),
          initialFirstOpenDate: fallbackToday,
          description: 'Automated 190+ day rotation launch date config',
        };
        await setDoc(configDocRef, initialData, { merge: true });
        try {
          localStorage.setItem(CONFIG_CACHE_KEY, fallbackToday);
        } catch {}
        return fallbackToday;
      }
    } catch (err) {
      console.warn('Error reading config/rotation from Firestore, using local fallback:', err);
    }
  }

  // Local storage fallback
  try {
    const cached = localStorage.getItem(CONFIG_CACHE_KEY);
    if (cached && /^\d{4}-\d{2}-\d{2}$/.test(cached)) {
      return cached;
    }
    localStorage.setItem(CONFIG_CACHE_KEY, fallbackToday);
  } catch {}

  return fallbackToday;
}

/**
 * Updates launch date in Firestore document `config/rotation` (Admin only)
 */
export async function updateLaunchDateInFirestore(
  newLaunchDate: string,
  adminEmail?: string
): Promise<boolean> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newLaunchDate)) {
    throw new Error('Launch date must be in YYYY-MM-DD format (e.g. 2026-10-07)');
  }

  // Update local cache
  try {
    localStorage.setItem(CONFIG_CACHE_KEY, newLaunchDate);
  } catch {}

  const db = getFirestoreDB();
  if (db) {
    try {
      const configDocRef = doc(db, 'config', 'rotation');
      await setDoc(
        configDocRef,
        {
          launchDate: newLaunchDate,
          updatedAt: new Date().toISOString(),
          updatedBy: adminEmail || 'admin',
        },
        { merge: true }
      );
      return true;
    } catch (err) {
      console.warn('Error updating config/rotation in Firestore:', err);
      throw err;
    }
  }
  return true;
}
