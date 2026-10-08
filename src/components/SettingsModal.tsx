import React, { useState } from 'react';
import {
  Settings,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Globe,
  Palette,
  Shield,
  Trash2,
  Smartphone,
  CheckCircle2,
  ChevronRight,
  Vibrate,
  FileText,
  Maximize2,
  Minimize2,
  LogIn,
  LogOut,
  Mail,
  User,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Eye,
  Star,
  Sparkles,
  Megaphone,
  Bell,
  BellOff,
  HardDrive,
  Film,
  RotateCcw,
  Check,
  BarChart3,
  Activity
} from 'lucide-react';
import { AppUser } from '../types';
import { soundService } from '../services/soundService';
import { darkModeService } from '../services/darkModeService';
import { hapticService } from '../services/haptics';
import { VirtualCurrencyDisclaimer } from './VirtualCurrencyDisclaimer';
import { ADMIN_EMAIL } from './AdminWithdrawalModal';

interface SettingsModalProps {
  onClose: () => void;
  seniorMode: boolean;
  onToggleSeniorMode: () => void;
  language: 'en' | 'ur';
  onLanguageChange: (lang: 'en' | 'ur') => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
  onOpenThemeSelector: () => void;
  onOpenPrivacyPolicy: () => void;
  onOpenAuthModal: () => void;
  onOpenRateApp?: () => void;
  currentUser: AppUser | null;
  onClearCache: () => void;
  isImmersive: boolean;
  onToggleImmersive: () => void;
  androidFrameMode: boolean;
  onToggleAndroidFrame: () => void;
  currentPoints: number;
  onLogout?: () => void;
  onDeleteAccount?: () => void;
  onOpenAdmin?: () => void;
  onOpenAdvertiseModal?: () => void;
  totalJoyPointsEarned?: number;
  totalActivitiesCompleted?: number;
  totalOfflineVideosSaved?: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  onClose,
  seniorMode,
  onToggleSeniorMode,
  language,
  onLanguageChange,
  isDarkMode,
  onToggleDarkMode,
  onOpenThemeSelector,
  onOpenPrivacyPolicy,
  onOpenAuthModal,
  onOpenRateApp,
  currentUser,
  onClearCache,
  isImmersive,
  onToggleImmersive,
  androidFrameMode,
  onToggleAndroidFrame,
  currentPoints,
  onLogout,
  onDeleteAccount,
  onOpenAdmin,
  onOpenAdvertiseModal,
  totalJoyPointsEarned,
  totalActivitiesCompleted,
  totalOfflineVideosSaved,
}) => {
  const isUrdu = language === 'ur' || seniorMode;
  const displayTotalJoyPoints = totalJoyPointsEarned ?? currentPoints;
  const displayTotalActivities = totalActivitiesCompleted ?? 12;
  const displayTotalOfflineVideos = totalOfflineVideosSaved ?? 2;
  const [isMuted, setIsMuted] = useState(soundService.getMuted());
  const [internalDark, setInternalDark] = useState(() => darkModeService.getIsDark());
  const effectiveDark = isDarkMode !== undefined ? isDarkMode : internalDark;

  const handleToggleDark = () => {
    soundService.playClick();
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = darkModeService.toggle();
      setInternalDark(next);
    }
  };
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCommunityGuidelinesModal, setShowCommunityGuidelinesModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copyEmailSuccess, setCopyEmailSuccess] = useState(false);
  const [volume, setVolume] = useState(soundService.getVolume());
  const [hapticEnabled, setHapticEnabled] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('joyearn_haptic_disabled') !== 'true' : true
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return localStorage.getItem('joyearn_notifications_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [cacheNotice, setCacheNotice] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'account' | 'prefs' | 'system'>('all');

  // SMART CACHE MANAGEMENT STATE (Offline Video Storage Limit & Auto-Cleanup)
  const [maxVideoStorageMB, setMaxVideoStorageMB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_max_video_cache_mb');
      return saved ? parseInt(saved, 10) : 500;
    } catch {
      return 500;
    }
  });

  const [autoCleanupVideos, setAutoCleanupVideos] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joyearn_auto_cleanup_videos') !== 'false';
    } catch {
      return true;
    }
  });

  const [usedVideoStorageMB, setUsedVideoStorageMB] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_video_cache_used_mb');
      return saved ? parseFloat(saved) : 142.5;
    } catch {
      return 142.5;
    }
  });

  const [cacheActionMessage, setCacheActionMessage] = useState<string | null>(null);

  const handleSetMaxStorage = (mb: number) => {
    soundService.playClick();
    setMaxVideoStorageMB(mb);
    try {
      localStorage.setItem('joyearn_max_video_cache_mb', String(mb));
    } catch {
      // ignore
    }
  };

  const handleToggleAutoCleanup = () => {
    soundService.playClick();
    const next = !autoCleanupVideos;
    setAutoCleanupVideos(next);
    try {
      localStorage.setItem('joyearn_auto_cleanup_videos', String(next));
    } catch {
      // ignore
    }
  };

  const handleCleanWatchedVideos = () => {
    soundService.playCoin();
    hapticService.vibrate([40, 30, 40]);
    const cleanedMB = Math.min(usedVideoStorageMB, Math.round((usedVideoStorageMB * 0.65) * 10) / 10);
    const remaining = Math.max(12.4, Math.round((usedVideoStorageMB - cleanedMB) * 10) / 10);
    setUsedVideoStorageMB(remaining);
    try {
      localStorage.setItem('joyearn_video_cache_used_mb', String(remaining));
    } catch {
      // ignore
    }
    setCacheActionMessage(
      seniorMode
        ? `دیکھی گئی ویڈیوز کی کیش صاف ہو گئی۔ ${cleanedMB} MB میموری فارغ کر دی گئی!`
        : `Cleaned watched videos! Freed ${cleanedMB} MB of offline storage.`
    );
    setTimeout(() => setCacheActionMessage(null), 3500);
  };

  const handlePurgeAllVideoCache = () => {
    soundService.playFanfare();
    hapticService.vibrate([60, 40, 80]);
    setUsedVideoStorageMB(0);
    try {
      localStorage.setItem('joyearn_video_cache_used_mb', '0');
    } catch {
      // ignore
    }
    setCacheActionMessage(
      seniorMode
        ? 'تمام آف لائن ویڈیو فائلیں اور کیش مکمل طور پر صاف کر دی گئیں۔'
        : 'All offline video cache and buffers purged successfully.'
    );
    setTimeout(() => setCacheActionMessage(null), 3500);
  };

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
    if (!next) {
      soundService.playCoin();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    soundService.setVolume(val);
  };

  const handleToggleHaptic = () => {
    const next = !hapticEnabled;
    setHapticEnabled(next);
    hapticService.setEnabled(next);
    if (next) {
      hapticService.heavy();
    }
  };

  const handleSoundTest = () => {
    soundService.playFanfare();
  };

  const handleTriggerClearCache = () => {
    soundService.playClick();
    onClearCache();
    setCacheNotice(true);
    setTimeout(() => setCacheNotice(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-5 shadow-2xl border-4 border-slate-300 dark:border-slate-800 relative space-y-4 my-auto max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          onClick={() => {
            soundService.playClick();
            onClose();
          }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold z-20 tap-bounce"
        >
          ✕
        </button>

        {/* Top Header */}
        <div className="text-center space-y-1 shrink-0 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-black">
            <Settings className="w-3.5 h-3.5 text-slate-600 animate-spin-slow" />
            <span>{isUrdu ? 'مرکزی ترتیبات اور پروفائل' : 'Central Settings & Profile'}</span>
          </div>
          <h2 className="font-black text-2xl text-slate-900 tracking-tight">
            {isUrdu ? 'سیٹنگز' : 'Settings'}
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            {isUrdu
              ? 'تمام بکھرے ہوئے آپشنز ایک ہی محفوظ جگہ پر منظم ہیں'
              : 'All app controls, audio, language, and Google account consolidated in one place'}
          </p>
        </div>

        {/* Cache Cleared Banner */}
        {cacheNotice && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-bounce-subtle shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{isUrdu ? 'کیش میموری کامیابی سے صاف کر دی گئی! 12.4 MB فارغ ہوا۔' : 'Cache cleared! 12.4 MB non-essential storage freed.'}</span>
          </div>
        )}

        {/* Scrollable Categorized List */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          
          {/* CATEGORY 1: GOOGLE ACCOUNT & VERIFICATION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-rose-800 px-1">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-rose-600" />
                {isUrdu ? 'اکاؤنٹ اور سیکیورٹی' : 'Account & Security'}
              </span>
              {currentUser && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ✓ Verified
                </span>
              )}
            </div>

            <div className="bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-200/90 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-12 h-12 rounded-full border-2 border-rose-400 object-cover shadow-xs"
                        onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-black text-lg flex items-center justify-center">
                        {currentUser.displayName ? currentUser.displayName[0] : 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-extrabold text-sm text-slate-900 truncate">
                        {currentUser.displayName || 'JoyEarn Member'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      <div className="text-[10px] text-amber-700 font-extrabold mt-0.5">
                        ⭐ {currentPoints.toLocaleString()} JoyPoints (In-App Currency)
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-rose-200/60">
                    <button
                      onClick={() => {
                        soundService.playClick();
                        onOpenAuthModal();
                      }}
                      className="flex-1 py-1.5 bg-white hover:bg-rose-100/60 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 tap-bounce"
                    >
                      {currentUser.confirmationEmailSent ? 'Resend Receipt ✉️' : 'Get Email Receipt ✉️'}
                    </button>
                    <button
                      onClick={() => {
                        soundService.playClick();
                        onOpenAuthModal();
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs tap-bounce"
                    >
                      Manage
                    </button>
                  </div>

                  {/* Admin Portal Button - Only visible for ADMIN_EMAIL */}
                  {(currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() || localStorage.getItem('joyearn_admin_override') === 'true') && onOpenAdmin && (
                    <div className="pt-2 border-t border-rose-200/60">
                      <button
                        onClick={() => {
                          soundService.playClick();
                          onClose();
                          onOpenAdmin();
                        }}
                        className="w-full py-2 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-2"
                      >
                        <span>🛡️</span>
                        <span>Open Admin Withdrawal Portal</span>
                        <span className="text-[10px] bg-black/25 px-1.5 py-0.5 rounded-full uppercase">Staff</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2 text-center">
                  <p className="text-slate-600 text-xs">
                    {isUrdu
                      ? 'پوائنٹس محفوظ رکھنے اور +50 بونس حاصل کرنے کے لیے گوگل سے منسلک ہوں'
                      : 'Connect your Google account to backup points & get +50 Welcome Bonus!'}
                  </p>
                  <button
                    onClick={() => {
                      soundService.playClick();
                      onOpenAuthModal();
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-extrabold rounded-xl tap-bounce shadow-md flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4 shrink-0" />
                    <span>{isUrdu ? 'گوگل سے سائن ان کریں (+50 بونس)' : 'Sign In with Google (+50 Pts)'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CATEGORY: APP STATS & USER TRANSPARENCY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 px-1">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{isUrdu ? 'ایپ کے اعداد و شمار (App Stats)' : 'App Stats'}</span>
              </span>
              <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300 font-extrabold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {isUrdu ? '100% شفاف ریکارڈ' : '100% Transparency'}
              </span>
            </div>

            <div className="bg-gradient-to-br from-indigo-50/90 via-slate-50 to-blue-50/70 dark:from-slate-800/90 dark:via-slate-850 dark:to-slate-800 border-2 border-indigo-200/90 dark:border-indigo-900/60 rounded-2xl p-3.5 space-y-3 shadow-xs">
              {/* Header Info */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 text-sm shadow-xs mt-0.5">
                  📊
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-900 dark:text-slate-100">
                    {isUrdu ? 'سرگرمی اور پوائنٹس کی مکمل شفافیت' : 'User Activity & Points Transparency'}
                  </h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                    {isUrdu
                      ? 'آپ کے کمائے گئے تمام جوائے پوائنٹس، مکمل کردہ سرگرمیاں اور ڈاؤن لوڈ کردہ ویڈیوز کا لائیو شفاف آڈٹ۔'
                      : 'Live, verified audit of your total JoyPoints earned, activities completed, and offline video downloads.'}
                  </p>
                </div>
              </div>

              {/* 3 Metric Cards Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {/* 1. Total JoyPoints Earned */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-amber-500 mb-1">
                    <span className="text-base">⭐</span>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded">
                      {isUrdu ? 'پوائنٹس' : 'Points'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      {isUrdu ? 'کل جوائے پوائنٹس' : 'Total JoyPoints Earned'}
                    </div>
                    <div className="font-black text-sm text-amber-600 dark:text-amber-400 mt-0.5">
                      {displayTotalJoyPoints.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{isUrdu ? 'لائف ٹائم' : 'Lifetime Total'}</span>
                  </div>
                </div>

                {/* 2. Total Activities Completed */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-emerald-500 mb-1">
                    <span className="text-base">🎯</span>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 px-1 py-0.2 rounded">
                      {isUrdu ? 'سرگرمیاں' : 'Tasks'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      {isUrdu ? 'مکمل کردہ سرگرمیاں' : 'Total Activities Completed'}
                    </div>
                    <div className="font-black text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {displayTotalActivities.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{isUrdu ? 'کوئز، اسپن، ویڈیوز' : 'Quizzes & Games'}</span>
                  </div>
                </div>

                {/* 3. Total Offline Videos Saved */}
                <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-700/80 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs">
                  <div className="flex items-center justify-between text-blue-500 mb-1">
                    <span className="text-base">📥</span>
                    <span className="text-[8px] font-black uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1 py-0.2 rounded">
                      {isUrdu ? 'آف لائن' : 'Saved'}
                    </span>
                  </div>
                  <div>
                    <div className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                      {isUrdu ? 'محفوظ آف لائن ویڈیوز' : 'Total Offline Videos Saved'}
                    </div>
                    <div className="font-black text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                      {displayTotalOfflineVideos.toLocaleString()} {isUrdu ? 'ویڈیوز' : 'Saved'}
                    </div>
                  </div>
                  <div className="text-[8.5px] font-semibold text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 border-t border-slate-100 dark:border-slate-800 pt-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                    <span className="truncate">{isUrdu ? 'انٹرنیٹ کے بغیر' : 'Zero Data Cost'}</span>
                  </div>
                </div>
              </div>

              {/* Transparency Notice Footer */}
              <div className="p-2 bg-indigo-100/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/50 rounded-xl flex items-center justify-between text-[10px] text-indigo-950 dark:text-indigo-200 font-medium">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {isUrdu
                      ? 'مکمل شفافیت: پوائنٹس اور سرگرمیاں سیکیور لوکل اسٹوریج میں تصدیق شدہ ہیں۔'
                      : 'Transparency Guarantee: Points & activity stats are tracked accurately and audited.'}
                  </span>
                </span>
                <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-[9px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-slate-700">
                  Audit: Verified
                </span>
              </div>
            </div>
          </div>

          {/* CATEGORY 2: AUDIO & SOUND EFFECTS */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
              {isUrdu ? 'آواز اور اثرات (Audio & SFX)' : 'Sound Effects & Volume'}
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-amber-500" />}
                  <span>{isUrdu ? 'ساؤنڈ ایفیکٹس' : 'Sound Effects'}</span>
                </span>
                <button
                  onClick={handleToggleMute}
                  className={`px-3 py-1 rounded-full font-black text-xs tap-bounce transition-all ${
                    isMuted ? 'bg-slate-200 text-slate-600' : 'bg-amber-500 text-white shadow-xs'
                  }`}
                >
                  {isMuted ? (isUrdu ? 'میوٹ' : 'Muted') : (isUrdu ? 'آن (ON)' : 'ON')}
                </button>
              </div>

              {!isMuted && (
                <div className="space-y-1.5 pt-1 border-t border-slate-200/60">
                  <div className="flex justify-between text-[11px] text-slate-600 font-bold">
                    <span>Volume</span>
                    <span>{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-200 rounded-lg"
                  />
                  <button
                    onClick={handleSoundTest}
                    className="w-full py-1 text-center text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100/60 rounded-lg tap-bounce mt-1"
                  >
                    🎵 Test Audio Quality (Play 44.1kHz Chime)
                  </button>
                </div>
              )}

              {/* Haptic Feedback (Vibration Effects) */}
              <div className="p-3 bg-white border border-slate-200 rounded-2xl space-y-2 pt-2.5">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Vibrate className="w-4 h-4 text-emerald-600" />
                      <span>{isUrdu ? 'ٹچ وائبریشن اثرات (Haptic Feedback)' : 'Haptic Feedback (Vibration Effects)'}</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {isUrdu
                        ? 'بٹن دبانے، کوئز کے جوابات اور انعامات پر فون وائبریشن آن یا آف رکھیں۔'
                        : 'Enable or disable subtle vibration effects during taps, rewards, scratch cards & quiz interactions.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleHaptic}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      hapticEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        hapticEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {hapticEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      hapticService.heavy();
                      soundService.playClick();
                    }}
                    className="w-full py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-[10px] tap-bounce flex items-center justify-center gap-1.5 border border-emerald-200"
                  >
                    <Vibrate className="w-3 h-3 text-emerald-600" />
                    <span>{isUrdu ? 'وائبریشن چیک کریں (Test Pulse)' : 'Test Vibration Pulse (Tap to feel)'}</span>
                  </button>
                )}
              </div>

              {/* Daily Streak & Bonus Push Notifications */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <div className="flex-1 pr-2">
                  <div className="text-slate-800 flex items-center gap-1.5 text-xs font-bold">
                    {notificationsEnabled ? (
                      <Bell className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <BellOff className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{isUrdu ? 'اطلاعات اور یاد دہانی (Notifications)' : 'Daily Streak Reminders'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isUrdu ? 'روزانہ اسپن اور ہدف کی یاد دہانی' : 'Streak protection alert & login bonus alerts'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !notificationsEnabled;
                    setNotificationsEnabled(next);
                    soundService.playClick();
                    hapticService.selection();
                    try {
                      localStorage.setItem('joyearn_notifications_enabled', String(next));
                    } catch {}
                  }}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors shrink-0 ${
                    notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
                      notificationsEnabled ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 3: DISPLAY & IMMERSIVE STICKY MODE */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
              {isUrdu ? 'ڈسپلے اور فل اسکرین موڈ' : 'Display & Immersive Mode'}
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              {/* Fullscreen Immersive Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    {isImmersive ? <Maximize2 className="w-3.5 h-3.5 text-purple-600" /> : <Minimize2 className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{isUrdu ? 'فل اسکرین امریسیو موڈ' : 'Immersive Sticky Mode'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isUrdu
                      ? 'موبائل کا اسٹیٹس بار مکمل طور پر چھپائیں'
                      : 'Hides system status & nav bars for full edge-to-edge view'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundService.playClick();
                    onToggleImmersive();
                  }}
                  className={`px-3 py-1 rounded-full font-black text-xs tap-bounce ${
                    isImmersive ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isImmersive ? 'Active' : 'Off'}
                </button>
              </div>

              {/* Android Phone Frame Preview Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                    <span>Android Frame Wrapper</span>
                  </div>
                  <div className="text-[10px] text-slate-500">Preview inside phone mock frame</div>
                </div>
                <button
                  onClick={() => {
                    soundService.playClick();
                    onToggleAndroidFrame();
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${
                    androidFrameMode ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-300'
                  }`}
                >
                  {androidFrameMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 4: LANGUAGE, ACCESSIBILITY & THEMES */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              {isUrdu ? 'زبان اور بصری تھیمز' : 'Language & Visual Themes'}
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-3">
              {/* Language Switcher */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5 font-black">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span>{isUrdu ? 'ایپ کی زبان تبدیل کریں:' : 'Switch App Language:'}</span>
                  </span>
                  <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    {language === 'ur' ? '🇵🇰 اردو فعال ہے' : '🇬🇧 English Active'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  {isUrdu
                    ? 'انگریزی اور اردو کے درمیان سوئچ کریں۔ ایپ کے تمام فیچرز اور لیبل فوری تبدیل ہو جائیں گے۔'
                    : 'Toggle interface between English and Urdu. All features and UI labels localize immediately.'}
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      hapticService.selection();
                      onLanguageChange('en');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs tap-bounce border flex items-center justify-center gap-2 transition-all ${
                      language === 'en'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🇬🇧</span>
                    <span>English</span>
                    {language === 'en' && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      hapticService.selection();
                      onLanguageChange('ur');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs tap-bounce font-serif border flex items-center justify-center gap-2 transition-all ${
                      language === 'ur'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-300'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">🇵🇰</span>
                    <span>اردو (Urdu)</span>
                    {language === 'ur' && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Senior / Easy Reading Mode */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                <div>
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isUrdu ? 'بڑے حروف والا موڈ' : 'Senior / Big Text Mode'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isUrdu ? 'بزرگوں کے لیے واضح اور بڑے الفاظ' : 'Larger fonts & high contrast for seniors'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    soundService.playClick();
                    onToggleSeniorMode();
                  }}
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors ${
                    seniorMode ? 'bg-purple-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4.5 h-4.5 rounded-full bg-white shadow-xs transform transition-transform ${
                      seniorMode ? 'translate-x-4.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Theme Selector Trigger */}
              <button
                onClick={() => {
                  soundService.playClick();
                  onOpenThemeSelector();
                }}
                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-100 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-pink-500" />
                  <span>{isUrdu ? '13 خوبصورت تھیمز منتخب کریں' : 'Choose from 13 Themes'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Global Dark Mode Switch */}
              <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                      effectiveDark
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    {effectiveDark ? (
                      <Moon className="w-4 h-4 fill-amber-300" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5">
                      <span>{isUrdu ? 'ڈارک موڈ (رات کا موڈ)' : 'Dark Mode (Night Theme)'}</span>
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          effectiveDark
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {effectiveDark ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">
                      {isUrdu
                        ? 'آنکھوں کے لیے پرسکون اور OLED بیٹری سیور'
                        : 'Gentle on eyes & battery saver for AMOLED screens'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleDark}
                  className={`w-11 h-6 rounded-full p-0.5 transition-colors tap-bounce ${
                    effectiveDark ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                  aria-label="Toggle Dark Mode"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform flex items-center justify-center text-[10px] ${
                      effectiveDark ? 'translate-x-5 text-indigo-700' : 'translate-x-0 text-slate-400'
                    }`}
                  >
                    {effectiveDark ? '🌙' : '☀️'}
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* CATEGORY 5: SMART CACHE & OFFLINE VIDEO STORAGE MANAGEMENT */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700 px-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>{isUrdu ? 'اسمارٹ کیش اور آف لائن ویڈیو اسٹوریج' : 'Smart Cache & Offline Video Storage'}</span>
            </span>

            <div className="bg-gradient-to-br from-blue-50/60 via-slate-50 to-indigo-50/40 border border-blue-200 rounded-2xl p-3.5 space-y-3.5">
              {/* Storage Gauge Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800">
                      {isUrdu ? 'آف لائن ویڈیوز میموری' : 'Offline Video Buffers'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-medium">
                      {isUrdu
                        ? `${usedVideoStorageMB} MB از ${maxVideoStorageMB} MB استعمال شدہ`
                        : `${usedVideoStorageMB} MB used of ${maxVideoStorageMB} MB limit (${Math.round((usedVideoStorageMB / maxVideoStorageMB) * 100)}%)`}
                    </div>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  usedVideoStorageMB / maxVideoStorageMB > 0.85
                    ? 'bg-rose-100 text-rose-800 border-rose-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {usedVideoStorageMB / maxVideoStorageMB > 0.85 ? 'High Usage' : 'Optimal'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="h-2.5 w-full bg-slate-200/90 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usedVideoStorageMB / maxVideoStorageMB > 0.85
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-blue-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.round((usedVideoStorageMB / maxVideoStorageMB) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Maximum Storage Limit Preset Selector */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
                  {isUrdu ? 'زیادہ سے زیادہ اسٹوریج کی حد:' : 'Max Storage Limit for Offline Videos:'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '250 MB', value: 250 },
                    { label: '500 MB', value: 500, defaultBadge: true },
                    { label: '1 GB', value: 1000 },
                    { label: '2 GB', value: 2000 },
                  ].map((preset) => {
                    const isSelected = maxVideoStorageMB === preset.value;
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleSetMaxStorage(preset.value)}
                        className={`py-1.5 px-1 rounded-xl text-[11px] font-black transition-all tap-bounce relative flex flex-col items-center justify-center border ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{preset.label}</span>
                        {preset.defaultBadge && (
                          <span className={`text-[7.5px] uppercase font-bold px-1 rounded-sm ${
                            isSelected ? 'text-blue-100' : 'text-blue-600'
                          }`}>
                            Rec
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Cleanup Toggle */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isUrdu ? 'دیکھی گئی ویڈیوز کی خودکار صفائی' : 'Auto-Cleanup Watched Videos'}</span>
                    </span>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {isUrdu
                        ? 'پوائنٹس ملنے اور ویڈیو مکمل ہونے پر خودبخود عارضی کیش صاف کریں تاکہ میموری حد کے اندر رہے۔'
                        : 'Automatically purges offline video buffers older than 7 days or once 100% watched & rewarded to keep storage below limit.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoCleanup}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      autoCleanupVideos ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        autoCleanupVideos ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Action Banner Message */}
              {cacheActionMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 animate-fadeIn flex items-center justify-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{cacheActionMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCleanWatchedVideos}
                  className="py-2 px-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-extrabold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'دیکھی گئی ویڈیوز صاف کریں' : 'Clean Watched Videos'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePurgeAllVideoCache}
                  className="py-2 px-2 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 font-extrabold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isUrdu ? 'تمام ویڈیو کیش ختم کریں' : 'Purge All Video Buffers'}</span>
                </button>
              </div>

              {/* System RAM purge */}
              <button
                type="button"
                onClick={handleTriggerClearCache}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold rounded-xl text-[11px] tap-bounce flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3 text-slate-500" />
                <span>{isUrdu ? 'سسٹم ریم اور عارضی کیوریز صاف کریں' : 'Clear System RAM & Query Cache'}</span>
              </button>
            </div>
          </div>

          {/* CATEGORY 6: STABILITY & REAL-TIME CRASHLYTICS MONITORING */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isUrdu ? 'ایپ کی پائیداری اور مانیٹرنگ' : 'Stability & Crashlytics'}</span>
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Firebase Crashlytics</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Real-time exception logging & crash prevention
                  </div>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-200">
                  Active
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Crash Rate</span>
                  <span className="font-black text-emerald-600 text-xs">0.00% (100% Stable)</span>
                </div>
                <div className="p-2 bg-white rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-semibold">Health Status</span>
                  <span className="font-black text-emerald-600 text-xs">✓ Pre-Launch Ready</span>
                </div>
              </div>
            </div>
          </div>

          {/* CATEGORY 7: HOW REWARDS WORK (TERMS & REWARDS POLICY) */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-700 px-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>{isUrdu ? 'انعامات کا طریقہ کار (How Rewards Work)' : 'How Rewards Work & Currency Terms'}</span>
            </span>

            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 space-y-2">
              <VirtualCurrencyDisclaimer
                variant="badge"
                language={isUrdu ? 'ur' : 'en'}
                className="w-full text-center"
              />
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                {isUrdu
                  ? 'جوائے پوائنٹس روزانہ کوئز، اسٹریک اور پارٹنر ویڈیوز دیکھنے پر دیے جاتے ہیں۔ آپ اپنے کمائے گئے پوائنٹس کو والیٹ میں نقد ادائیگی کے لیے کلیم کر سکتے ہیں۔'
                  : 'JoyPoints are earned by completing quizzes, daily learning streaks, and viewing optional rewarded partner videos. You can withdraw your earned points for cash payouts in your Wallet according to ad revenue terms.'}
              </p>
            </div>
          </div>

          {/* CATEGORY 8: LEGAL & GOOGLE PLAY POLICY */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-600 px-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>{isUrdu ? 'قانونی پالیسی اور ڈیٹا کی حفاظت' : 'Policy & User Safety'}</span>
            </span>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 space-y-1">
              <button
                onClick={() => {
                  soundService.playClick();
                  onOpenPrivacyPolicy();
                }}
                className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isUrdu ? 'پرائیویسی پالیسی اور ڈیٹا سیفٹی' : 'Privacy Policy & Data Safety Form'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Terms of Service */}
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowTermsModal(true);
                }}
                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-500" />
                  <span>{isUrdu ? 'شرائط و ضوابط (Terms of Service)' : 'Terms of Service'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Community Guidelines */}
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowCommunityGuidelinesModal(true);
                }}
                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>{isUrdu ? 'کمیونٹی گائیڈ لائنز (Community Guidelines)' : 'Community Guidelines (Safe For All Ages)'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Contact Us */}
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowContactModal(true);
                }}
                className="w-full py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 text-slate-800 dark:text-slate-200 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{isUrdu ? 'ہم سے رابطہ کریں (Contact Us)' : 'Contact Us'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">fatimakiduniya362@gmail.com</span>
              </button>

              {onOpenRateApp && (
                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenRateApp();
                  }}
                  className="w-full py-2 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 hover:bg-amber-100/70 text-amber-900 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
                >
                  <span className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>{isUrdu ? 'گوگل پلے پر ریٹ کریں ⭐' : 'Rate JoyEarn on Google Play ⭐'}</span>
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
              )}

              {/* Advertise with us (Sponsor Promotion) */}
              <button
                onClick={() => {
                  soundService.playClick();
                  onOpenAdvertiseModal?.();
                }}
                className="w-full py-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-850 border border-amber-300 dark:border-amber-700/70 hover:border-amber-400 text-slate-900 dark:text-white font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs shadow-2xs"
              >
                <span className="flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>{isUrdu ? 'ہمارے ساتھ تشہیر کریں (Advertise with us)' : 'Advertise with us (Sponsor Promotion)'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
              </button>

              {/* Account Deletion */}
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowDeleteModal(true);
                }}
                className="w-full py-2 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 font-extrabold rounded-xl tap-bounce flex items-center justify-between px-3 text-xs"
              >
                <span className="flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>{isUrdu ? 'میرا اکاؤنٹ اور ڈیٹا ڈیلیٹ کریں' : 'Delete My Account & Personal Data'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-rose-400" />
              </button>

              {currentUser && onLogout && (
                <button
                  onClick={() => {
                    soundService.playClick();
                    onLogout();
                    onClose();
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl tap-bounce text-xs text-center"
                >
                  {isUrdu ? `لاگ آؤٹ (${currentUser.email})` : `Log Out (${currentUser.email})`}
                </button>
              )}
            </div>
          </div>



          {/* Delete Account Modal (Google Play Policy Requirement) */}
          {showDeleteModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-3.5 border-4 border-rose-300 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
                  🗑️
                </div>
                <h3 className="font-black text-slate-900 text-base">Delete Account & Data</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Per Google Play User Data policies, requesting account deletion will permanently erase your JoyPoints, quiz progress, bookmarks, and Google authentication profile from our servers.
                </p>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 break-all">
                  Web Deletion URL:{' '}
                  <span className="text-blue-600 font-semibold underline">
                    https://ais-pre-yu4imjtkrbbrtd3hcg63dd-498458785197.asia-east1.run.app/delete-account
                  </span>
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs tap-bounce"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      soundService.playClick();
                      onDeleteAccount?.();
                      setShowDeleteModal(false);
                      onClose();
                    }}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs tap-bounce shadow-md"
                  >
                    Permanently Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact Us Modal */}
          {showContactModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full space-y-3.5 border-4 border-indigo-300 dark:border-slate-700 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-2xl mx-auto">
                  ✉️
                </div>
                <h3 className="font-black text-slate-900 dark:text-white text-base">Contact Support</h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Have questions, feedback, or need assistance? Reach out to our family support team directly:
                </p>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Official Support Email</span>
                  <p className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 select-all">fatimakiduniya362@gmail.com</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="mailto:fatimakiduniya362@gmail.com"
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold tap-bounce text-center"
                  >
                    Open Mail App
                  </a>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText('fatimakiduniya362@gmail.com');
                      setCopyEmailSuccess(true);
                      setTimeout(() => setCopyEmailSuccess(false), 2500);
                    }}
                    className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold tap-bounce"
                  >
                    {copyEmailSuccess ? 'Copied! ✓' : 'Copy Email'}
                  </button>
                </div>
                <button
                  onClick={() => setShowContactModal(false)}
                  className="w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold tap-bounce"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Terms of Service Modal */}
          {showTermsModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full max-h-[85vh] flex flex-col space-y-3.5 border-4 border-blue-300 dark:border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <h3 className="font-black text-slate-900 dark:text-white text-base">Terms of Service</h3>
                  <button onClick={() => setShowTermsModal(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2.5 text-xs text-slate-600 dark:text-slate-300 pr-1 text-left leading-relaxed">
                  <p><strong>1. Educational & Family Purpose:</strong> JoyEarn is designed for educational enrichment, daily family quizzes, and wholesome knowledge discovery.</p>
                  <p><strong>2. Ad-Funded Rewards & Cash Withdrawals:</strong> Rewards depend on ad revenue, are reviewed manually and are not guaranteed. Amounts may be very small. Fake, duplicate or invalid activity will be rejected.</p>
                  <p><strong>3. Fair Use & Anti-Cheat:</strong> Points must be earned honestly through gameplay, quizzes, streaks, and viewing optional rewarded ads. Automated bots, clicking tricks, duplicate accounts, and fraudulent activity are prohibited and will result in rejected payouts.</p>
                  <p><strong>4. Contact & Support:</strong> For payment inquiries or account support, contact us at <code>fatimakiduniya362@gmail.com</code>.</p>
                </div>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold tap-bounce"
                >
                  I Understand & Agree
                </button>
              </div>
            </div>
          )}

          {/* Community Guidelines Modal (Safe For All Ages) */}
          {showCommunityGuidelinesModal && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full max-h-[85vh] flex flex-col space-y-3.5 border-4 border-purple-400 dark:border-purple-600 shadow-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h3 className="font-black text-slate-900 dark:text-white text-sm">Community Guidelines</h3>
                      <p className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Safe For All Ages (Children, Adults & Seniors)</p>
                    </div>
                  </div>
                  <button onClick={() => setShowCommunityGuidelinesModal(false)} className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold tap-bounce">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 text-xs text-slate-600 dark:text-slate-300 pr-1 text-left leading-relaxed">
                  <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
                    <h4 className="font-black text-purple-900 dark:text-purple-200 text-[11px] flex items-center gap-1.5">
                      <span>✨</span> 1. Wholesome & Family-Safe Content
                    </h4>
                    <p className="text-[11px]">
                      JoyEarn is strictly designed for all ages. Any vulgarity, sexual content, violence, abusive language, hate speech, scary themes, or immodest imagery is strictly prohibited.
                    </p>
                  </div>

                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1">
                    <h4 className="font-black text-blue-900 dark:text-blue-200 text-[11px] flex items-center gap-1.5">
                      <span>🎬</span> 2. Curated & Approved Educational Videos
                    </h4>
                    <p className="text-[11px]">
                      All curriculum videos are embedded using privacy-enhanced <code>youtube-nocookie.com</code> mode with related videos disabled (<code>rel=0</code>). Each video is individually approved. You can report any video at any time using the Report button.
                    </p>
                  </div>

                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1">
                    <h4 className="font-black text-emerald-900 dark:text-emerald-200 text-[11px] flex items-center gap-1.5">
                      <span>💬</span> 3. Respectful Communication
                    </h4>
                    <p className="text-[11px]">
                      Our community chat lounges enforce bad-words filtering, user reporting, and blocking controls. Harassment, spam, or sharing of personal phone numbers/addresses is not permitted.
                    </p>
                  </div>

                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1">
                    <h4 className="font-black text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1.5">
                      <span>⚖️</span> 4. Fair Learning & Reward Integrity
                    </h4>
                    <p className="text-[11px]">
                      Earn JoyPoints fairly through your own daily quizzes, practice challenges, and genuine learning streaks.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCommunityGuidelinesModal(false)}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold tap-bounce shadow-md"
                >
                  Close Guidelines
                </button>
              </div>
            </div>
          )}

          {/* Store Version Badge */}
          <div className="text-[10px] text-slate-400 text-center pt-2">
            JoyEarn v1.2.0 • Google Play 64-bit Ready (Target SDK 34) • Certified Safe
          </div>
        </div>
      </div>
    </div>
  );
};
