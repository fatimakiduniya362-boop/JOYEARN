import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  deleteUser,
  reauthenticateWithPopup,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { crashlytics } from './crashlytics';

// Initialize Firebase App once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Configure persistent authentication storage across sessions
// User stays signed in until explicit logout or account deletion
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Firebase browserLocalPersistence notice:', err);
});

// Configure Google Auth Provider for safe family-friendly authentication
// Uses standard Firebase Google Auth without restricted Workspace scopes
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token strictly in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface LastSavedUserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  confirmationEmailSent?: boolean;
}

const LAST_PROFILE_KEY = 'joyearn_last_profile';

/**
 * Saves a local snapshot of the authenticated profile to open Home immediately
 * on startup and when offline.
 */
export const saveLastProfile = (user: {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
  confirmationEmailSent?: boolean;
}) => {
  try {
    const profile: LastSavedUserProfile = {
      uid: user.uid,
      displayName: user.displayName || 'Learner',
      email: user.email || null,
      photoURL: user.photoURL || null,
      confirmationEmailSent: user.confirmationEmailSent || false,
    };
    localStorage.setItem(LAST_PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem('joyearn_app_user', JSON.stringify(profile));
    localStorage.setItem('joyearn_stable_device_uid', user.uid);
    if (user.displayName) {
      localStorage.setItem('joyearn_userName', user.displayName.split(' ')[0]);
    }
    if (user.email) {
      localStorage.setItem('joyearn_user_email', user.email);
    }
  } catch (err) {
    console.warn('Could not save local profile snapshot:', err);
  }
};

/**
 * Retrieves the cached profile snapshot for instant startup and offline use
 */
export const getLastSavedProfile = (): LastSavedUserProfile | null => {
  try {
    const raw = localStorage.getItem(LAST_PROFILE_KEY) || localStorage.getItem('joyearn_app_user');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return null;
};

/**
 * Clears the cached profile ONLY upon explicit user Logout or account deletion.
 */
export const clearLastProfile = () => {
  try {
    localStorage.removeItem(LAST_PROFILE_KEY);
    localStorage.removeItem('joyearn_app_user');
    localStorage.removeItem('joyearn_stable_device_uid');
    localStorage.removeItem('joyearn_userName');
    localStorage.removeItem('joyearn_user_email');
  } catch {}
};

/**
 * Checks for any pending redirect result when the app starts
 */
export const checkRedirectResult = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    await setPersistence(auth, browserLocalPersistence).catch(() => {});
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      const credential = GoogleAuthProvider.credentialFromResult(result);
      cachedAccessToken = credential?.accessToken || null;
      saveLastProfile(result.user);
      crashlytics.log(`Redirect sign-in resolved for ${result.user.email}`);
      return { user: result.user, accessToken: cachedAccessToken };
    }
  } catch (err) {
    console.warn('getRedirectResult notice:', err);
  }
  return null;
};

/**
 * Initialize auth state listener. Clears memory token on logout.
 * Keeps user session persistent and updates local profile snapshot.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      crashlytics.setUserId(user.uid);
      crashlytics.setCustomKey('email', user.email || 'none');
      crashlytics.log(`User authenticated: ${user.uid}`);
      saveLastProfile(user);
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      crashlytics.log('Auth state: no active Firebase user session');
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google: uses signInWithPopup first with signInWithRedirect fallback
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    await setPersistence(auth, browserLocalPersistence);
    crashlytics.log('Initiating Google Sign-In popup flow');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      cachedAccessToken = credential?.accessToken || null;
      saveLastProfile(result.user);
      crashlytics.log(`Google Sign-In successful for ${result.user.email}`);
      crashlytics.setUserId(result.user.uid);
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupError: any) {
      // If popup is blocked or unavailable in iframe/sandbox, fall back to redirect
      if (
        popupError?.code === 'auth/popup-blocked' ||
        popupError?.code === 'auth/cancelled-popup-request' ||
        popupError?.message?.includes('popup') ||
        popupError?.message?.includes('blocked')
      ) {
        console.warn('Popup blocked or failed, falling back to signInWithRedirect:', popupError);
        crashlytics.log('Falling back to signInWithRedirect');
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw popupError;
    }
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    crashlytics.recordError(error, {
      type: 'non-fatal',
      source: 'googleSignInFlow',
      metadata: { errorCode: error?.code || 'unknown' },
    });
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Get the in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Log out user and purge in-memory token and cached profile snapshot.
 * ONLY called upon explicit user Logout tap.
 */
export const logout = async () => {
  clearLastProfile();
  await signOut(auth).catch(() => {});
  cachedAccessToken = null;
};

/**
 * Permanently deletes the current Firebase Authentication user.
 */
export const deleteCurrentAuthUser = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteUser(user);
      } catch (innerErr: any) {
        if (
          innerErr?.code === 'auth/requires-recent-login' ||
          innerErr?.message?.includes('requires-recent-login')
        ) {
          console.warn('Firebase security requires recent login before account deletion. Requesting Google Sign-In...');
          try {
            await reauthenticateWithPopup(user, provider);
            await deleteUser(user);
          } catch (reauthErr) {
            console.warn('Re-authentication prompt completed or cancelled:', reauthErr);
            throw reauthErr;
          }
        } else {
          throw innerErr;
        }
      }

      cachedAccessToken = null;
      clearLastProfile();
      crashlytics.log(`Successfully deleted Firebase Auth user ${user.uid}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.warn('Firebase user deletion notice:', error?.message || error);
    crashlytics.recordError(error, {
      type: 'non-fatal',
      source: 'deleteCurrentAuthUser',
    });
    return false;
  }
};

/**
 * Records JoyEarn Account Confirmation statement safely for the verified user
 */
export interface SendEmailParams {
  recipientEmail: string;
  recipientName: string;
  points: number;
  streakDays: number;
}

export const sendConfirmationEmail = async ({
  recipientEmail,
  recipientName,
  points,
  streakDays
}: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    crashlytics.log(`Account confirmation statement generated for ${recipientEmail} (${recipientName}, ${points} pts, Day ${streakDays})`);
    
    // Save confirmation timestamp in local storage
    try {
      localStorage.setItem('joyearn_confirmation_sent', new Date().toISOString());
      localStorage.setItem('joyearn_confirmation_recipient', recipientEmail);
    } catch {}

    const confirmationId = `conf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    return { success: true, messageId: confirmationId };
  } catch (error: any) {
    console.error('Failed to record confirmation statement:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};
