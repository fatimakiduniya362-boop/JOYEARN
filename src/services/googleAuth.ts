import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
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

// Configure Google Auth Provider with Workspace scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token strictly in memory
let cachedAccessToken: string | null = null;
let isSigningIn = false;

/**
 * Initialize auth state listener. Clears memory token on logout.
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
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      crashlytics.log('User logged out / guest state');
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Sign in with Google Popup
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    crashlytics.log('Initiating Google Sign-In popup flow');
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    cachedAccessToken = credential?.accessToken || null;
    crashlytics.log(`Google Sign-In successful for ${result.user.email}`);
    crashlytics.setUserId(result.user.uid);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-blocked' || error?.message?.includes('popup-blocked')) {
      console.warn('Google Sign In popup was blocked by browser or iframe sandbox policy.');
      crashlytics.recordError(error, {
        type: 'non-fatal',
        source: 'googleSignInFlow',
        metadata: { errorCode: 'auth/popup-blocked' },
      });
      error.isPopupBlocked = true;
      throw error;
    }
    console.error('Google Sign In error:', error);
    crashlytics.recordError(error, {
      type: 'non-fatal',
      source: 'googleSignInFlow',
      metadata: { errorCode: error.code || 'unknown' },
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
 * Log out user and purge in-memory token
 */
export const logout = async () => {
  await signOut(auth);
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
 * Send JoyEarn Account Confirmation email via Gmail API
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
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No Gmail access token available. Please sign in with Google first.');
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>JoyEarn Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fdf2f8; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 24px; padding: 32px; border: 2px solid #fbcfe8; box-shadow: 0 10px 25px -5px rgba(244, 63, 94, 0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 42px; line-height: 1;">🌸🎡</div>
      <h1 style="color: #db2777; margin: 8px 0 4px; font-size: 26px; font-weight: 800;">JoyEarn</h1>
      <p style="color: #64748b; font-size: 13px; margin: 0; font-weight: 600;">Safe • Family-Friendly • Genuine Rewards</p>
    </div>

    <!-- Greeting Banner -->
    <div style="background: linear-gradient(135deg, #fdf2f8, #f0fdf4); border: 1px solid #fbcfe8; border-radius: 16px; padding: 18px; margin-bottom: 24px;">
      <h2 style="color: #0f172a; margin: 0 0 6px; font-size: 18px;">Welcome & Account Confirmed! 🎉</h2>
      <p style="color: #475569; margin: 0; font-size: 14px; line-height: 1.5;">
        Hello <strong>${recipientName || 'Valued Member'}</strong>,<br>
        Your Google account (<strong>${recipientEmail}</strong>) has been successfully connected to JoyEarn!
      </p>
    </div>

    <!-- Account Details Summary -->
    <div style="background: #f8fafc; border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
      <h3 style="margin: 0 0 14px; color: #334155; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Your Live Account Summary:</h3>
      
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Account Status:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #059669; text-align: right;">Verified Human (Safe)</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Total JoyPoints:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #d97706; text-align: right;">⭐ ${points.toLocaleString()} Points</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Daily Streak:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #e11d48; text-align: right;">🔥 Day ${streakDays} Active</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b;">Lucky Wheel:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #7c3aed; text-align: right;">🎡 1 Free Spin Daily Ready!</td>
        </tr>
      </table>
    </div>

    <!-- Bonus Feature Highlights -->
    <div style="margin-bottom: 24px;">
      <h4 style="margin: 0 0 10px; color: #1e293b; font-size: 15px;">What can you do right now?</h4>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 13px; line-height: 1.6;">
        <li><strong>🎡 Spin the Lucky Wheel</strong>: Spin once a day to win bonus points instantly!</li>
        <li><strong>📦 Claim Daily Reward Chest</strong>: Keep your streak alive for larger weekly gifts.</li>
        <li><strong>📺 Watch Safe Family Videos</strong>: Learn cooking, crafts, science, and stories.</li>
        <li><strong>🌟 Unlock In-App Perks</strong>: Use your earned JoyPoints to unlock themes, badges, and learning boosts.</li>
      </ul>
    </div>

    <!-- Assurance -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
      <p style="margin: 0 0 6px;">JoyEarn operates on 100% transparency. We never charge any fees and never promise false schemes.</p>
      <p style="margin: 0;">Thank you for being part of our safe learning and reward community!</p>
    </div>

  </div>
</body>
</html>
    `.trim();

    const subject = 'JoyEarn Account Confirmed! 🎉 Welcome & Free Lucky Spin Activated';
    // RFC 2822 email format
    const emailLines = [
      `From: me`,
      `To: ${recipientEmail}`,
      `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ];

    const rawEmail = emailLines.join('\r\n');
    // base64url encode
    const base64UrlEncoded = btoa(unescape(encodeURIComponent(rawEmail)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: base64UrlEncoded
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gmail API returned ${response.status}`);
    }

    const result = await response.json();
    return { success: true, messageId: result.id };
  } catch (error: any) {
    console.error('Failed to send confirmation email:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
};
