import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  LogIn,
  RefreshCw
} from 'lucide-react';
import { googleSignIn } from '../services/googleAuth';
import { AppUser } from '../types';
import { soundService } from '../services/soundService';
import { claimWelcomeBonusInFirestore } from '../services/firestoreService';

interface FirstOpenAuthScreenProps {
  onSuccessAuth: (user: AppUser, welcomeBonus: number) => void;
  onExploreAsGuest?: () => void;
  seniorMode: boolean;
}

export const FirstOpenAuthScreen: React.FC<FirstOpenAuthScreenProps> = ({
  onSuccessAuth,
  seniorMode
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('joyearn_user_email') || '';
    } catch {
      return '';
    }
  });
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem('joyearn_userName') || '';
    } catch {
      return '';
    }
  });

  const handleGoogleContinue = async () => {
    soundService.playClick();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await googleSignIn();
      if (result?.user) {
        const appUser: AppUser = {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          confirmationEmailSent: false
        };

        localStorage.setItem('joyearn_stable_device_uid', result.user.uid);
        localStorage.setItem('joyearn_app_user', JSON.stringify(appUser));
        localStorage.setItem('joyearn_has_completed_onboarding', 'true');
        if (result.user.displayName) {
          localStorage.setItem('joyearn_userName', result.user.displayName.split(' ')[0]);
        }
        if (result.user.email) {
          localStorage.setItem('joyearn_user_email', result.user.email);
        }

        // Preserve existing Firestore new-user / existing-user recognition
        let welcomeBonus = 0;
        try {
          const bonusClaimResult = await claimWelcomeBonusInFirestore(
            result.user.uid,
            result.user.email,
            result.user.displayName
          );
          if (!bonusClaimResult.alreadyClaimed) {
            welcomeBonus = 50;
          }
        } catch {
          // Do not block sign-in if Firestore check is offline
        }

        soundService.playFanfare();
        onSuccessAuth(appUser, welcomeBonus);
      } else {
        setIsLoading(false);
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked') || err?.isPopupBlocked) {
        setErrorMessage(
          seniorMode
            ? 'گوگل پاپ اپ بلاک ہو گیا ہے۔ براہ کرم سائن ان فارم استعمال کریں۔'
            : 'Google Sign-In popup was blocked by your browser. Please allow popups or use Sign In below.'
        );
        return;
      }

      console.error('Google Sign In failed:', err);
      if (err.message?.includes('popup-closed-by-user') || err.code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          seniorMode
            ? 'لاگ ان ونڈو بند کر دی گئی۔ براہ کرم دوبارہ کوشش کریں۔'
            : 'Sign-in was cancelled. Please try again.'
        );
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage(
          seniorMode
            ? 'انٹرنیٹ کنکشن کا مسئلہ ہے۔ براہ کرم دوبارہ کوشش کریں۔'
            : 'Network connection issue. Please check your internet connection and try again.'
        );
      } else {
        setErrorMessage(err.message || 'Unable to sign in with Google. Please try again.');
      }
    }
  };

  const handleSubmitSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    const cleanName = name.trim() || cleanEmail.split('@')[0] || 'Learner';

    soundService.playClick();
    let stableUid = localStorage.getItem('joyearn_stable_device_uid');
    if (!stableUid) {
      stableUid = 'joy_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('joyearn_stable_device_uid', stableUid);
    }

    const localUser: AppUser = {
      uid: stableUid,
      displayName: cleanName,
      email: cleanEmail,
      photoURL: null,
      confirmationEmailSent: false
    };

    localStorage.setItem('joyearn_userName', cleanName);
    localStorage.setItem('joyearn_user_email', cleanEmail);
    localStorage.setItem('joyearn_app_user', JSON.stringify(localUser));
    localStorage.setItem('joyearn_has_completed_onboarding', 'true');

    soundService.playFanfare();
    onSuccessAuth(localUser, 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 p-4 overflow-y-auto">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs pointer-events-none" />

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border-4 border-white/80 relative space-y-6 my-auto text-center z-10 animate-fade-in">
        {/* JoyEarn Rewards Brand Header */}
        <div className="space-y-3">
          <div className="mx-auto w-18 h-18 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-xl shadow-pink-500/35 text-4xl border-2 border-white">
            🌸
          </div>
          <div>
            <h1 className="font-black text-2xl text-slate-900 tracking-tight">
              JoyEarn <span className="text-rose-600">Rewards</span>
            </h1>
          </div>
        </div>

        {/* Error Alert (only displayed on failure) */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-left text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-red-600 font-medium">{errorMessage}</p>
          </div>
        )}

        {!showSignInForm ? (
          /* Initial Login View: Exactly Two Buttons */
          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={handleGoogleContinue}
              disabled={isLoading}
              className="w-full h-13 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border-2 border-slate-200 hover:border-slate-300 shadow-md tap-bounce flex items-center justify-center gap-3 transition-all disabled:opacity-70"
              style={{ fontFamily: 'Roboto, -apple-system, sans-serif' }}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                  <span className="text-sm font-bold text-rose-600">Connecting with Google...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="text-sm font-extrabold text-slate-800">
                    Continue with Google
                  </span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setErrorMessage(null);
                setShowSignInForm(true);
              }}
              disabled={isLoading}
              className="w-full h-12 px-4 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold rounded-2xl shadow-md shadow-rose-500/25 tap-bounce flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-70"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        ) : (
          /* Existing Sign-In Interface */
          <form onSubmit={handleSubmitSignIn} className="space-y-3 text-left pt-1">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setShowSignInForm(false);
                  setErrorMessage(null);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 py-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span className="text-xs font-extrabold text-slate-700">Sign In</span>
            </div>

            <div className="space-y-2.5">
              <input
                type="email"
                required
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500 focus:bg-white transition-colors"
              />
              <input
                type="text"
                placeholder="Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold rounded-2xl text-sm shadow-md shadow-rose-500/25 tap-bounce flex items-center justify-center gap-2 transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
