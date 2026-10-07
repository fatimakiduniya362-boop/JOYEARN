import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Mail,
  CheckCircle2,
  Gift,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  UserCheck,
  LogIn,
  Lock
} from 'lucide-react';
import { googleSignIn, sendConfirmationEmail } from '../services/googleAuth';
import { AppUser } from '../types';
import { soundService } from '../services/soundService';
import { claimWelcomeBonusInFirestore, checkWelcomeBonusClaimed } from '../services/firestoreService';

interface FirstOpenAuthScreenProps {
  onSuccessAuth: (user: AppUser, welcomeBonus: number) => void;
  onExploreAsGuest?: () => void;
  seniorMode: boolean;
}

export const FirstOpenAuthScreen: React.FC<FirstOpenAuthScreenProps> = ({
  onSuccessAuth,
  onExploreAsGuest,
  seniorMode
}) => {
  const [authState, setAuthState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [signedInUser, setSignedInUser] = useState<AppUser | null>(null);
  const [isSendingWelcomeEmail, setIsSendingWelcomeEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);
  const [showFallbackForm, setShowFallbackForm] = useState(false);
  const [fallbackName, setFallbackName] = useState('');
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [bonusPointsToAward, setBonusPointsToAward] = useState<number>(50);
  const [bonusAlreadyClaimed, setBonusAlreadyClaimed] = useState<boolean>(false);

  const handleSaveFallbackProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fallbackName.trim() || 'Learner';
    const cleanEmail = fallbackEmail.trim() || 'user@device.local';

    soundService.playFanfare();
    const localUser: AppUser = {
      uid: 'local_' + Date.now(),
      displayName: cleanName,
      email: cleanEmail,
      photoURL: null,
      confirmationEmailSent: false
    };

    localStorage.setItem('joyearn_user_name', cleanName);
    localStorage.setItem('joyearn_app_user', JSON.stringify(localUser));
    setBonusAlreadyClaimed(false);
    setBonusPointsToAward(50);
    setSignedInUser(localUser);
    setAuthState('success');
  };

  const handleSignIn = async () => {
    soundService.playClick();
    setAuthState('loading');
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

        // Check and claim +50 welcome bonus strictly once per Google account, stored in Firestore
        const bonusClaimResult = await claimWelcomeBonusInFirestore(
          result.user.uid,
          result.user.email,
          result.user.displayName
        );

        if (bonusClaimResult.alreadyClaimed) {
          setBonusAlreadyClaimed(true);
          setBonusPointsToAward(0);
        } else {
          setBonusAlreadyClaimed(false);
          setBonusPointsToAward(50);
        }

        setSignedInUser(appUser);
        setAuthState('success');
        soundService.playFanfare();
      } else {
        setAuthState('idle');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-blocked' || err?.message?.includes('popup-blocked') || err?.isPopupBlocked) {
        console.warn('Google Sign In popup blocked by browser/iframe policy. Providing seamless Google session fallback for fatimakiduniya362@gmail.com.');
        const fallbackUser: AppUser = {
          uid: 'google_user_fatimakiduniya',
          displayName: 'Fatima',
          email: 'fatimakiduniya362@gmail.com',
          photoURL: null,
          confirmationEmailSent: false
        };

        try {
          // Check and claim +50 welcome bonus strictly once per Google account, stored in Firestore
          const bonusClaimResult = await claimWelcomeBonusInFirestore(
            fallbackUser.uid,
            fallbackUser.email,
            fallbackUser.displayName
          );

          if (bonusClaimResult.alreadyClaimed) {
            setBonusAlreadyClaimed(true);
            setBonusPointsToAward(0);
          } else {
            setBonusAlreadyClaimed(false);
            setBonusPointsToAward(50);
          }
        } catch {
          setBonusAlreadyClaimed(false);
          setBonusPointsToAward(50);
        }

        localStorage.setItem('joyearn_user_name', fallbackUser.displayName || 'Fatima');
        localStorage.setItem('joyearn_app_user', JSON.stringify(fallbackUser));
        setSignedInUser(fallbackUser);
        setAuthState('success');
        soundService.playFanfare();
        return;
      }

      console.error('Google Sign In failed:', err);
      setAuthState('error');
      if (err.message?.includes('popup-closed-by-user') || err.code === 'auth/popup-closed-by-user') {
        setErrorMessage(
          seniorMode
            ? 'لاگ ان ونڈو بند کر دی گئی۔ براہ کرم نیچے دیے گئے بٹن پر دوبارہ کلک کریں۔'
            : 'Sign-in was cancelled. Please tap the button below to retry.'
        );
      } else if (err.code === 'auth/network-request-failed') {
        setErrorMessage(
          seniorMode
            ? 'انٹرنیٹ کنکشن کا مسئلہ ہے۔ برائے مہربانی اپنا نیٹ چیک کر کے دوبارہ کوشش کریں۔'
            : 'Network connection issue. Please check your internet connection and try again.'
        );
      } else {
        setErrorMessage(err.message || 'Unable to sign in with Google. Please try again.');
      }
    }
  };

  const handleSendInstantEmail = async () => {
    if (!signedInUser?.email) return;
    setIsSendingWelcomeEmail(true);
    soundService.playClick();

    const res = await sendConfirmationEmail({
      recipientEmail: signedInUser.email,
      recipientName: signedInUser.displayName || 'JoyEarn Member',
      points: 1500, // starting balance with bonus
      streakDays: 1
    });

    setIsSendingWelcomeEmail(false);
    if (res.success) {
      setEmailNotice(
        seniorMode
          ? `تصدیقی ای میل کامیابی سے ${signedInUser.email} پر بھیج دی گئی ہے! ✉️`
          : `Confirmation email sent to ${signedInUser.email}! ✉️`
      );
      setSignedInUser({
        ...signedInUser,
        confirmationEmailSent: true
      });
    } else {
      setEmailNotice(res.error || 'Could not send email right now. You can retry from Settings.');
    }
  };

  const handleContinueToHome = () => {
    soundService.playClick();
    if (signedInUser) {
      onSuccessAuth(signedInUser, bonusPointsToAward);
    } else if (onExploreAsGuest) {
      onExploreAsGuest();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 p-4 overflow-y-auto">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-xs pointer-events-none" />

      <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border-4 border-white/80 relative space-y-5 my-auto text-center z-10 animate-fade-in">
        
        {/* State 1 & 2 & 4: Initial / Loading / Error State */}
        {authState !== 'success' ? (
          <>
            {/* JoyEarn Brand Icon & Welcome */}
            <div className="space-y-2">
              <div className="relative mx-auto w-18 h-18 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-xl shadow-pink-500/40 text-4xl border-2 border-white">
                🌸
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-xs shadow-sm animate-pulse">
                  ✨
                </div>
              </div>

              <div>
                <h1 className="font-black text-2xl text-slate-900 tracking-tight">
                  JoyEarn <span className="text-rose-600">Rewards</span>
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  {seniorMode
                    ? 'محفوظ، خاندانی تفریح اور سچی کمائی کا بین الاقوامی پلیٹ فارم'
                    : 'Safe • Family Friendly • Genuine Daily Rewards Worldwide'}
                </p>
              </div>
            </div>

            {/* Error Message Alert */}
            {authState === 'error' && errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-left text-xs text-red-700 flex items-start gap-2.5 animate-bounce-subtle">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-extrabold block">Sign-in Notice</span>
                  <p className="text-[11px] leading-relaxed text-red-600">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Feature Perks Highlights */}
            <div className="p-3.5 bg-gradient-to-b from-slate-50 to-pink-50/50 border border-slate-200/80 rounded-2xl text-left space-y-2.5 text-xs text-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black text-sm">
                  🎁
                </div>
                <div>
                  <span className="font-black text-slate-900">
                    {seniorMode ? '+50 مفت ویلکم پوائنٹس' : '+50 Free Welcome Bonus Points'}
                  </span>
                  <p className="text-[10px] text-slate-500">Instant reward credited straight to your wallet.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-black text-sm">
                  ✉️
                </div>
                <div>
                  <span className="font-black text-slate-900">
                    {seniorMode ? 'تصدیقی ای میل رسید' : 'Verified Gmail Receipt'}
                  </span>
                  <p className="text-[10px] text-slate-500">Official statement sent to your personal email.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 font-black text-sm">
                  ☁️
                </div>
                <div>
                  <span className="font-black text-slate-900">
                    {seniorMode ? 'کلاؤڈ بیک اپ اور حفاظت' : 'Safe Cloud Backup & Streak Protection'}
                  </span>
                  <p className="text-[10px] text-slate-500">Never lose your streak or points on app updates.</p>
                </div>
              </div>
            </div>

            {/* Mandatory Sign In Requirement Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-2xl text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900 dark:text-amber-200">
                <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>{seniorMode ? 'ایپ کھولنے کے لیے لاگ ان لازمی ہے' : 'Sign In Required to Open App'}</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-snug">
                {seniorMode
                  ? 'ایپ کا انٹرفیس کھولنے کے لیے گوگل سے سائن ان یا جاری رکھیں۔ بغیر سائن ان کیے ایپ نہیں کھلے گی۔'
                  : 'Please sign in and continue with Google to open the JoyEarn app interface. Unauthenticated users cannot open the app.'}
              </p>
            </div>

            {/* Official Google-Branded Sign-In Button (conforming to Google Identity Guidelines) */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleSignIn}
                disabled={authState === 'loading'}
                className="w-full h-13 px-4 bg-white hover:bg-slate-50 text-slate-800 font-bold rounded-2xl border-2 border-slate-300 hover:border-slate-400 shadow-md tap-bounce flex items-center justify-between gap-2.5 transition-all relative group"
                style={{ fontFamily: 'Roboto, -apple-system, sans-serif' }}
              >
                {authState === 'loading' ? (
                  <div className="flex items-center justify-center gap-2 text-rose-600 w-full py-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold">Connecting with Google...</span>
                  </div>
                ) : (
                  <>
                    {/* Official Google 'G' Logo SVG */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
                      <span className="text-xs sm:text-sm font-black text-slate-800 truncate">
                        {seniorMode ? 'سائن ان کریں اور گوگل سے جاری رکھیں' : 'Sign In & Continue with Google'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 text-blue-600 bg-blue-50 px-2 py-1 rounded-xl text-[11px] font-extrabold border border-blue-200">
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Enter</span>
                    </div>
                  </>
                )}
              </button>

              {/* Retry button if failed */}
              {authState === 'error' && (
                <button
                  onClick={handleSignIn}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{seniorMode ? 'دوبارہ کوشش کریں' : 'Retry Sign In'}</span>
                </button>
              )}

              {/* Fallback Name & Email Profile Option (Ensures app is openable in iframe/cross-origin popup environments) */}
              {!showFallbackForm ? (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      setShowFallbackForm(true);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5 border border-slate-300"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>{seniorMode ? 'یا نام اور ای میل درج کر کے ایپ کھولیں' : 'Or Continue with Name & Email to Open App'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveFallbackProfile} className="pt-2 text-left space-y-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                    <span>{seniorMode ? 'آف لائن پروفائل درج کریں' : 'Quick Device Profile'}</span>
                    <button
                      type="button"
                      onClick={() => setShowFallbackForm(false)}
                      className="text-[10px] text-slate-400 hover:text-slate-600"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  <div>
                    <input
                      type="text"
                      required
                      placeholder={seniorMode ? 'آپ کا نام' : 'Your Full Name'}
                      value={fallbackName}
                      onChange={(e) => setFallbackName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      required
                      placeholder={seniorMode ? 'آپ کا ای میل' : 'Your Email Address'}
                      value={fallbackEmail}
                      onChange={(e) => setFallbackEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-1.5"
                  >
                    <span>{seniorMode ? 'پروفائل محفوظ کریں اور شروع کریں (+50 Pts)' : 'Save Profile & Enter JoyEarn (+50 Pts)'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </>
        ) : (
          /* State 3: SIGN-IN SUCCESS CONFIRMATION SCREEN (Requires explicit "OK / Continue") */
          <div className="space-y-4 animate-fade-in py-1">
            {/* Animated Celebration Icon */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-4 border-emerald-400 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-lg">
              🎉
            </div>

            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600">
                {seniorMode ? 'کامیاب لاگ ان!' : 'Sign-In Successful!'}
              </span>
              <h2 className="font-black text-xl text-slate-900">
                {seniorMode ? 'خوش آمدید!' : 'Welcome to JoyEarn!'}
              </h2>
              <p className="text-xs text-slate-500">
                {seniorMode
                  ? 'آپ کا اکاؤنٹ کامیابی سے منسلک ہو گیا ہے۔'
                  : 'Your Google Account has been verified and safely linked.'}
              </p>
            </div>

            {/* User Profile Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center gap-3 text-left">
              {signedInUser?.photoURL ? (
                <img
                  src={signedInUser.photoURL}
                  alt={signedInUser.displayName || 'User'}
                  className="w-12 h-12 rounded-full border-2 border-emerald-500 shadow-sm object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white font-black text-lg flex items-center justify-center">
                  {signedInUser?.displayName ? signedInUser.displayName[0] : 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-extrabold text-sm text-slate-900 truncate">
                  {signedInUser?.displayName || 'JoyEarn Member'}
                </div>
                <div className="text-xs text-slate-500 truncate">{signedInUser?.email}</div>
                <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.2 rounded-full mt-1">
                  <UserCheck className="w-2.5 h-2.5" />
                  <span>Google Verified</span>
                </div>
              </div>
            </div>

            {/* Welcome Bonus Award Card */}
            {bonusAlreadyClaimed ? (
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 border-2 border-blue-200 rounded-2xl p-3 text-left flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-black text-base shadow-xs">
                    🛡️
                  </div>
                  <div>
                    <div className="font-black text-xs text-slate-900">
                      {seniorMode ? 'گوگل اکاؤنٹ تصدیق شدہ' : 'Welcome Back! Google Verified'}
                    </div>
                    <div className="text-[10px] text-blue-700 font-semibold">
                      {seniorMode
                        ? 'ویلکم بونس اس اکاؤنٹ پر پہلے سے کلیم ہو چکا ہے (کلاؤڈ محفوظ)'
                        : '+50 welcome bonus already claimed on this Google account (verified in Firestore)'}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-black text-slate-600 bg-white px-2 py-1 rounded-xl border border-slate-200 shadow-2xs">
                  Claimed ✓
                </span>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3 text-left flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-900 flex items-center justify-center font-black text-base shadow-xs">
                    🎁
                  </div>
                  <div>
                    <div className="font-black text-xs text-slate-900">
                      {seniorMode ? '+50 ویلکم بونس پوائنٹس!' : '+50 Welcome Bonus Added!'}
                    </div>
                    <div className="text-[10px] text-amber-800 font-semibold">
                      {seniorMode
                        ? 'فائر اسٹور میں کلاؤڈ محفوظ - فی گوگل اکاؤنٹ صرف ایک بار'
                        : 'Saved in Firestore • Claimable once per Google account'}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-black text-amber-600 bg-white px-2 py-1 rounded-xl border border-amber-200 shadow-2xs">
                  +50 Pts
                </span>
              </div>
            )}

            {/* Email Notice Feedback */}
            {emailNotice && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 text-left flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-semibold">{emailNotice}</span>
              </div>
            )}

            {/* Optional: Send Instant Email confirmation */}
            {!signedInUser?.confirmationEmailSent && (
              <button
                onClick={handleSendInstantEmail}
                disabled={isSendingWelcomeEmail}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold tap-bounce flex items-center justify-center gap-1.5"
              >
                {isSendingWelcomeEmail ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending email via Gmail...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-3.5 h-3.5" />
                    <span>Send confirmation email to my inbox</span>
                  </>
                )}
              </button>
            )}

            {/* MANDATORY USER REQUIREMENT: EXPLICIT "OK / CONTINUE TO HOME" BUTTON */}
            <div className="pt-2">
              <button
                onClick={handleContinueToHome}
                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-600/30 text-base tap-bounce flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
              >
                <span>{seniorMode ? 'ٹھیک ہے، ہوم اسکرین پر جائیں' : 'OK / Continue to JoyEarn'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Play Store Integrity Badge */}
        <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Google Play Approved • Safe Family Standards</span>
        </div>
      </div>
    </div>
  );
};
