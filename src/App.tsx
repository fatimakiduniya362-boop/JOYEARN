import { darkModeService } from './services/darkModeService';
import { crashlytics } from './services/crashlytics';
import { FirstTimeTutorialOverlay } from './components/FirstTimeTutorialOverlay';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wallet,
  Play,
  Gift,
  ShieldCheck,
  ChevronRight,
  Bell,
  BellOff,
  BookOpen,
  Gamepad2,
  Brain,
  Trophy,
  User,
  UserPlus
} from 'lucide-react';

import { ThemeKey, VideoContent, QuizItem, SponsoredTask, TransactionRecord, ReferralUser } from './types';
import { THEMES, INITIAL_VIDEOS, INITIAL_QUIZZES, INITIAL_TASKS, INITIAL_TRANSACTIONS, INITIAL_REFERRALS } from './data/mockData';
import { getTodayUnlockedVideos } from './utils/dailyRotation';
import { ALL_QUIZZES } from './data/quizDatabase';
import { WATCH_PAGE_VIDEOS } from './data/watchVideosData';
import { DailyTasksCard } from './components/DailyTasksCard';
import { MandatoryTaskId } from './utils/dailyTasksConfig';
import { isDailyQuizCompletedToday } from './services/dailyQuizService';

// Modals & Android Components
import { MiniGames } from './components/MiniGames';
import { KidsZone } from './components/KidsZone';
import { VirtualGarden } from './components/VirtualGarden';
import { WalletPage, DAILY_MAX_POINTS } from './components/WalletPage';
import { LearnPage } from './components/LearnPage';
import { TasksPage } from './components/TasksPage';
import { InviteModal } from './components/InviteModal';
import { OfflineModal } from './components/OfflineModal';
import { DailyChestModal } from './components/DailyChestModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { NotificationManager } from './components/NotificationManager';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AppUser } from './types';
import { LuckyWheelModal } from './components/LuckyWheelModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { AppRateModal } from './components/AppRateModal';
import { FirstOpenAuthScreen } from './components/FirstOpenAuthScreen';
import { ConfettiEffect } from './components/ConfettiEffect';
import { PersonalDashboardModal } from './components/PersonalDashboardModal';
import { StreakLeaderboardModal } from './components/StreakLeaderboardModal';
import { AdminWithdrawalModal, ADMIN_EMAIL } from './components/AdminWithdrawalModal';
import { SponsorSection } from './components/SponsorSection';
import { appSettingsService, FullAppSettings } from './services/appSettingsService';
import { DailyGoalsCalendarModal } from './components/DailyGoalsCalendarModal';
import { SponsorAdvertiseModal } from './components/SponsorAdvertiseModal';
import { syncUserDataToCloud, deleteUserDataFromFirestore, recordTaskCompletionInFirestore } from './services/firestoreService';
import {
  commitAtomicPointsTransaction,
  loadVerifiedUserBalance,
  generatePointsTxId,
  readLocalPointsVault,
} from './services/pointsLedgerService';
import {
  captureIncomingReferralFromUrl,
  ensureUserReferralCodeRegistered,
  processVerifiedReferralSignup,
  reconcileAndCreditPendingReferrals,
  VerifiedReferralRecord,
} from './services/referralService';
import { getLocalDateKey } from './services/learningStreakService';
import { getConfiguredPointsPerDollar, MIN_WITHDRAW_USD } from './config/paymentConfig';
import {
  registerCurrentSession,
  watchCurrentSessionRevocation,
  markCurrentSessionSignedOut,
} from './services/accountSecurityService';
import { LiveStreamModal } from './components/LiveStreamModal';
import { CommunityChatModal } from './components/CommunityChatModal';
import { ShopMarketModal } from './components/ShopMarketModal';
import { CreatorAgencyModal } from './components/CreatorAgencyModal';
import { VlogsSection } from './components/VlogsSection';
import { AdMobInterstitialModal } from './components/AdMobInterstitialModal';
import { adMobManager } from './services/adMobService';
import { LudoGame } from './components/LudoGame';
import { useImmersiveMode } from './hooks/useImmersiveMode';
import { soundService } from './services/soundService';
import { hapticService } from './services/haptics';
import { initAuth, logout, deleteCurrentAuthUser, getLastSavedProfile, checkRedirectResult } from './services/googleAuth';
import { EngagementHubCard, EngagementModalTab } from './components/EngagementHubCard';
import { EngagementModals } from './components/EngagementModals';
import { CameraStudioModal } from './components/CameraStudioModal';
import { VoicePlaybackBar } from './components/VoicePlaybackBar';
import { submitVlog, VlogCategory } from './services/vlogService';
import { DailyMissionsCard } from './components/DailyMissionsCard';
import { DailyMissionsModal } from './components/DailyMissionsModal';
import { DailyMissionId } from './services/dailyMissionsService';
import { connectivityService, ConnectivitySnapshot } from './services/connectivityService';
import { applyOneTimeLocalPointsResetIfNeeded } from './services/pointsResetMigrationService';
import { OPTIONAL_NOTIFICATIONS_TEMPORARILY_PAUSED } from './services/notificationPreferencesService';

export type NavTab = 'home' | 'watch' | 'vlogs' | 'learn' | 'tasks' | 'wallet';

export type ActiveModalType =
  | null
  | 'watch'
  | 'learn'
  | 'play'
  | 'ludo'
  | 'tasks'
  | 'invite'
  | 'wallet'
  | 'offline'
  | 'kids'
  | 'garden'
  | 'chest'
  | 'themes'
  | 'notifications'
  | 'wheel'
  | 'auth'
  | 'settings'
  | 'privacy'
  | 'dashboard'
  | 'livestream'
  | 'community'
  | 'shop'
  | 'agency'
  | 'vlogs'
  | 'camera'
  | 'dailyGoalsCalendar';

export default function App() {
  // Theme state
  const [currentThemeKey, setCurrentThemeKey] = useState<ThemeKey>('spring_flower');
  const theme = THEMES.find((t) => t.id === currentThemeKey) || THEMES[0];

  // Global Dark Mode state with live localStorage persistence
  const [isDarkMode, setIsDarkMode] = useState(() => darkModeService.getIsDark());

  useEffect(() => {
    const unsub = darkModeService.subscribe((dark) => {
      setIsDarkMode(dark);
    });
    return unsub;
  }, []);

  const handleToggleDarkMode = () => {
    const next = darkModeService.toggle();
    setIsDarkMode(next);
  };

  // One-time data version migration: clear old saved test points, balance, streaks & cache on first run
  // CRITICAL: NEVER clears the user login session!
  const CURRENT_DATA_VERSION_KEY = 'joyearn_data_version';
  const TARGET_DATA_VERSION = 'v4.0.0_real_zero_earnings';
  if (typeof window !== 'undefined') {
    try {
      const currentVer = localStorage.getItem(CURRENT_DATA_VERSION_KEY);
      if (currentVer !== TARGET_DATA_VERSION) {
        const keysToClear = [
          'joyearn_lifetime_points',
          'joyearn_today_points',
          'joyearn_last_points_date',
          'joyearn_transactions',
          'joyearn_streak_days',
          'joyearn_claimed_milestones',
          'joyearn_practiced_letters',
          'joyearn_top_earners_cache',
          'joyearn_top_earners_time',
          'joyearn_custom_weekly_data',
        ];
        keysToClear.forEach((k) => localStorage.removeItem(k));
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('joyearn_cloud_user_') || key.startsWith('joyearn_video_claimed_'))) {
            localStorage.removeItem(key);
          }
        }
        localStorage.setItem(CURRENT_DATA_VERSION_KEY, TARGET_DATA_VERSION);
      }
      // Controlled one-time local points reset (backs up first, runs once, preserves tx history)
      const cachedProfile = getLastSavedProfile();
      applyOneTimeLocalPointsResetIfNeeded(cachedProfile?.uid || 'local');
    } catch {}
  }

  // User state
  const [userName, setUserName] = useState(() => localStorage.getItem('joyearn_userName') || 'Learner');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const cached = getLastSavedProfile();
      if (cached) {
        return {
          uid: cached.uid,
          displayName: cached.displayName || 'Learner',
          email: cached.email || null,
          photoURL: cached.photoURL || null,
          confirmationEmailSent: cached.confirmationEmailSent || false,
        };
      }
      const saved = localStorage.getItem('joyearn_app_user');
      if (saved) return JSON.parse(saved);
      const stableUid = localStorage.getItem('joyearn_stable_device_uid');
      if (stableUid) {
        return {
          uid: stableUid,
          displayName: localStorage.getItem('joyearn_userName') || 'Learner',
          email: localStorage.getItem('joyearn_user_email') || null,
          photoURL: null,
          confirmationEmailSent: localStorage.getItem(`joyearn_email_sent_${stableUid}`) === 'true',
        };
      }
      return null;
    } catch {
      return null;
    }
  });

  // Helper to read persisted JoyPoints & progress snapshot for a user (never resets saved earnings)
  const readSavedPointsSnapshot = (uid: string | null | undefined, todayStr: string) => {
    const safeUid = uid || 'guest';
    let savedPoints = 0;
    let hasExplicitPoints = false;
    let savedToday = 0;
    let savedTotal = 0;
    let savedStreak = 0;

    try {
      const cloudRaw = uid ? localStorage.getItem(`joyearn_cloud_user_${uid}`) : null;
      const cloudObj = cloudRaw ? JSON.parse(cloudRaw) : null;

      const uidPtsRaw = uid ? localStorage.getItem(`joyearn_points_${uid}`) : null;
      const globalPtsRaw = localStorage.getItem('joyearn_points');

      if (uidPtsRaw !== null && !Number.isNaN(parseInt(uidPtsRaw, 10))) {
        savedPoints = Math.max(0, parseInt(uidPtsRaw, 10));
        hasExplicitPoints = true;
      } else if (cloudObj && typeof cloudObj.points === 'number') {
        savedPoints = Math.max(0, cloudObj.points);
        hasExplicitPoints = true;
      } else if (globalPtsRaw !== null && !Number.isNaN(parseInt(globalPtsRaw, 10))) {
        savedPoints = Math.max(0, parseInt(globalPtsRaw, 10));
        hasExplicitPoints = true;
      }

      const lastDate =
        (uid ? localStorage.getItem(`joyearn_last_points_date_${uid}`) : null) ||
        localStorage.getItem('joyearn_last_points_date');
      if (lastDate === todayStr) {
        const uidTodayRaw = uid ? localStorage.getItem(`joyearn_today_points_${uid}`) : null;
        const globalTodayRaw = localStorage.getItem('joyearn_today_points');
        const rawToday = uidTodayRaw ?? globalTodayRaw;
        if (rawToday !== null && !Number.isNaN(parseInt(rawToday, 10))) {
          savedToday = Math.max(0, parseInt(rawToday, 10));
        } else if (cloudObj && cloudObj.lastActiveDate === todayStr && typeof cloudObj.todayPoints === 'number') {
          savedToday = Math.max(0, cloudObj.todayPoints);
        }
      }

      const uidLifetimeRaw = uid ? localStorage.getItem(`joyearn_lifetime_points_${uid}`) : null;
      const globalLifetimeRaw = localStorage.getItem('joyearn_lifetime_points');
      const rawLifetime = uidLifetimeRaw ?? globalLifetimeRaw;
      if (rawLifetime !== null && !Number.isNaN(parseInt(rawLifetime, 10))) {
        savedTotal = Math.max(savedPoints, parseInt(rawLifetime, 10));
      } else if (cloudObj && typeof cloudObj.totalEarned === 'number') {
        savedTotal = Math.max(savedPoints, cloudObj.totalEarned);
      } else {
        savedTotal = savedPoints;
      }

      const uidStreakRaw = uid ? localStorage.getItem(`joyearn_streak_days_${uid}`) : null;
      const globalStreakRaw = localStorage.getItem('joyearn_streak_days');
      const rawStreak = uidStreakRaw ?? globalStreakRaw;
      if (rawStreak !== null && !Number.isNaN(parseInt(rawStreak, 10))) {
        savedStreak = Math.max(0, parseInt(rawStreak, 10));
      } else if (cloudObj && typeof cloudObj.streakDays === 'number') {
        savedStreak = Math.max(0, cloudObj.streakDays);
      }
      // Also merge the authoritative local points vault so verified lifetime points NEVER drop to 0
      const vaultSnap = readLocalPointsVault(uid || undefined);
      if (vaultSnap.points > savedPoints) {
        savedPoints = vaultSnap.points;
        hasExplicitPoints = true;
      }
      if (vaultSnap.totalEarned > savedTotal) {
        savedTotal = Math.max(savedPoints, vaultSnap.totalEarned);
      }
      if (vaultSnap.todayDateKey === todayStr && vaultSnap.todayPoints > savedToday) {
        savedToday = vaultSnap.todayPoints;
      }
      if (vaultSnap.streakDays > savedStreak) {
        savedStreak = vaultSnap.streakDays;
      }
    } catch {}

    return {
      uid: safeUid,
      points: savedPoints,
      hasExplicitPoints,
      todayPoints: savedToday,
      totalEarned: Math.max(savedTotal, savedPoints),
      streakDays: savedStreak,
    };
  };

  const persistLocalPointsSnapshot = (
    uid: string | null | undefined,
    snapshot: {
      points: number;
      todayPoints: number;
      totalEarned: number;
      streakDays: number;
      transactions?: TransactionRecord[];
    }
  ) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      localStorage.setItem('joyearn_points', String(snapshot.points));
      localStorage.setItem('joyearn_today_points', String(snapshot.todayPoints));
      localStorage.setItem('joyearn_last_points_date', todayStr);
      localStorage.setItem('joyearn_lifetime_points', String(snapshot.totalEarned));
      localStorage.setItem('joyearn_streak_days', String(snapshot.streakDays));
      if (snapshot.transactions) {
        localStorage.setItem('joyearn_transactions', JSON.stringify(snapshot.transactions));
      }
      if (uid) {
        localStorage.setItem(`joyearn_points_${uid}`, String(snapshot.points));
        localStorage.setItem(`joyearn_today_points_${uid}`, String(snapshot.todayPoints));
        localStorage.setItem(`joyearn_last_points_date_${uid}`, todayStr);
        localStorage.setItem(`joyearn_lifetime_points_${uid}`, String(snapshot.totalEarned));
        localStorage.setItem(`joyearn_streak_days_${uid}`, String(snapshot.streakDays));
        if (snapshot.transactions) {
          localStorage.setItem(`joyearn_transactions_${uid}`, JSON.stringify(snapshot.transactions));
        }
      }
    } catch {}
  };

  const initialUid =
    currentUser?.uid ||
    (typeof window !== 'undefined' ? localStorage.getItem('joyearn_stable_device_uid') : null);
  const initialTodayStr = new Date().toISOString().slice(0, 10);
  const initialSnapshot = readSavedPointsSnapshot(initialUid, initialTodayStr);

  // authReady stays false until Firebase onAuthStateChanged has fired for the first time
  const [authReady, setAuthReady] = useState(false);
  const [serverBusyNotice, setServerBusyNotice] = useState<string | null>(null);

  // Restore saved JoyPoints immediately on startup so points never reset on page refresh
  const [points, setPoints] = useState<number>(initialSnapshot.points);
  const [pointsScaling, setPointsScaling] = useState(false);
  const prevPointsRef = useRef(points);

  // Animate JoyPoints balance indicator with subtle scaling effect whenever new points are earned
  useEffect(() => {
    if (points > prevPointsRef.current) {
      setPointsScaling(true);
      const timer = setTimeout(() => {
        setPointsScaling(false);
      }, 750);
      prevPointsRef.current = points;
      return () => clearTimeout(timer);
    }
    prevPointsRef.current = points;
  }, [points]);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, []);

  const [totalJoyPointsEarned, setTotalJoyPointsEarned] = useState<number>(initialSnapshot.totalEarned);
  const [todayPoints, setTodayPoints] = useState<number>(initialSnapshot.todayPoints);
  const [streakDays, setStreakDays] = useState<number>(initialSnapshot.streakDays);
  const [quizStreakFireAnim, setQuizStreakFireAnim] = useState<boolean>(false);

  // Synchronous refs to keep consecutive earn/spend operations and auth restores consistent
  const pointsRef = useRef<number>(points);
  const todayPointsRef = useRef<number>(todayPoints);
  const totalEarnedRef = useRef<number>(totalJoyPointsEarned);
  const streakDaysRef = useRef<number>(streakDays);
  const currentUserRef = useRef<AppUser | null>(currentUser);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);
  useEffect(() => {
    todayPointsRef.current = todayPoints;
  }, [todayPoints]);
  useEffect(() => {
    totalEarnedRef.current = totalJoyPointsEarned;
  }, [totalJoyPointsEarned]);
  useEffect(() => {
    streakDaysRef.current = streakDays;
  }, [streakDays]);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Claimed Milestone Badges
  const [claimedMilestones, setClaimedMilestones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('joyearn_claimed_milestones');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleClaimMilestone = (milestoneId: string, pointsAward: number, title: string) => {
    setClaimedMilestones((prev) => {
      const next = [...prev, milestoneId];
      localStorage.setItem('joyearn_claimed_milestones', JSON.stringify(next));
      return next;
    });
    handleEarnPoints(pointsAward, `Milestone Award: ${title} 🏆`);
  };
  const [claimedChestToday, setClaimedChestToday] = useState(false);
  const [hasSpunWheelToday, setHasSpunWheelToday] = useState(false);
  const [seniorMode, setSeniorMode] = useState(false);

  // Multi-layer Connectivity Detector (separates actual internet from Firebase availability)
  const [, setConnectivityState] = useState<ConnectivitySnapshot>(() =>
    connectivityService.getSnapshot()
  );

  useEffect(() => {
    return connectivityService.subscribe(setConnectivityState);
  }, []);

  // Exactly 5 Mandatory Daily Tasks State (Resets daily at local midnight)
  const [completedDailyTaskIds, setCompletedDailyTaskIds] = useState<MandatoryTaskId[]>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    try {
      const savedDate = localStorage.getItem('joyearn_mandatory_tasks_date');
      if (savedDate === todayStr) {
        const saved = localStorage.getItem('joyearn_mandatory_tasks_today');
        return saved ? JSON.parse(saved) : [];
      }
    } catch {}
    return [];
  });

  const markMandatoryTaskDone = async (taskId: MandatoryTaskId) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setCompletedDailyTaskIds((prev) => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      try {
        localStorage.setItem('joyearn_mandatory_tasks_date', todayStr);
        localStorage.setItem('joyearn_mandatory_tasks_today', JSON.stringify(next));
      } catch {}
      return next;
    });

    const uid = currentUser?.uid || 'guest';
    await recordTaskCompletionInFirestore(uid, taskId, todayStr);
  };

  // Global Language state ('en' | 'ur')
  const [language, setLanguage] = useState<'en' | 'ur'>(() => {
    try {
      const saved = localStorage.getItem('joyearn_app_language');
      if (saved === 'ur' || saved === 'en') return saved;
    } catch {}
    return 'en';
  });
  const isUrdu = language === 'ur';
  const effectiveUrdu = isUrdu || seniorMode;

  // Apply credited permanent referral points (+50 per verified friend) to UI state & permanent transaction history
  const applyCreditedReferralRewards = (creditedPoints: number, creditedRecords: VerifiedReferralRecord[]) => {
    if (creditedPoints <= 0 || creditedRecords.length === 0) return;
    setPoints((prev) => prev + creditedPoints);
    setTotalJoyPointsEarned((prev) => prev + creditedPoints);
    setTransactions((prev) => {
      const existingIds = new Set(prev.map((t) => t.id));
      const newTxs: TransactionRecord[] = creditedRecords
        .filter((r) => !existingIds.has(r.txId))
        .map((r) => ({
          id: r.txId,
          title: `Invite Friend Bonus (${r.referredName})`,
          date: 'Today',
          points: r.rewardPoints,
          type: 'earn',
          status: 'Completed',
        }));
      return newTxs.length > 0 ? [...newTxs, ...prev] : prev;
    });
  };

  // Capture incoming ?ref= link on first load
  useEffect(() => {
    captureIncomingReferralFromUrl();
  }, []);

  // Register user's unique referral link, verify incoming referral signup, and auto-credit +50 permanent points
  useEffect(() => {
    if (!currentUser?.uid || currentUser.uid === 'guest' || currentUser.uid === 'local') return;
    let cancelled = false;
    (async () => {
      try {
        await ensureUserReferralCodeRegistered(currentUser);
        await processVerifiedReferralSignup(currentUser);
        const creditResult = await reconcileAndCreditPendingReferrals(currentUser);
        if (!cancelled && creditResult.newlyCreditedPoints > 0) {
          applyCreditedReferralRewards(creditResult.newlyCreditedPoints, creditResult.creditedRecords);
          soundService.playCoin();
        }
      } catch (err) {
        console.warn('Referral sync warning:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid]);

  // Initialize Auth, Lucky wheel, & anti-cheat daily resets (daily counters ONLY — NEVER resets lifetime points)
  useEffect(() => {
    const todayStr = getLocalDateKey();

    // Mandatory tasks reset at local midnight
    const savedMandatoryDate = localStorage.getItem('joyearn_mandatory_tasks_date');
    if (savedMandatoryDate !== todayStr) {
      localStorage.setItem('joyearn_mandatory_tasks_date', todayStr);
      localStorage.setItem('joyearn_mandatory_tasks_today', JSON.stringify([]));
      setCompletedDailyTaskIds([]);
    }

    // Anti-cheat: Check daily points ceiling reset
    const lastPointsDate = localStorage.getItem('joyearn_last_points_date');
    if (lastPointsDate !== todayStr) {
      localStorage.setItem('joyearn_last_points_date', todayStr);
      localStorage.setItem('joyearn_today_points', '0');
      todayPointsRef.current = 0;
      setTodayPoints(0);
    } else {
      const uid = currentUserRef.current?.uid;
      const savedToday =
        (uid ? localStorage.getItem(`joyearn_today_points_${uid}`) : null) ||
        localStorage.getItem('joyearn_today_points');
      if (savedToday) {
        const parsed = parseInt(savedToday, 10) || 0;
        todayPointsRef.current = parsed;
        setTodayPoints(parsed);
      }
    }

    // Anti-cheat: Lucky wheel spin once per day
    const lastWheelSpin = localStorage.getItem('joyearn_lucky_wheel_last_spin');
    if (lastWheelSpin === todayStr) {
      setHasSpunWheelToday(true);
      setCompletedDailyTaskIds((prev) => prev.includes('daily_wheel') ? prev : [...prev, 'daily_wheel']);
    }

    // Anti-cheat: One daily chest bonus per day
    const lastChestClaim = localStorage.getItem('joyearn_daily_chest_last_claimed');
    if (lastChestClaim === todayStr) {
      setClaimedChestToday(true);
      setCompletedDailyTaskIds((prev) => prev.includes('daily_chest') ? prev : [...prev, 'daily_chest']);
    }

    // Daily quiz check
    if (isDailyQuizCompletedToday()) {
      setCompletedDailyTaskIds((prev) => prev.includes('daily_quiz') ? prev : [...prev, 'daily_quiz']);
    }

    // Check for redirect sign-in result on startup (non-blocking)
    checkRedirectResult().catch(() => {});

    // Startup reliability guard: never hang indefinitely on splash on slow mobile connections.
    // If a valid saved profile exists locally, restore it safely while Firebase Auth finishes in background.
    let authSettled = false;
    const startupGuardTimer = setTimeout(() => {
      if (!authSettled) {
        const saved = getLastSavedProfile();
        if (saved && saved.uid && !currentUserRef.current) {
          const fallbackUser: AppUser = {
            uid: saved.uid,
            displayName: saved.displayName,
            email: saved.email,
            photoURL: saved.photoURL,
            confirmationEmailSent: saved.confirmationEmailSent,
          };
          currentUserRef.current = fallbackUser;
          setCurrentUser(fallbackUser);
          if (saved.displayName) {
            setUserName(saved.displayName.split(' ')[0]);
          }
        }
        setAuthReady(true);
      }
    }, 3500);

    let unsubSessionWatcher: (() => void) | null = null;
    const unsubscribe = initAuth(
      (user) => {
        authSettled = true;
        clearTimeout(startupGuardTimer);
        setAuthReady(true);
        const isEmailSent = localStorage.getItem(`joyearn_email_sent_${user.uid}`) === 'true';
        const nextUser: AppUser = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          confirmationEmailSent: isEmailSent
        };
        currentUserRef.current = nextUser;
        setCurrentUser(nextUser);
        if (user.displayName) {
          setUserName(user.displayName.split(' ')[0]);
        }

        // Register current device session & watch for remote sign-out from another device
        void registerCurrentSession(user.uid);
        if (unsubSessionWatcher) {
          unsubSessionWatcher();
          unsubSessionWatcher = null;
        }
        unsubSessionWatcher = watchCurrentSessionRevocation(user.uid, () => {
          logout();
          handleUserChange(null);
          showToast('This device was signed out from another session.', 'info');
        });

        // Controlled one-time local reset for this authenticated user (no-op if already applied)
        applyOneTimeLocalPointsResetIfNeeded(user.uid);

        // Restore verified points, streak & immutable ledger history from Firestore.
        // CRITICAL: Never treat a failed/offline cloud request as a 0-point account!
        loadVerifiedUserBalance(user.uid).then((verified) => {
          const localSnap = readSavedPointsSnapshot(user.uid, getLocalDateKey());

          if (verified.syncStatus === 'verified' || verified.syncStatus === 'reconciled') {
            const realPoints = verified.pointsResetMigrationId
              ? verified.points
              : Math.max(verified.points, localSnap.hasExplicitPoints ? localSnap.points : 0);
            const realStreak = Math.max(verified.streakDays, localSnap.streakDays, streakDaysRef.current);
            const realToday = verified.pointsResetMigrationId
              ? verified.todayPoints
              : Math.max(verified.todayPoints, localSnap.todayPoints);
            const realTotal = Math.max(verified.totalEarned, localSnap.totalEarned, realPoints);

            pointsRef.current = realPoints;
            streakDaysRef.current = realStreak;
            todayPointsRef.current = realToday;
            totalEarnedRef.current = realTotal;

            setPoints(realPoints);
            setStreakDays(realStreak);
            setTodayPoints(realToday);
            setTotalJoyPointsEarned(realTotal);

            const mappedTxs: TransactionRecord[] = verified.transactions.map((t) => ({
              id: t.txId,
              title: t.reason,
              type: t.points >= 0 ? 'earn' : 'perk',
              points: t.points,
              date: t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Verified',
              status: t.status === 'pending_sync' ? 'Pending' : 'Completed',
            }));
            if (mappedTxs.length > 0) {
              setTransactions(mappedTxs);
            }

            persistLocalPointsSnapshot(user.uid, {
              points: realPoints,
              todayPoints: realToday,
              totalEarned: realTotal,
              streakDays: realStreak,
              transactions: mappedTxs.length > 0 ? mappedTxs : undefined,
            });
          } else if (verified.syncStatus === 'cached_unverified') {
            // Backend temporarily unavailable: keep last verified balance, NEVER overwrite cloud with 0!
            const preservedPoints = Math.max(verified.points, localSnap.points, pointsRef.current);
            const preservedStreak = Math.max(verified.streakDays, localSnap.streakDays, streakDaysRef.current);
            const preservedToday = Math.max(verified.todayPoints, localSnap.todayPoints, todayPointsRef.current);
            const preservedTotal = Math.max(verified.totalEarned, localSnap.totalEarned, totalEarnedRef.current, preservedPoints);

            pointsRef.current = preservedPoints;
            streakDaysRef.current = preservedStreak;
            todayPointsRef.current = preservedToday;
            totalEarnedRef.current = preservedTotal;

            setPoints(preservedPoints);
            setStreakDays(preservedStreak);
            setTodayPoints(preservedToday);
            setTotalJoyPointsEarned(preservedTotal);
          } else {
            // Brand-new Firestore account: preserve any local points earned before sign-in
            const preservedPoints = Math.max(localSnap.points, pointsRef.current);
            const preservedStreak = Math.max(localSnap.streakDays, streakDaysRef.current);
            const preservedToday = Math.max(localSnap.todayPoints, todayPointsRef.current);
            const preservedTotal = Math.max(localSnap.totalEarned, totalEarnedRef.current, preservedPoints);

            pointsRef.current = preservedPoints;
            streakDaysRef.current = preservedStreak;
            todayPointsRef.current = preservedToday;
            totalEarnedRef.current = preservedTotal;

            setPoints(preservedPoints);
            setStreakDays(preservedStreak);
            setTodayPoints(preservedToday);
            setTotalJoyPointsEarned(preservedTotal);

            persistLocalPointsSnapshot(user.uid, {
              points: preservedPoints,
              todayPoints: preservedToday,
              totalEarned: preservedTotal,
              streakDays: preservedStreak,
            });

            if (preservedPoints > 0 || preservedStreak > 0) {
              syncUserDataToCloud(user.uid, {
                points: preservedPoints,
                streakDays: preservedStreak,
                todayPoints: preservedToday,
                totalEarned: preservedTotal,
                email: user.email,
                displayName: user.displayName,
                lastActiveDate: getLocalDateKey(),
              }).catch(() => {});
            }
          }
        }).catch(() => {
          // Never sign out or reset points on network/Firestore error
        });
      },
      () => {
        authSettled = true;
        clearTimeout(startupGuardTimer);
        // Firebase onAuthStateChanged has fired for the first time
        setAuthReady(true);
        // Preserve saved persistent profile so user stays signed in
        const cached = getLastSavedProfile();
        if (!cached) {
          try {
            const saved = localStorage.getItem('joyearn_app_user');
            if (!saved) {
              const stableUid = localStorage.getItem('joyearn_stable_device_uid');
              if (!stableUid) {
                setCurrentUser(null);
              }
            }
          } catch {
            // keep existing user state
          }
        }
      }
    );

    return () => {
      clearTimeout(startupGuardTimer);
      if (unsubSessionWatcher) {
        unsubSessionWatcher();
        unsubSessionWatcher = null;
      }
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Listen for Firestore server quota / busy notification
  useEffect(() => {
    const handleServerBusy = (e: any) => {
      const msg = e?.detail || 'The server is busy right now. Your progress is saved on your device and will sync later.';
      setServerBusyNotice(msg);
      setTimeout(() => {
        setServerBusyNotice(null);
      }, 7000);
    };
    window.addEventListener('joyearn_server_busy', handleServerBusy);
    return () => window.removeEventListener('joyearn_server_busy', handleServerBusy);
  }, []);

  // Listen for essential Account Security new-login alerts (non-sensitive, separate from promo notifications)
  useEffect(() => {
    const handleSecurityAlert = (e: Event) => {
      const detail = (e as CustomEvent<{ title?: string; message?: string }>)?.detail;
      const msg = detail?.message || 'A new device signed in to your JoyEarn account. Review active sessions in Settings.';
      showToast(msg, 'info');
    };
    window.addEventListener('joyearn_security_alert', handleSecurityAlert);
    return () => window.removeEventListener('joyearn_security_alert', handleSecurityAlert);
  }, []);

  const handleLanguageChange = (lang: 'en' | 'ur') => {
    setLanguage(lang);
    setSeniorMode(lang === 'ur');
    try {
      localStorage.setItem('joyearn_app_language', lang);
    } catch {}
    if (lang === 'ur') {
      setMascotQuote('خوش آمدید! تفریح اور سچے انعامات حاصل کرنے کے لیے تیار ہیں؟ 🌸');
    } else {
      setMascotQuote('Welcome back! Ready for fun & honest rewards? 🌸');
    }
  };

  const handleWheelSpinCompleted = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem('joyearn_lucky_wheel_last_spin', todayStr);
    setHasSpunWheelToday(true);
    markMandatoryTaskDone('daily_wheel');
  };

  const handleUserChange = (user: AppUser | null) => {
    currentUserRef.current = user;
    setCurrentUser(user);
    if (user) {
      try {
        localStorage.setItem('joyearn_app_user', JSON.stringify(user));
      } catch {}
      if (user.displayName) {
        setUserName(user.displayName.split(' ')[0]);
      }
      if (user.confirmationEmailSent && user.uid) {
        localStorage.setItem(`joyearn_email_sent_${user.uid}`, 'true');
      }
      if (user.uid) {
        const todayStr = getLocalDateKey();
        const snap = readSavedPointsSnapshot(user.uid, todayStr);
        if (snap.hasExplicitPoints || pointsRef.current > 0) {
          const restoredPoints = Math.max(snap.points, pointsRef.current);
          const restoredToday = Math.max(snap.todayPoints, todayPointsRef.current);
          const restoredTotal = Math.max(snap.totalEarned, totalEarnedRef.current, restoredPoints);
          const restoredStreak = Math.max(snap.streakDays, streakDaysRef.current);

          pointsRef.current = restoredPoints;
          todayPointsRef.current = restoredToday;
          totalEarnedRef.current = restoredTotal;
          streakDaysRef.current = restoredStreak;

          setPoints(restoredPoints);
          setTodayPoints(restoredToday);
          setTotalJoyPointsEarned(restoredTotal);
          setStreakDays(restoredStreak);
        }
        try {
          const uidTxRaw = localStorage.getItem(`joyearn_transactions_${user.uid}`);
          if (uidTxRaw) {
            const parsedTx = JSON.parse(uidTxRaw);
            if (Array.isArray(parsedTx)) {
              setTransactions(parsedTx);
            }
          }
        } catch {}
      }
    } else {
      localStorage.removeItem('joyearn_app_user');
    }
  };

  // Monetization & Ad Free state
  const [hasAdFree, setHasAdFree] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('joyearn_has_ad_free') === 'true' : false;
  });

  // Content state (Rotates daily from 190+ video curriculum and 1,000 question bank)
  const [videos, setVideos] = useState<VideoContent[]>(() => {
    try {
      const unlocked = getTodayUnlockedVideos();
      return unlocked.length > 0 ? unlocked : INITIAL_VIDEOS;
    } catch {
      return INITIAL_VIDEOS;
    }
  });
  const [quizzes, setQuizzes] = useState<QuizItem[]>(() => {
    try {
      return ALL_QUIZZES.length > 0 ? ALL_QUIZZES : INITIAL_QUIZZES;
    } catch {
      return INITIAL_QUIZZES;
    }
  });
  const [tasks, setTasks] = useState<SponsoredTask[]>(INITIAL_TASKS);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(() => {
    try {
      const uid = initialUid;
      const saved =
        (uid ? localStorage.getItem(`joyearn_transactions_${uid}`) : null) ||
        localStorage.getItem('joyearn_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return INITIAL_TRANSACTIONS;
  });
  const [referrals, setReferrals] = useState<ReferralUser[]>(INITIAL_REFERRALS);
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>([]);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  const [gamesCompletedCount, setGamesCompletedCount] = useState<number>(0);

  // Active primary bottom navigation tab & navigation history
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [vlogsInitialTab, setVlogsInitialTab] = useState<'videos' | 'vlogs'>('videos');
  const [learnNavTarget, setLearnNavTarget] = useState<{
    section: 'alphabet' | 'numbers' | 'bioscience' | 'daily_quiz' | 'quizzes';
    view: 'browse' | 'daily_quiz' | 'lesson_quiz';
    reqId: number;
  }>({ section: 'alphabet', view: 'browse', reqId: 0 });
  // Active modal
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [engagementModal, setEngagementModal] = useState<EngagementModalTab>(null);
  const [isCameraStudioOpen, setIsCameraStudioOpen] = useState(false);
  const [vlogsRefreshTrigger, setVlogsRefreshTrigger] = useState(0);
  const [activeDailyMission, setActiveDailyMission] = useState<DailyMissionId | null>(null);
  const [missionsRefreshKey, setMissionsRefreshKey] = useState(0);
  const [appToast, setAppToast] = useState<{ message: string; tone: 'info' | 'warn' | 'success' } | null>(null);
  const appToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePublishCameraVlog = async (
    vlog: { title: string; category: string; videoUrl: string; duration: string; videoBlob?: Blob },
    onProgress?: (percent: number) => void
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser?.uid || currentUser.uid === 'guest') {
      setActiveModal('auth');
      return { success: false, error: 'Please sign in with Google before publishing your video.' };
    }
    const res = await submitVlog({
      uid: currentUser.uid,
      creatorName: currentUser.displayName || userName || 'VibeLoom Creator',
      creatorPhotoURL: currentUser.photoURL || '',
      title: vlog.title,
      description: vlog.title,
      category: (vlog.category as VlogCategory) || 'learning',
      videoType: 'recorded',
      videoBlob: vlog.videoBlob,
      duration: vlog.duration,
      isShort: true,
      onUploadProgress: onProgress,
    });
    if (res.success) {
      setVlogsInitialTab('vlogs');
      setActiveTab('vlogs');
      setVlogsRefreshTrigger((n) => n + 1);
      showToast('Vlog uploaded and published to the community feed!', 'success');
      return { success: true };
    }
    return { success: false, error: res.error || 'Could not publish video.' };
  };

  const showToast = (message: string, tone: 'info' | 'warn' | 'success' = 'info') => {
    setAppToast({ message, tone });
    if (appToastTimerRef.current) clearTimeout(appToastTimerRef.current);
    appToastTimerRef.current = setTimeout(() => setAppToast(null), 4000);
  };

  const tabScrollPositions = useRef<Record<string, number>>({});
  const tabHistoryRef = useRef<NavTab[]>(['home']);
  const activeTabRef = useRef<NavTab>('home');
  const activeModalRef = useRef<ActiveModalType | null>(null);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  const [appSettings, setAppSettings] = useState<FullAppSettings>(() => appSettingsService.getSettings());

  useEffect(() => {
    appSettingsService.initRealtimeSync();
    const unsub = appSettingsService.subscribe((settings) => {
      setAppSettings(settings);
    });
    return unsub;
  }, []);

  // Global Back navigation handler (browser history, Android hardware back, and gesture back)
  useEffect(() => {
    const handlePopState = () => {
      // 1. If an active modal is open, close the modal first
      if (activeModalRef.current !== null) {
        setActiveModal(null);
        return;
      }
      // 2. If tab history has depth, return to the previous tab
      if (tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop();
        const prevTab = tabHistoryRef.current[tabHistoryRef.current.length - 1] || 'home';
        setActiveTab(prevTab);
        // Scroll restoration
        requestAnimationFrame(() => {
          const savedPos = tabScrollPositions.current[prevTab];
          if (typeof savedPos === 'number' && savedPos > 0) {
            window.scrollTo({ top: savedPos, behavior: 'instant' });
          } else {
            window.scrollTo({ top: 0, behavior: 'instant' });
          }
        });
      } else if (activeTabRef.current !== 'home') {
        setActiveTab('home');
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const [showFeatureExitInterstitial, setShowFeatureExitInterstitial] = useState(false);

  const handleCloseFeatureModal = (featureName: string) => {
    setActiveModal(null);
    if (!isOwnerLoggedIn && !hasAdFree && adMobManager.shouldTriggerAdAfterFeature(featureName, currentUser?.email)) {
      setTimeout(() => {
        setShowFeatureExitInterstitial(true);
      }, 500);
    }
  };

  const handleOpenLearn = (
    section: 'alphabet' | 'numbers' | 'bioscience' | 'daily_quiz' | 'quizzes' = 'alphabet',
    view: 'browse' | 'daily_quiz' | 'lesson_quiz' = section === 'daily_quiz' ? 'daily_quiz' : 'browse'
  ) => {
    setLearnNavTarget((prev) => ({ section, view, reqId: prev.reqId + 1 }));
    handleSelectTab('learn', undefined, true);
  };

  const handleSelectTab = (tab: NavTab, initialSubTab?: 'videos' | 'vlogs', preserveLearnTarget = false) => {
    soundService.playClick();
    let targetTab: NavTab = tab;
    if (tab === 'watch') {
      setVlogsInitialTab('videos');
      targetTab = 'vlogs';
    } else if (tab === 'vlogs') {
      if (initialSubTab) {
        setVlogsInitialTab(initialSubTab);
      }
    } else if (tab === 'learn' && !preserveLearnTarget) {
      setLearnNavTarget((prev) => ({ section: 'alphabet', view: 'browse', reqId: prev.reqId + 1 }));
    }

    if (targetTab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Interstitial shown when user returns to Home from a feature (watch, learn, vlogs, etc., wallet excluded)
    const prevTab = activeTab;
    if (prevTab !== 'home' && targetTab === 'home') {
      if (!isOwnerLoggedIn && !hasAdFree && adMobManager.shouldTriggerAdAfterFeature(prevTab, currentUser?.email)) {
        setTimeout(() => {
          setShowFeatureExitInterstitial(true);
        }, 500);
      }
    }
    // Save current tab's scroll position
    tabScrollPositions.current[activeTab] = window.scrollY;
    tabHistoryRef.current.push(targetTab);
    try {
      window.history.pushState({ tab: targetTab }, '', '');
    } catch {}
    setActiveTab(targetTab);
    // Restore previous scroll position if returning, or open at top position
    requestAnimationFrame(() => {
      const savedPos = tabScrollPositions.current[targetTab];
      if (typeof savedPos === 'number' && savedPos > 0) {
        window.scrollTo({ top: savedPos, behavior: 'instant' });
      } else {
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    });
  };

  const handleCardClick = (cardId: string) => {
    soundService.playClick();
    if (cardId === 'watch') {
      setVlogsInitialTab('videos');
      handleSelectTab('vlogs', 'videos');
    } else if (cardId === 'learn' || cardId === 'tasks' || cardId === 'wallet' || cardId === 'vlogs') {
      handleSelectTab(cardId as NavTab);
    } else {
      try {
        window.history.pushState({ modal: cardId }, '', '');
      } catch {}
      setActiveModal(cardId as any);
    }
  };

  const [showDailyGoalsCalendarModal, setShowDailyGoalsCalendarModal] = useState(false);
  const [showAdvertiseModal, setShowAdvertiseModal] = useState(false);

  useEffect(() => {
    const handleOpenAdModal = () => setShowAdvertiseModal(true);
    window.addEventListener('joyearn-open-advertise', handleOpenAdModal);
    return () => window.removeEventListener('joyearn-open-advertise', handleOpenAdModal);
  }, []);

  // Immersive Sticky Mode hook
  const { isImmersive, isTemporarilyRevealed, toggleImmersive, revealTemporarily } = useImmersiveMode();

  // First-launch state: shows dedicated Google Sign-in screen on install/first open
  const [hasCompletedFirstOpen, setHasCompletedFirstOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('joyearn_has_completed_onboarding') === 'true';
    }
    return false;
  });

  // Play Store In-App Rate dialog state (Triggers after 5 activities completed)
  const [showRateModal, setShowRateModal] = useState(false);
  const [showStreakLeaderboard, setShowStreakLeaderboard] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Exclusive Owner Identification: ONLY romeelajutt23@gmail.com or active owner email
  const isOwnerLoggedIn = Boolean(
    currentUser?.email && (
      currentUser.email.trim().toLowerCase() === (appSettings.general?.ownerEmail || ADMIN_EMAIL).trim().toLowerCase() ||
      currentUser.email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase()
    )
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Mascot message state
  const [mascotQuote, setMascotQuote] = useState('Welcome back! Ready for fun & honest rewards? 🌸');

  // Android Native & PWA state
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showRecentsSheet, setShowRecentsSheet] = useState(false);
  const [androidFrameMode, setAndroidFrameMode] = useState(false);
  const { isInstallable, isInstalled } = usePWAInstall();

  // Uncompleted tasks count & unread notification bell badge state
  const uncompletedTasksCount = tasks.filter((t) => !t.completed).length;
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('joyearn_notifications_enabled') !== 'false';
    } catch {
      return true;
    }
  });
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [notifAcknowledgedDate, setNotifAcknowledgedDate] = useState<string>(() => {
    try {
      return localStorage.getItem('joyearn_notif_last_viewed_date') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const onSettingChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'boolean') {
        setNotificationsEnabled(detail);
      }
    };
    window.addEventListener('joyearn_notifications_setting_changed', onSettingChange);
    return () => window.removeEventListener('joyearn_notifications_setting_changed', onSettingChange);
  }, []);

  const todayNotifDate = new Date().toISOString().slice(0, 10);
  const pendingActionCount =
    notifAcknowledgedDate === todayNotifDate
      ? 0
      : (!claimedChestToday ? 1 : 0) + (uncompletedTasksCount > 0 ? 1 : 0);
  const totalBellBadgeCount = OPTIONAL_NOTIFICATIONS_TEMPORARILY_PAUSED
    ? 0
    : notificationsEnabled
      ? Math.max(unreadNotifCount, pendingActionCount)
      : 0;

  // Android Navigation Actions (Back / Home)
  const handleAndroidBack = () => {
    if (activeModal) {
      setActiveModal(null);
    } else if (activeTab !== 'home') {
      handleSelectTab('home');
    } else if (searchQuery) {
      setSearchQuery('');
    } else if (selectedCategory !== 'All') {
      setSelectedCategory('All');
    } else if (showRecentsSheet) {
      setShowRecentsSheet(false);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAndroidHome = () => {
    setActiveModal(null);
    handleSelectTab('home');
    setSearchQuery('');
    setShowRecentsSheet(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add Points handler with Anti-Cheat Daily Max Limit & Atomic Immutable Ledger Commit
  const handleEarnPoints = (earnedPoints: number, reason: string) => {
    const todayStr = getLocalDateKey();
    const curToday = todayPointsRef.current;

    // Check anti-cheat daily points ceiling (daily allowance only — NEVER resets lifetime points)
    if (curToday >= DAILY_MAX_POINTS) {
      soundService.playClick();
      showToast(
        `Daily maximum points limit reached (${DAILY_MAX_POINTS.toLocaleString()} Pts). Please return tomorrow to keep earning!`,
        'warn'
      );
      return;
    }

    const availableAllowance = DAILY_MAX_POINTS - curToday;
    const actualPointsEarned = Math.min(earnedPoints, availableAllowance);
    if (actualPointsEarned <= 0) return;

    const nextPoints = pointsRef.current + actualPointsEarned;
    const nextTotal = totalEarnedRef.current + actualPointsEarned;
    const nextToday = curToday + actualPointsEarned;
    const curStreak = streakDaysRef.current;
    const txId = generatePointsTxId(reason, todayStr);

    pointsRef.current = nextPoints;
    totalEarnedRef.current = nextTotal;
    todayPointsRef.current = nextToday;

    soundService.playCoin();
    hapticService.success();
    crashlytics.log(`Points earned: +${actualPointsEarned} (${reason})`);
    crashlytics.setCustomKey('userPoints', nextPoints);

    setPoints(nextPoints);
    setTotalJoyPointsEarned(nextTotal);
    setTodayPoints(nextToday);

    const newTx: TransactionRecord = {
      id: txId,
      title: reason,
      type: 'earn',
      points: actualPointsEarned,
      date: 'Just now',
      status: 'Completed',
    };

    const userObj = currentUserRef.current;
    setTransactions((prev) => {
      const nextTxList = [newTx, ...prev].slice(0, 150);
      persistLocalPointsSnapshot(userObj?.uid, {
        points: nextPoints,
        todayPoints: nextToday,
        totalEarned: nextTotal,
        streakDays: curStreak,
        transactions: nextTxList,
      });
      return nextTxList;
    });

    // Atomic server-authoritative ledger commit (queues automatically if offline)
    void commitAtomicPointsTransaction({
      uid: userObj?.uid,
      txId,
      pointsDelta: actualPointsEarned,
      reason,
      activityRef: reason,
      email: userObj?.email || null,
      displayName: userObj?.displayName || null,
      streakDays: curStreak,
    }).then((res) => {
      if (res.status === 'committed' && res.balance > pointsRef.current) {
        pointsRef.current = res.balance;
        setPoints(res.balance);
        persistLocalPointsSnapshot(userObj?.uid, {
          points: res.balance,
          todayPoints: todayPointsRef.current,
          totalEarned: Math.max(totalEarnedRef.current, res.totalEarned),
          streakDays: streakDaysRef.current,
        });
      }
    });

    // Mascot encouragement
    const cheers = [
      'Great job! Honest effort makes honest rewards! ⭐',
      'Activity completed! Your points are credited! 🎉',
      "Keep learning and having fun together! 🐰",
      'Awesome work! Let\'s earn sustainably! 🌿',
    ];
    setMascotQuote(cheers[Math.floor(Math.random() * cheers.length)]);
  };

  // Shared helper for spending/deducting points with atomic ledger persistence
  const handleSpendPoints = (
    deductAmount: number,
    reason: string,
    txStatus: 'Completed' | 'Pending' = 'Completed'
  ): boolean => {
    if (deductAmount <= 0 || pointsRef.current < deductAmount) return false;
    const todayStr = getLocalDateKey();
    const nextPoints = Math.max(0, pointsRef.current - deductAmount);
    const txId = generatePointsTxId(`spend_${reason}`, todayStr);
    pointsRef.current = nextPoints;

    soundService.playClick();
    setPoints(nextPoints);

    const newTx: TransactionRecord = {
      id: txId,
      title: reason,
      type: 'perk',
      points: -deductAmount,
      date: 'Just now',
      status: txStatus,
    };

    const userObj = currentUserRef.current;
    setTransactions((prev) => {
      const nextTxList = [newTx, ...prev].slice(0, 150);
      persistLocalPointsSnapshot(userObj?.uid, {
        points: nextPoints,
        todayPoints: todayPointsRef.current,
        totalEarned: totalEarnedRef.current,
        streakDays: streakDaysRef.current,
        transactions: nextTxList,
      });
      return nextTxList;
    });

    void commitAtomicPointsTransaction({
      uid: userObj?.uid,
      txId,
      pointsDelta: -deductAmount,
      reason,
      activityRef: `spend_${reason}`,
      email: userObj?.email || null,
      displayName: userObj?.displayName || null,
      streakDays: streakDaysRef.current,
    });

    return true;
  };

  // Deduct points for withdrawals or perks
  const handleDeductPoints = (deductAmount: number, reason: string) => {
    handleSpendPoints(deductAmount, reason, 'Pending');
  };

  // Clear Non-essential cached offline video records & cache keys
  const handleClearAppCache = () => {
    soundService.playClick();
    crashlytics.log('User manually cleared offline cache');
    setVideos((prev) => prev.map((v) => ({ ...v, isOffline: false })));
    try {
      localStorage.removeItem('joyearn_cached_queries');
      localStorage.removeItem('joyearn_temp_media_keys');
    } catch {
      // Ignore
    }
  };

  // Toggle offline video bookmark
  const handleToggleOffline = (videoId: string) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, isOffline: !v.isOffline } : v))
    );
  };

  // Complete a task
  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.completed) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t))
    );
    handleEarnPoints(task.points, `Completed: ${task.title}`);
  };

  // Claim Daily Chest (Anti-cheat: One daily bonus per day)
  const handleClaimChest = (earnedPoints: number, seed: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (claimedChestToday) {
      soundService.playClick();
      showToast('You have already claimed your daily bonus today! Return tomorrow for the next bonus.', 'info');
      return;
    }
    setClaimedChestToday(true);
    try {
      localStorage.setItem('joyearn_daily_chest_last_claimed', todayStr);
    } catch {}
    const nextStreak = streakDaysRef.current + 1;
    streakDaysRef.current = nextStreak;
    setStreakDays(nextStreak);
    hapticService.heavy();
    markMandatoryTaskDone('daily_chest');
    handleEarnPoints(earnedPoints, `Daily Streak Chest (Day ${nextStreak})`);
  };

  // Redeem in-app perk
  const handleRedeemPerk = (perkId: string, perkName: string, cost: number): boolean => {
    return handleSpendPoints(cost, `Unlocked: ${perkName}`, 'Completed');
  };

  // Logout handler
  const handleLogout = () => {
    const uid = currentUserRef.current?.uid;
    if (uid) {
      void markCurrentSessionSignedOut(uid);
    }
    logout();
    handleUserChange(null);
    soundService.playClick();
  };

  // Account Deletion handler (Google Play Policy Mandatory Requirement)
  const handleDeleteAccount = async () => {
    try {
      const uid = currentUser?.uid || (currentUser as any)?.id;
      if (uid) {
        await deleteUserDataFromFirestore(uid);
      }
      await deleteCurrentAuthUser();
    } catch (e) {
      console.warn('Account deletion cleanup error:', e);
    }
    logout();
    if (typeof window !== 'undefined') {
      localStorage.clear();
    }
    pointsRef.current = 0;
    todayPointsRef.current = 0;
    totalEarnedRef.current = 0;
    streakDaysRef.current = 0;
    currentUserRef.current = null;
    setCurrentUser(null);
    setPoints(0);
    setTodayPoints(0);
    setTotalJoyPointsEarned(0);
    setStreakDays(0);
    soundService.playClick();
    showToast('Your account and personal data have been permanently deleted per Google Play Policy.', 'info');
  };

  // User referral code for social sharing & accomplishment invites
  const userReferralCode = currentUser?.uid ? `JOY-${currentUser.uid.slice(-4).toUpperCase()}` : 'JOY-8834';

  const handleShareCard = (e: React.MouseEvent, card: any) => {
    e.stopPropagation();
    soundService.playClick();
    const shareTitle = `${card.emoji} ${card.title} - JoyEarn Accomplishment`;
    const shareText = `Explore "${card.title}" with me on JoyEarn! Use my referral code ${userReferralCode} to learn, play wholesome games, and earn daily rewards:`;
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/?ref=${userReferralCode}` : 'https://joyearn.app';

    if (navigator.share) {
      navigator.share({
        title: shareTitle,
        text: shareText,
        url: shareUrl,
      }).catch(() => {
        // User dismissed share sheet
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`).catch(() => {});
      showToast(`Invite link with referral code ${userReferralCode} copied to clipboard!`, 'success');
    }
  };

  // 2-column Activity Cards Definition with Categories, Search Keywords & Live Progress
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const completedQuizzesCount = completedQuizIds.length;
  const watchedVideosCount = watchedVideoIds.length;
  const activeReferralsCount = referrals.filter((r) => r.bonusAwarded).length;
  const offlineVideosCount = videos.filter((v) => v.isOffline).length;

  // Total completed user activities across quizzes, tasks, videos, games, chest & wheel
  const totalActivitiesCompleted =
    completedTasksCount +
    completedQuizzesCount +
    watchedVideosCount +
    gamesCompletedCount +
    (claimedChestToday ? 1 : 0) +
    (hasSpunWheelToday ? 1 : 0);

  // Daily Goal: Target of 5 completed activities for dashboard & calendar modals
  const dailyGoalTarget = 5;
  const dailyGoalCount = Math.min(dailyGoalTarget, totalActivitiesCompleted);

  // Lightweight Confetti Trigger & State
  const [showConfetti, setShowConfetti] = useState(false);
  const handleTriggerConfetti = () => {
    setShowConfetti(true);
  };

  // Trigger Confetti effect & festive celebrations when user hits daily goal of 5 completed activities
  const [isFifthActivityCelebration, setIsFifthActivityCelebration] = useState(false);
  const prevActivitiesCountRef = useRef(totalActivitiesCompleted);
  useEffect(() => {
    if (prevActivitiesCountRef.current < 5 && totalActivitiesCompleted >= 5) {
      soundService.playDailyGoalCheer();
      soundService.playStreakFlame();
      setShowConfetti(true);
      setIsFifthActivityCelebration(true);
      const timer = setTimeout(() => {
        setIsFifthActivityCelebration(false);
      }, 7000);
      return () => clearTimeout(timer);
    }
    prevActivitiesCountRef.current = totalActivitiesCompleted;
  }, [totalActivitiesCompleted]);

  // Trigger gentle App Rating modal after user successfully completes 5 activities
  useEffect(() => {
    if (totalActivitiesCompleted >= 5) {
      const rateStatus = localStorage.getItem('joyearn_rate_status');
      if (!rateStatus) {
        const timer = setTimeout(() => {
          setShowRateModal(true);
        }, 1200);
        return () => clearTimeout(timer);
      } else if (rateStatus === 'remind_later') {
        const remindTime = parseInt(localStorage.getItem('joyearn_rate_remind_time') || '0', 10);
        if (Date.now() - remindTime > 24 * 60 * 60 * 1000 || totalActivitiesCompleted >= 10) {
          const timer = setTimeout(() => {
            setShowRateModal(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [totalActivitiesCompleted]);

  const ACTIVITY_CARDS = [
    {
      id: 'watch' as const,
      title: 'Watch',
      urduTitle: 'ویڈیوز دیکھیں',
      subtitle: 'Safe Family & Educational Videos',
      category: 'Videos',
      badge: '+25 Pts',
      emoji: '📺',
      color: 'from-rose-500 to-pink-500',
      lightBg: 'bg-rose-50',
      border: 'border-rose-200',
      textColor: 'text-rose-950',
      progressText: `${watchedVideosCount}/${videos.length} videos complete`,
      progressUrdu: `${watchedVideosCount}/${videos.length} ویڈیوز مکمل`,
      progressPct: Math.round((watchedVideosCount / Math.max(videos.length, 1)) * 100),
      isComplete: watchedVideosCount >= videos.length,
      keywords: ['video', 'videos', 'watch', 'cartoon', 'cooking', 'crafts', 'nature', 'stories', 'clip', 'kitchen', 'gardening', 'mint', 'woodcutter', 'honeybees', 'ویڈیو', 'دیکھیں'],
    },
    {
      id: 'learn' as const,
      title: 'Learn',
      urduTitle: 'علم حاصل کریں',
      subtitle: 'Tiered Quizzes & Multipliers',
      category: 'Quizzes',
      badge: 'Up to 2.0x Multiplier',
      emoji: '📚',
      color: 'from-indigo-600 to-blue-600',
      lightBg: 'bg-indigo-50',
      border: 'border-indigo-200',
      textColor: 'text-indigo-950',
      progressText: `${completedQuizzesCount}/${quizzes.length} quizzes complete`,
      progressUrdu: `${completedQuizzesCount}/${quizzes.length} کوئز مکمل`,
      progressPct: Math.round((completedQuizzesCount / Math.max(quizzes.length, 1)) * 100),
      isComplete: completedQuizzesCount >= quizzes.length,
      keywords: ['quiz', 'quizzes', 'learn', 'knowledge', 'english', 'urdu', 'science', 'general', 'beginner', 'intermediate', 'advanced', 'difficulty', 'jasmine', 'chambeli', 'leap year', 'photosynthesis', 'پڑھیں', 'کوئز', 'علم', 'مشکل'],
    },
    {
      id: 'play' as const,
      title: 'Play',
      urduTitle: 'کھیلیں اور جیتیں',
      subtitle: 'Cute Non-Gambling Games',
      category: 'Games',
      badge: '+30 Pts',
      emoji: '🎮',
      color: 'from-purple-500 to-fuchsia-500',
      lightBg: 'bg-purple-50',
      border: 'border-purple-200',
      textColor: 'text-purple-950',
      progressText: `${gamesCompletedCount}/3 games played`,
      progressUrdu: `${gamesCompletedCount}/3 گیمز کھیلے`,
      progressPct: Math.round((gamesCompletedCount / 3) * 100),
      isComplete: gamesCompletedCount >= 3,
      keywords: ['game', 'games', 'mini-games', 'garden match', 'animal puzzle', 'rainbow memory', 'play', 'panda', 'rabbit', 'puppy', 'kitten', 'match', 'puzzle', 'memory', 'کھیل', 'گیم'],
    },
    {
      id: 'wheel' as const,
      title: 'Lucky Wheel',
      urduTitle: 'لکی وہیل (انعامی چرخہ)',
      subtitle: 'Daily Free Spin & Bonus Points',
      category: 'Games',
      badge: hasSpunWheelToday ? (effectiveUrdu ? 'مکمل' : 'Done') : '+100 Pts Jackpot',
      emoji: '🎡',
      color: 'from-fuchsia-600 via-pink-600 to-rose-600',
      lightBg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200',
      textColor: 'text-fuchsia-950',
      progressText: hasSpunWheelToday ? '1/1 Spin used today' : '1 Free Spin ready!',
      progressUrdu: hasSpunWheelToday ? 'آج کا اسپن مکمل ہو چکا ہے' : '1 مفت اسپن تیار ہے!',
      progressPct: hasSpunWheelToday ? 100 : 0,
      isComplete: hasSpunWheelToday,
      keywords: ['wheel', 'lucky', 'spin', 'bonus', 'points', 'prize', 'jackpot', 'چرخہ', 'پہیہ', 'لکی وہیل', 'انعام', 'بونس'],
    },
    {
      id: 'tasks' as const,
      title: 'Tasks',
      urduTitle: 'روزانہ کے ٹاسک',
      subtitle: 'Approved Sponsored Pledges',
      category: 'Tasks',
      badge: '+35 Pts',
      emoji: '📝',
      color: 'from-amber-500 to-orange-500',
      lightBg: 'bg-amber-50',
      border: 'border-amber-200',
      textColor: 'text-amber-950',
      progressText: `${completedTasksCount}/${tasks.length} tasks complete`,
      progressUrdu: `${completedTasksCount}/${tasks.length} ٹاسک مکمل`,
      progressPct: Math.round((completedTasksCount / Math.max(tasks.length, 1)) * 100),
      isComplete: completedTasksCount >= tasks.length,
      keywords: ['task', 'tasks', 'sponsor', 'pledge', 'survey', 'daily', 'clean', 'health', 'water', 'hydration', 'password', 'security', 'craft feedback', 'ٹاسک', 'کام'],
    },
    {
      id: 'invite' as const,
      title: 'Invite Friends',
      urduTitle: 'دوستوں کو مدعو کریں',
      subtitle: 'Share JoyEarn (+100 Pts/friend)',
      category: 'Earn',
      badge: '+100 Pts',
      emoji: '🎁',
      color: 'from-fuchsia-600 to-pink-600',
      lightBg: 'bg-fuchsia-50',
      border: 'border-fuchsia-200',
      textColor: 'text-fuchsia-950',
      progressText: `${activeReferralsCount}/${Math.max(referrals.length, 3)} friends active`,
      progressUrdu: `${activeReferralsCount}/${Math.max(referrals.length, 3)} دوست فعال`,
      progressPct: Math.round((activeReferralsCount / Math.max(referrals.length, 3)) * 100),
      isComplete: activeReferralsCount >= referrals.length,
      keywords: ['invite', 'earn', 'referral', 'friend', 'bonus', 'share', 'code', 'sms', 'دعوت', 'دوست'],
    },
    {
      id: 'wallet' as const,
      title: 'Perks Store',
      urduTitle: 'انعامی اسٹور',
      subtitle: 'Unlock Themes, Boosters & Hints',
      category: 'Wallet',
      badge: `${points} Pts`,
      emoji: '⭐',
      color: 'from-amber-500 to-orange-500',
      lightBg: 'bg-amber-50',
      border: 'border-amber-200',
      textColor: 'text-amber-950',
      progressText: `${points} JoyPoints available`,
      progressUrdu: `${points} پوائنٹس دستیاب`,
      progressPct: 100,
      isComplete: true,
      keywords: ['wallet', 'perks', 'store', 'points', 'shop', 'themes', 'avatar', 'badge', 'powerups', 'پوائنٹس', 'اسٹور'],
    },
    {
      id: 'offline' as const,
      title: 'Watchlist',
      urduTitle: 'محفوظ ویڈیوز',
      subtitle: 'Bookmarked Family Learning',
      category: 'Videos',
      badge: `${offlineVideosCount} Saved`,
      emoji: '📥',
      color: 'from-cyan-600 to-blue-600',
      lightBg: 'bg-cyan-50',
      border: 'border-cyan-200',
      textColor: 'text-cyan-950',
      progressText: `${offlineVideosCount}/${videos.length} videos offline`,
      progressUrdu: `${offlineVideosCount}/${videos.length} محفوظ`,
      progressPct: Math.round((offlineVideosCount / Math.max(videos.length, 1)) * 100),
      isComplete: offlineVideosCount >= videos.length,
      keywords: ['offline', 'download', 'downloads', 'save', 'no wifi', 'data saver', 'videos', 'storage', 'mb', 'آف لائن'],
    },
    {
      id: 'kids' as const,
      title: 'Fun Zone',
      urduTitle: 'فن زون',
      subtitle: 'Creative Games & Phonics',
      category: 'Fun',
      badge: 'Safe & Clean',
      emoji: '🎈',
      color: 'from-amber-400 to-yellow-500',
      lightBg: 'bg-yellow-50',
      border: 'border-yellow-200',
      textColor: 'text-yellow-950',
      progressText: '4/6 creative zones ready',
      progressUrdu: '4/6 زونز تیار',
      progressPct: 67,
      isComplete: false,
      keywords: ['fun zone', 'fun', 'games', 'abc', 'phonics', 'draw', 'drawing', 'magic paint', 'urdu alphabet', 'حروف', 'numbers', 'counting', 'animal sounds', 'تفریح'],
    },
    {
      id: 'garden' as const,
      title: 'Virtual Garden',
      urduTitle: 'باغیچہ',
      subtitle: 'Water Flowers & Grow Trees',
      category: 'Garden',
      badge: 'Relax & Bloom',
      emoji: '🌸',
      color: 'from-emerald-500 to-teal-500',
      lightBg: 'bg-emerald-50',
      border: 'border-emerald-200',
      textColor: 'text-emerald-950',
      progressText: '3/4 flowers blooming',
      progressUrdu: '3/4 پھول کھل گئے',
      progressPct: 75,
      isComplete: false,
      keywords: ['garden', 'flower', 'tree', 'sunflower', 'rose', 'tulip', 'lavender', 'water', 'nature', 'plants', 'seeds', 'cosmetic', 'باغ', 'پھول'],
    },
  ];

  const CATEGORY_TABS = [
    { id: 'All', label: 'All', urduLabel: 'تمام', emoji: '🌟' },
    { id: 'Videos', label: 'Videos', urduLabel: 'ویڈیوز', emoji: '📺' },
    { id: 'Quizzes', label: 'Quizzes', urduLabel: 'کوئز', emoji: '📚' },
    { id: 'Games', label: 'Games', urduLabel: 'گیمز', emoji: '🎮' },
    { id: 'Tasks', label: 'Tasks', urduLabel: 'ٹاسک', emoji: '📝' },
    { id: 'Fun', label: 'Fun Zone', urduLabel: 'تفریح', emoji: '🎈' },
    { id: 'Wallet', label: 'Wallet', urduLabel: 'بٹوہ', emoji: '👛' },
    { id: 'Garden', label: 'Garden', urduLabel: 'باغ', emoji: '🌸' },
  ];

  // Filtering cards based on search query and category
  const filteredCards = ACTIVITY_CARDS.filter((card) => {
    // Category filter check
    const matchesCategory =
      selectedCategory === 'All' ||
      card.category.toLowerCase() === selectedCategory.toLowerCase();

    if (!matchesCategory) return false;

    // Search query check
    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase().trim();
    const inTitle = card.title.toLowerCase().includes(q);
    const inUrdu = card.urduTitle?.toLowerCase().includes(q);
    const inSubtitle = card.subtitle.toLowerCase().includes(q);
    const inCategory = card.category.toLowerCase().includes(q);
    const inKeywords = card.keywords?.some((k) => k.toLowerCase().includes(q));

    // Also match specific tasks, videos, and quizzes related to this card
    const inChildTasks =
      card.id === 'tasks' &&
      tasks.some(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.sponsorName.toLowerCase().includes(q)
      );

    const inChildVideos =
      (card.id === 'watch' || card.id === 'offline') &&
      videos.some(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.author.toLowerCase().includes(q)
      );

    const inChildQuizzes =
      card.id === 'learn' &&
      quizzes.some(
        (qz) =>
          qz.question.toLowerCase().includes(q) ||
          qz.category.toLowerCase().includes(q) ||
          (qz.urduTranslation && qz.urduTranslation.toLowerCase().includes(q))
      );

    return inTitle || inUrdu || inSubtitle || inCategory || inKeywords || inChildTasks || inChildVideos || inChildQuizzes;
  });

  // Direct hit matching items for quick jump
  const directMatchingTasks = searchQuery.trim()
    ? tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          t.requirements.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  const directMatchingVideos = searchQuery.trim()
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          v.summary.toLowerCase().includes(searchQuery.toLowerCase().trim())
      )
    : [];

  const directMatchingQuizzes = searchQuery.trim()
    ? quizzes.filter(
        (q) =>
          q.question.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          q.category.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
          (q.urduTranslation && q.urduTranslation.toLowerCase().includes(searchQuery.toLowerCase().trim()))
      )
    : [];

  // AUTHENTICATION SPLASH: While authReady is false, show a full-screen splash with the JoyEarn logo and a spinner, never the login screen
  if (!authReady) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-rose-500 via-pink-600 to-rose-700 text-white p-6">
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center text-4xl shadow-xl animate-float">
          🌸
        </div>
        <h1 className="font-black text-2xl mt-4 tracking-tight">JoyEarn</h1>
        <p className="text-xs text-rose-100 font-medium mt-1">Safe • Family-Friendly • Genuine Rewards</p>
        <div className="flex items-center gap-2.5 mt-6 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/20">
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-white">Starting JoyEarn...</span>
        </div>
      </div>
    );
  }

  // Show the Sign In screen ONLY when authReady is true and there is no user
  if (authReady && !currentUser) {
    return (
      <FirstOpenAuthScreen
        onSuccessAuth={(user, bonus) => {
          handleUserChange(user);
          if (bonus > 0) {
            handleEarnPoints(bonus, 'Google Account Welcome Bonus 🎉');
          }
          setHasCompletedFirstOpen(true);
          localStorage.setItem('joyearn_has_completed_onboarding', 'true');
        }}
        seniorMode={effectiveUrdu}
      />
    );
  }

  return (
    <div
      className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : `bg-gradient-to-br ${theme.gradient} text-slate-800`} transition-colors duration-500 flex flex-col items-center justify-start`}
    >
      {/* Centered Mobile Shell with optional Android Phone Chassis Frame */}
      <div
        className={`w-full max-w-md min-h-screen flex flex-col shadow-2xl relative ${isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white/80 text-slate-800'} ${
          androidFrameMode
            ? 'border-[12px] border-slate-950 rounded-[48px] overflow-hidden my-4 ring-8 ring-slate-800/30 shadow-2xl'
            : 'border-x border-slate-200/50'
        }`}
      >
        {/* Firestore Server Quota / Busy Banner */}
        {serverBusyNotice && (
          <div className="mx-3 mt-3 p-3 bg-amber-500/95 text-slate-950 text-xs font-black rounded-2xl shadow-lg border border-amber-400 flex items-center justify-between gap-2 z-50 animate-bounce">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <span>{serverBusyNotice}</span>
            </div>
            <button
              onClick={() => setServerBusyNotice(null)}
              className="text-slate-900 hover:text-black font-black text-sm px-1.5"
            >
              ✕
            </button>
          </div>
        )}
        {/* HOME DASHBOARD TAB VIEW */}
        {activeTab === 'home' && (
          <div className="flex flex-col w-full pb-28 bg-white min-h-screen">
            {/* TOP PINK-AND-WHITE HEADER */}
            <header className="px-4 pt-3.5 pb-2.5 flex items-center justify-between max-w-lg mx-auto w-full bg-white">
              {/* Brand Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] text-white flex items-center justify-center shadow-sm">
                  <Play className="w-[18px] h-[18px] text-white fill-white ml-0.5" />
                </div>
                <h1 className="font-extrabold text-[22px] tracking-tight text-[#ec0078] leading-none">
                  JoyEarn
                </h1>
              </div>

              {/* Clean Utility Actions: Notification Bell, Profile/Settings Avatar, Owner Panel (if verified) */}
              <div className="flex items-center gap-2.5">
                {/* Exclusive Owner Panel Button (Visible ONLY to verified owner) */}
                {isOwnerLoggedIn && (
                  <button
                    onClick={() => {
                      soundService.playClick();
                      setShowAdminModal(true);
                    }}
                    className="px-2.5 py-1.5 rounded-full bg-gradient-to-r from-purple-800 to-indigo-800 hover:brightness-110 text-white text-xs tap-bounce shadow-sm flex items-center gap-1 border border-purple-400/40"
                    title="Owner Panel (Full Control)"
                  >
                    <span className="text-xs">👑</span>
                    <span className="font-black text-[10px] tracking-wide">Owner</span>
                  </button>
                )}

                {/* Compact Invite Friend Icon Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setActiveModal('invite');
                  }}
                  aria-label="Invite Friend and earn 50 points"
                  title="Invite Friend (+50 Pts)"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#fdf2f8] hover:bg-[#fce7f3] border border-pink-200 text-[#ec0078] tap-bounce transition-colors shadow-2xs shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#ec0078] shrink-0" strokeWidth={2.4} />
                  <span className="text-[11px] font-extrabold leading-none whitespace-nowrap">
                    {effectiveUrdu ? 'دوست بلائیں' : 'Invite Friend'}
                  </span>
                </button>

                {/* Notification Bell with Unread Badge */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    const today = new Date().toISOString().slice(0, 10);
                    setNotifAcknowledgedDate(today);
                    try {
                      localStorage.setItem('joyearn_notif_last_viewed_date', today);
                    } catch {}
                    setActiveModal('notifications');
                  }}
                  aria-label={notificationsEnabled ? 'Open notifications' : 'Notifications muted — open settings'}
                  className="relative p-2 rounded-full hover:bg-pink-50 text-slate-900 tap-bounce transition-colors flex items-center justify-center"
                  title={notificationsEnabled ? 'Notifications' : 'Notifications muted'}
                >
                  {notificationsEnabled ? (
                    <Bell className="w-[22px] h-[22px] text-slate-900" strokeWidth={2.2} />
                  ) : (
                    <BellOff className="w-[22px] h-[22px] text-slate-400" strokeWidth={2.2} />
                  )}
                  {totalBellBadgeCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black leading-none rounded-full border-2 border-white flex items-center justify-center tabular-nums shadow-xs">
                      {totalBellBadgeCount > 9 ? '9+' : totalBellBadgeCount}
                    </span>
                  )}
                </button>

                {/* User Profile Avatar / Settings Access */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setActiveModal('settings');
                  }}
                  aria-label="Open profile and settings"
                  className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-200 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center shrink-0 tap-bounce shadow-xs"
                  title="Profile & Settings (Audio, Themes, Language, Security)"
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser?.displayName ? (
                    <span className="text-sm font-extrabold text-[#ec0078]">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-[#ec0078]" />
                  )}
                </button>
              </div>
            </header>

            {/* 1. HERO PROMO BANNER ("Earn Points / Enjoy Rewards!") */}
            <section className="px-4 pt-1 pb-2 max-w-lg mx-auto w-full">
              <div
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('chest');
                }}
                className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-5 py-4 text-white shadow-md shadow-pink-200/70 cursor-pointer tap-bounce flex items-center justify-between gap-3"
              >
                <div className="relative z-10 space-y-1">
                  <h2 className="text-[24px] sm:text-[26px] font-black leading-[1.05] tracking-tight italic drop-shadow-xs">
                    <span className="block text-white">
                      {effectiveUrdu ? 'پوائنٹس کمائیں' : 'Earn Points'}
                    </span>
                    <span className="block text-[#fde047]">
                      {effectiveUrdu ? 'انعامات حاصل کریں!' : 'Enjoy Rewards!'}
                    </span>
                  </h2>
                  <p className="text-[12.5px] font-bold text-white/95 tracking-wide pt-1">
                    {effectiveUrdu ? 'دیکھیں • سیکھیں • کھیلیں • کمائیں' : 'Watch • Learn • Play • Earn'}
                  </p>
                </div>

                {/* Decorative Gift Box & Star Coins Visual */}
                <div className="relative z-10 shrink-0 w-24 h-20 flex items-center justify-center">
                  <div className="absolute -top-1 left-0 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-100 flex items-center justify-center text-[11px] shadow-sm">
                    ⭐
                  </div>
                  <div className="absolute bottom-0 -left-1 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-100 flex items-center justify-center text-xs shadow-sm">
                    ⭐
                  </div>
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-100 to-white border-2 border-pink-200 shadow-lg flex items-center justify-center relative">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-[#ec0078]/90" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-3 bg-[#ec0078]/90" />
                    <Gift className="w-8 h-8 text-[#ec0078] relative z-10 drop-shadow-xs" />
                  </div>
                  <div className="absolute -bottom-1 right-0 w-6 h-6 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-100 flex items-center justify-center text-[10px] shadow-sm">
                    ⭐
                  </div>
                </div>
              </div>
            </section>

            {/* 2. HERO AVAILABLE BALANCE CARD */}
            <section className="px-4 py-2 max-w-lg mx-auto w-full">
              <div
                className={`bg-gradient-to-br from-[#ff2a8d] via-[#ec0078] to-[#e11d74] rounded-[24px] p-5 text-white shadow-lg shadow-pink-200/80 space-y-3.5 relative overflow-hidden transition-all duration-300 ${
                  pointsScaling ? 'scale-[1.02] ring-4 ring-pink-300/80 shadow-2xl' : 'scale-100'
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-pink-100 font-extrabold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-white fill-white/20" />
                      <span>{effectiveUrdu ? 'موجودہ بیلنس' : 'Available Balance'}</span>
                    </span>
                    <div className="text-[38px] font-black leading-none mt-1.5 flex items-baseline gap-2 tabular-nums">
                      <span>${(points / getConfiguredPointsPerDollar()).toFixed(2)}</span>
                      <span className="text-base font-extrabold text-pink-100">USD</span>
                    </div>
                    <div className="text-[12.5px] text-white/95 font-bold mt-2 flex items-center gap-1">
                      <span>⭐</span>
                      <span>
                        {points.toLocaleString()} JoyPoints ({getConfiguredPointsPerDollar().toLocaleString()} Pts = $1.00 USD)
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10.5px] uppercase tracking-wider font-extrabold text-pink-100 block">
                      {effectiveUrdu ? 'آج حاصل کردہ' : "Today's Progress"}
                    </span>
                    <span className="text-lg font-black text-white tabular-nums mt-0.5 block">
                      +{todayPoints} Pts
                    </span>
                  </div>
                </div>

                {/* Status indicator with $100 Minimum & Progress Bar */}
                {(() => {
                  const activeRate = getConfiguredPointsPerDollar();
                  const minPts = MIN_WITHDRAW_USD * activeRate;
                  const shortfallUsd = Math.max(0, (minPts - points) / activeRate);
                  const pct = Math.min(100, Math.max(points > 0 ? 3 : 0, Math.round((points / minPts) * 100)));
                  return (
                    <div className="pt-3 border-t border-white/25 space-y-2 text-xs text-white">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-[12px]">
                          {points >= minPts ? (
                            <span className="text-emerald-200 font-extrabold">
                              ✓ {effectiveUrdu ? 'کیش آؤٹ کے لیے تیار ($100)' : 'Eligible for $100 Cash Out'}
                            </span>
                          ) : (
                            <span>
                              {effectiveUrdu
                                ? `مزید $${shortfallUsd.toFixed(2)} درکار ہے`
                                : `Need $${shortfallUsd.toFixed(2)} more to reach $${MIN_WITHDRAW_USD}`}
                            </span>
                          )}
                        </span>

                        <span className="text-[11px] bg-white/20 backdrop-blur-xs border border-white/20 px-2.5 py-1 rounded-full font-bold inline-flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-yellow-300" />
                          <span>${MIN_WITHDRAW_USD} Min Withdrawal</span>
                        </span>
                      </div>

                      {/* Progress bar toward $100 */}
                      <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-yellow-300 to-emerald-300 h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Preserved Quick Actions */}
                <div className="grid grid-cols-2 gap-2.5 pt-0.5">
                  <button
                    onClick={() => {
                      soundService.playClick();
                      handleSelectTab('wallet');
                    }}
                    className="py-2.5 bg-white text-[#d9006c] hover:bg-pink-50 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-sm"
                  >
                    <Wallet className="w-3.5 h-3.5 text-[#ec0078]" />
                    <span>{effectiveUrdu ? 'رقم نکلوائیں' : 'Withdraw Funds'}</span>
                  </button>

                  <button
                    onClick={() => {
                      soundService.playClick();
                      setActiveModal('chest');
                    }}
                    className="py-2.5 bg-white/20 hover:bg-white/30 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 tap-bounce border border-white/25"
                  >
                    <Gift className="w-3.5 h-3.5 text-yellow-200" />
                    <span>{effectiveUrdu ? 'روزانہ سینہ' : 'Daily Streak Chest'}</span>
                  </button>
                </div>
              </div>
            </section>

            {/* 3. CORE ACTIVITIES — 4-COLUMN SOFT-PINK CARD GRID (MATCHES REFERENCE) */}
            <section className="px-4 py-2.5 max-w-lg mx-auto w-full">
              <div className="flex items-center justify-between mb-3 px-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#ec0078]" />
                  <h2 className="font-black text-slate-900 text-sm uppercase tracking-wide">
                    {effectiveUrdu ? 'اہم سرگرمیاں' : 'Core Activities'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    handleSelectTab('tasks');
                  }}
                  className="text-xs font-extrabold text-[#ec0078] hover:text-[#be0060] flex items-center gap-0.5 tap-bounce"
                >
                  <span>{effectiveUrdu ? 'سب دیکھیں' : 'See All'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {/* Card 1: Watch Videos */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    handleSelectTab('vlogs', 'videos');
                  }}
                  className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-2xl px-1.5 py-3 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center justify-between text-center gap-2"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] flex items-center justify-center shadow-sm">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-[11.5px] leading-tight min-h-[28px] flex items-center">
                    {effectiveUrdu ? 'ویڈیوز دیکھیں' : 'Watch Videos'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#fbcfe8] text-[#9d174d] whitespace-nowrap">
                    +25 Pts
                  </span>
                </button>

                {/* Card 2: Learn A-Z & 1-100 */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    handleOpenLearn('alphabet', 'browse');
                  }}
                  className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-2xl px-1.5 py-3 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center justify-between text-center gap-2"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-sm">
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-[11.5px] leading-tight min-h-[28px] flex items-center">
                    {effectiveUrdu ? 'حروف اور گنتی' : 'Learn A-Z & 1-100'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#fbcfe8] text-[#9d174d] whitespace-nowrap">
                    +25 Pts
                  </span>
                </button>

                {/* Card 3: Play Ludo */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setActiveModal('ludo');
                  }}
                  className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-2xl px-1.5 py-3 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center justify-between text-center gap-2"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-700 flex items-center justify-center shadow-sm">
                    <Gamepad2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-[11.5px] leading-tight min-h-[28px] flex items-center">
                    {effectiveUrdu ? 'لودو کھیلیں' : 'Play Ludo'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#fbcfe8] text-[#9d174d] whitespace-nowrap">
                    +50 Pts
                  </span>
                </button>

                {/* Card 4: Brain Activity (Daily Quiz) */}
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    handleOpenLearn('daily_quiz', 'daily_quiz');
                  }}
                  className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-2xl px-1.5 py-3 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center justify-between text-center gap-2"
                >
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-400 to-fuchsia-600 flex items-center justify-center shadow-sm">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-extrabold text-slate-900 text-[11.5px] leading-tight min-h-[28px] flex items-center">
                    {effectiveUrdu ? 'دماغی سرگرمی' : 'Brain Activity'}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#fbcfe8] text-[#9d174d] whitespace-nowrap">
                    +25 Pts
                  </span>
                </button>
              </div>
            </section>

            {/* 4. FREE SPIN PROMO BANNER (MATCHES REFERENCE — OPENS LUCKY BONUS WHEEL) */}
            <section className="px-4 py-2 max-w-lg mx-auto w-full">
              <div
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('wheel');
                }}
                className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-5 py-4 text-white shadow-md shadow-pink-200/70 cursor-pointer tap-bounce flex items-center justify-between gap-3"
              >
                <div className="relative z-10 space-y-1.5">
                  <h3 className="text-[22px] font-black italic leading-none tracking-tight text-white drop-shadow-xs">
                    {effectiveUrdu ? 'فری اسپن' : 'Free Spin'}
                  </h3>
                  <p className="text-[13px] font-extrabold italic text-[#fde047]">
                    {effectiveUrdu ? 'گھمائیں اور دلچسپ انعامات جیتیں!' : 'Spin & Win Exciting Rewards!'}
                  </p>
                  <div className="pt-1">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-[#9d174d] font-black text-xs shadow-sm">
                      <span className="w-4 h-4 rounded-full bg-[#ec0078] flex items-center justify-center">
                        <Play className="w-2.5 h-2.5 text-white fill-white ml-0.5" />
                      </span>
                      <span>{effectiveUrdu ? 'ابھی کھیلیں' : 'Play Now'}</span>
                    </span>
                  </div>
                </div>

                {/* Colorful Spin Wheel Visual */}
                <div className="relative z-10 shrink-0 w-24 h-24 flex items-center justify-center">
                  <div
                    className="w-20 h-20 rounded-full border-4 border-yellow-300 shadow-lg flex items-center justify-center"
                    style={{
                      background:
                        'conic-gradient(#facc15 0deg 60deg, #3b82f6 60deg 120deg, #a855f7 120deg 180deg, #ec4899 180deg 240deg, #ef4444 240deg 300deg, #22c55e 300deg 360deg)',
                    }}
                  >
                    <div className="w-7 h-7 rounded-full bg-yellow-300 border-2 border-white shadow-sm flex items-center justify-center text-xs">
                      ⭐
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* 5. PRESERVED DAILY 5 MANDATORY TASKS CHECKLIST */}
            <DailyTasksCard
              completedTaskIds={completedDailyTaskIds}
              onTaskAction={(actionKey) => {
                if (actionKey === 'checkin') {
                  markMandatoryTaskDone('daily_checkin');
                  handleEarnPoints(50, 'Daily Check-in 📅');
                } else if (actionKey === 'learn') {
                  handleOpenLearn('daily_quiz', 'daily_quiz');
                } else if (actionKey === 'watch') {
                  handleSelectTab('vlogs', 'videos');
                } else if (actionKey === 'wheel') {
                  setActiveModal('wheel');
                } else if (actionKey === 'chest') {
                  setActiveModal('chest');
                }
              }}
              streakDays={streakDays}
              todayPoints={todayPoints}
              seniorMode={effectiveUrdu}
              userId={currentUser?.uid}
              onCheckInCompleted={() => {
                markMandatoryTaskDone('daily_checkin');
                handleEarnPoints(50, 'Daily Check-in 📅');
              }}
            />

            {/* 6. PRESERVED COMPACT DAILY FUN MISSIONS (Quick Quiz, Picture Puzzle, Brain Challenge) */}
            <section className="px-4 py-2 max-w-lg mx-auto w-full">
              <DailyMissionsCard
                uid={currentUser?.uid || 'local'}
                streakDays={streakDays}
                refreshKey={missionsRefreshKey}
                onOpenMission={(id) => setActiveDailyMission(id)}
                onOpenLeaderboard={() => setEngagementModal('weekly')}
              />
            </section>

        {/* TODAY'S THEME + LEVELS/BADGES/SHIELD/ALBUM/COURSES/WEEKLY/EVENTS HUB */}
        <EngagementHubCard
          uid={currentUser?.uid || 'local'}
          totalPoints={totalJoyPointsEarned}
          streakDays={streakDays}
          quizzesCompletedCount={completedQuizIds.length}
          seniorMode={effectiveUrdu}
          onOpenModal={(tab) => setEngagementModal(tab)}
          onOpenLearn={() => handleOpenLearn('daily_quiz', 'browse')}
        />

        {/* 4. TODAY'S FEATURED VIDEO SPOTLIGHT */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                {effectiveUrdu ? 'آج کی نمایاں ویڈیو' : "Today's Featured Video"}
              </span>
              <span className="text-amber-600 font-extrabold text-[11px] flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>+25 JoyPoints</span>
              </span>
            </div>

            <div
              onClick={() => {
                soundService.playClick();
                handleSelectTab('vlogs', 'videos');
              }}
              className="flex items-center gap-3.5 cursor-pointer group"
            >
              <div className="w-24 aspect-video rounded-2xl overflow-hidden shrink-0 shadow-2xs relative bg-slate-900">
                <img
                  src={WATCH_PAGE_VIDEOS[0]?.thumbnail || 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80'}
                  alt="Featured Video"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 line-clamp-1 group-hover:text-pink-600 transition-colors">
                  {WATCH_PAGE_VIDEOS[0]?.title || 'Easy Clay Modeling & Sculpting for Beginners'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {WATCH_PAGE_VIDEOS[0]?.author || 'JoyEarn Creative Studio'} • {WATCH_PAGE_VIDEOS[0]?.duration || '3:45'}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-pink-600 mt-1">
                  <span>{effectiveUrdu ? 'ابھی دیکھیں' : 'Watch Now'}</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 5. JOYLUDO ROYAL & MINI-GAMES SPOTLIGHT BANNER */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div
            onClick={() => {
              soundService.playClick();
              setActiveModal('ludo');
            }}
            className="bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 text-white rounded-3xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer tap-bounce border-2 border-amber-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 font-black text-[9.5px] px-3 py-0.5 rounded-bl-2xl uppercase tracking-wider shadow-xs">
              👑 {effectiveUrdu ? 'نئی لودو شامل' : 'New Ludo Game'}
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🎲
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white">
                    JoyLudo Royal
                  </h3>
                  <span className="text-[10px] font-black bg-white text-rose-600 px-2 py-0.2 rounded-full shadow-xs">
                    +100 Pts
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5 line-clamp-1">
                  {effectiveUrdu
                    ? 'اصلی ۱۵×۱۵ لودو • روبوٹ کے خلاف یا دوستوں کے ساتھ کھیلیں'
                    : 'Classic 15x15 Ludo with 3D rolling dice & token cutting!'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-black text-amber-200 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>{effectiveUrdu ? 'ابھی لودو کھیلیں' : 'Play Ludo Now'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] text-white/80 font-bold">
                    • 100% Free
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* 7. COMMUNITY VLOGS FEATURE BANNER */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div
            onClick={() => {
              soundService.playClick();
              handleSelectTab('vlogs', 'vlogs');
            }}
            className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white rounded-3xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer tap-bounce border-2 border-red-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-red-400 text-red-950 font-black text-[9.5px] px-3 py-0.5 rounded-bl-2xl uppercase tracking-wider shadow-xs">
              📹 {effectiveUrdu ? 'کمیونٹی وی لاگز' : 'Community Vlogs'}
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                🎥
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white">
                    {effectiveUrdu ? 'کمیونٹی وی لاگز' : 'Community Vlogs'}
                  </h3>
                  <span className="text-[10px] font-black bg-white text-rose-600 px-2 py-0.2 rounded-full shadow-xs">
                    {effectiveUrdu ? 'دیکھیں اور شیئر کریں' : 'Watch & Share'}
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5 line-clamp-1">
                  {effectiveUrdu
                    ? 'دیگر صارفین کے فیملی وی لاگز دیکھیں یا اپنا یوٹیوب لنک شیئر کریں!'
                    : 'Watch vlogs shared by other learners or share your own YouTube link!'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-black text-amber-200 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>{effectiveUrdu ? 'وی لاگز دیکھیں' : 'Explore Community Vlogs'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] text-white/80 font-bold">
                    • 100% Family-Safe
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. SINGLE DEDICATED SPONSORS SHOWCASE */}
        {appSettings.features.enableSponsorsSection && (
          <section className="px-4 py-2 max-w-lg mx-auto w-full">
            <SponsorSection
              seniorMode={effectiveUrdu}
              onOpenAdvertiseModal={() => setShowAdvertiseModal(true)}
            />
          </section>
        )}

        {/* Quick Legal & Settings Links */}
        <footer className="px-4 py-3 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-500 pt-1">
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('settings');
              }}
              className="hover:text-rose-600 underline tap-bounce"
            >
              {effectiveUrdu ? 'سیٹنگز' : 'Settings'}
            </button>
            <span>•</span>
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('privacy');
              }}
              className="hover:text-rose-600 underline tap-bounce"
            >
              {effectiveUrdu ? 'پرائیویسی پالیسی' : 'Privacy Policy'}
            </button>
          </div>
        </footer>
          </div>
        )}

        {/* DEDICATED VIDEOS & COMMUNITY VLOGS PAGE (Two Tabs: "Videos" & "Vlogs") */}
        {activeTab === 'vlogs' && (
          <div className="pb-24">
            <VlogsSection
              isOpen={true}
              onClose={() => handleSelectTab('home')}
              currentUser={currentUser}
              seniorMode={effectiveUrdu}
              onOpenLiveCamera={() => setIsCameraStudioOpen(true)}
              onOpenAuth={() => setActiveModal('auth')}
              initialTab={vlogsInitialTab}
              videos={videos}
              onEarnPoints={handleEarnPoints}
              onToggleOffline={handleToggleOffline}
              watchedVideoIds={watchedVideoIds}
              onCompleteVideo={(videoId) => {
                setWatchedVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
                markMandatoryTaskDone('daily_video');
              }}
              isModal={false}
              refreshTrigger={vlogsRefreshTrigger}
              onOpenNotifications={() => {
                const today = new Date().toISOString().slice(0, 10);
                setNotifAcknowledgedDate(today);
                try {
                  localStorage.setItem('joyearn_notif_last_viewed_date', today);
                } catch {}
                setActiveModal('notifications');
              }}
              onOpenProfile={() => setActiveModal('settings')}
              unreadNotificationCount={totalBellBadgeCount}
            />
          </div>
        )}

        {/* DEDICATED LEARN EDUCATIONAL PAGE */}
        {activeTab === 'learn' && (
          <LearnPage
            quizzes={quizzes}
            onEarnPoints={handleEarnPoints}
            seniorMode={effectiveUrdu}
            completedQuizIds={completedQuizIds}
            onCompleteQuiz={(quizId) => {
              setCompletedQuizIds((prev) => (prev.includes(quizId) ? prev : [...prev, quizId]));
              if (isDailyQuizCompletedToday()) {
                markMandatoryTaskDone('daily_quiz');
              }
            }}
            onDailyQuizCompleted={() => {
              setQuizStreakFireAnim(true);
              soundService.playStreakFlame();
              soundService.playFanfare();
              hapticService.heavy();
              markMandatoryTaskDone('daily_quiz');
              setTimeout(() => setQuizStreakFireAnim(false), 8500);
            }}
            streakDays={streakDays}
            onBackToHome={() => handleSelectTab('home')}
            initialSection={learnNavTarget.section}
            initialView={learnNavTarget.view}
            navigationTrigger={learnNavTarget.reqId}
            userName={userName}
            userUid={currentUser?.uid || 'local'}
            totalPoints={totalJoyPointsEarned}
            onTriggerConfetti={handleTriggerConfetti}
            currentUser={currentUser}
            onOpenNotifications={() => {
              const today = new Date().toISOString().slice(0, 10);
              setNotifAcknowledgedDate(today);
              try {
                localStorage.setItem('joyearn_notif_last_viewed_date', today);
              } catch {}
              setActiveModal('notifications');
            }}
            onOpenProfile={() => setActiveModal('settings')}
            unreadNotificationCount={totalBellBadgeCount}
          />
        )}

        {/* DEDICATED VERIFIED TASKS PAGE */}
        {activeTab === 'tasks' && (
          <TasksPage
            tasks={tasks}
            onCompleteTask={handleCompleteTask}
            onEarnPoints={handleEarnPoints}
            seniorMode={effectiveUrdu}
            completedDailyTaskIds={completedDailyTaskIds}
            onDailyTaskAction={(actionKey) => {
              if (actionKey === 'checkin') {
                markMandatoryTaskDone('daily_checkin');
                handleEarnPoints(50, 'Daily Attendance Check-in 📅');
              } else if (actionKey === 'learn') {
                handleOpenLearn('daily_quiz', 'daily_quiz');
              } else if (actionKey === 'watch') {
                handleSelectTab('vlogs', 'videos');
              } else if (actionKey === 'wheel') {
                setActiveModal('wheel');
              } else if (actionKey === 'chest') {
                setActiveModal('chest');
              }
            }}
            streakDays={streakDays}
            todayPoints={todayPoints}
            onBackToHome={() => handleSelectTab('home')}
            currentUser={currentUser}
            onOpenNotifications={() => {
              const today = new Date().toISOString().slice(0, 10);
              setNotifAcknowledgedDate(today);
              try {
                localStorage.setItem('joyearn_notif_last_viewed_date', today);
              } catch {}
              setActiveModal('notifications');
            }}
            onOpenProfile={() => setActiveModal('settings')}
            unreadNotificationCount={totalBellBadgeCount}
            onOpenInvite={() => setActiveModal('invite')}
          />
        )}

        {/* DEDICATED WALLET & VERIFIED EARNINGS PAGE */}
        {activeTab === 'wallet' && (
          <WalletPage
            points={points}
            todayPoints={todayPoints}
            totalJoyPointsEarned={totalJoyPointsEarned}
            completedTasksCount={completedTasksCount}
            transactions={transactions}
            onEarnPoints={handleEarnPoints}
            onDeductPoints={handleDeductPoints}
            seniorMode={effectiveUrdu}
            currentUser={currentUser}
            onOpenAdminPortal={() => setShowAdminModal(true)}
            onBackToHome={() => handleSelectTab('home')}
            onOpenNotifications={() => {
              const today = getLocalDateKey();
              setNotifAcknowledgedDate(today);
              try {
                localStorage.setItem('joyearn_notif_last_viewed_date', today);
              } catch {}
              setActiveModal('notifications');
            }}
            onOpenProfile={() => setActiveModal('settings')}
            unreadNotificationCount={totalBellBadgeCount}
            onOpenTasks={() => handleSelectTab('tasks')}
          />
        )}

        {/* ACTIVE MODAL OVERLAYS (Non-tab dialogues) */}

        {activeModal === 'play' && (
          <MiniGames
            onEarnPoints={(pts, reason) => {
              setGamesCompletedCount((c) => Math.min(3, c + 1));
              handleEarnPoints(pts, reason);
            }}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* JoyLudo Royal Modal */}
        {activeModal === 'ludo' && (
          <LudoGame
            onEarnPoints={(pts, reason) => {
              setGamesCompletedCount((c) => Math.min(3, c + 1));
              handleEarnPoints(pts, reason);
            }}
            onClose={() => handleCloseFeatureModal('play')}
            seniorMode={effectiveUrdu}
            onTriggerConfetti={handleTriggerConfetti}
          />
        )}

        {activeModal === 'invite' && (
          <InviteModal
            referrals={referrals}
            currentUser={currentUser}
            onReferralPointsCredited={applyCreditedReferralRewards}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {activeModal === 'offline' && (
          <OfflineModal
            videos={videos}
            onToggleOffline={handleToggleOffline}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {activeModal === 'kids' && (
          <KidsZone onClose={() => handleCloseFeatureModal('kids')} seniorMode={effectiveUrdu} />
        )}

        {activeModal === 'garden' && (
          <VirtualGarden onClose={() => handleCloseFeatureModal('garden')} seniorMode={effectiveUrdu} />
        )}

        {activeModal === 'chest' && (
          <DailyChestModal
            streak={streakDays}
            claimedToday={claimedChestToday}
            onClaimDaily={handleClaimChest}
            onClose={() => handleCloseFeatureModal('chest')}
          />
        )}

        {activeModal === 'themes' && (
          <ThemeSelectorModal
            currentTheme={currentThemeKey}
            onSelectTheme={setCurrentThemeKey}
            onClose={() => setActiveModal(null)}
          />
        )}



        {/* Lucky Wheel Modal */}
        {activeModal === 'wheel' && (
          <LuckyWheelModal
            onEarnPoints={handleEarnPoints}
            onClose={() => handleCloseFeatureModal('wheel')}
            seniorMode={effectiveUrdu}
            hasSpunToday={hasSpunWheelToday}
            onSpinCompleted={handleWheelSpinCompleted}
            onTriggerJackpotConfetti={handleTriggerConfetti}
          />
        )}

        {/* Personal Dashboard Modal */}
        {activeModal === 'dashboard' && (
          <PersonalDashboardModal
            onClose={() => setActiveModal(null)}
            currentPoints={points}
            userName={userName}
            userAvatar={theme.mascot}
            userEmail={currentUser?.email || undefined}
            userUid={currentUser?.uid || undefined}
            seniorMode={effectiveUrdu}
            completedActivitiesCount={dailyGoalCount}
            streakDays={streakDays}
            hasAdFree={hasAdFree}
            onOpenLearn={() => {
              setActiveModal(null);
              handleSelectTab('learn');
            }}
            onOpenWatch={() => {
              setActiveModal(null);
              handleSelectTab('vlogs', 'videos');
            }}
            onOpenSpin={() => setActiveModal('wheel')}
            onOpenScratch={() => setActiveModal('play')}
            onOpenWallet={() => {
              setActiveModal(null);
              handleSelectTab('wallet');
            }}
            onTriggerConfetti={handleTriggerConfetti}
            onClaimMilestone={handleClaimMilestone}
            claimedMilestoneIds={claimedMilestones}
            onUpdateUserName={(name: string) => {
              setUserName(name);
              localStorage.setItem('joyearn_userName', name);
            }}
          />
        )}

        {/* Live Stream Modal */}
        {activeModal === 'livestream' && (
          <LiveStreamModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            userPoints={points}
            onSpendPoints={(amt) => handleSpendPoints(amt, 'Sent Live Stream Gift 🎁', 'Completed')}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* Community Chat Lounge */}
        {activeModal === 'community' && (
          <CommunityChatModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* JoyMarket & Shop Modal */}
        {activeModal === 'shop' && (
          <ShopMarketModal
            isOpen={true}
            onClose={() => handleCloseFeatureModal('shop')}
            userPoints={points}
            onPurchaseItem={(cost) => handleSpendPoints(cost, 'JoyMarket Shop Purchase 🛍️', 'Completed')}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* Creator & Educator Agency Modal */}
        {activeModal === 'agency' && (
          <CreatorAgencyModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* Community Vlogs Modal */}
        {activeModal === 'vlogs' && (
          <VlogsSection
            isOpen={true}
            onClose={() => handleCloseFeatureModal('vlogs')}
            currentUser={currentUser}
            seniorMode={effectiveUrdu}
            onOpenAuth={() => setActiveModal('auth')}
            initialTab={vlogsInitialTab}
            videos={videos}
            onEarnPoints={handleEarnPoints}
            onToggleOffline={handleToggleOffline}
            watchedVideoIds={watchedVideoIds}
            onCompleteVideo={(videoId) => {
              setWatchedVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
              markMandatoryTaskDone('daily_video');
            }}
            isModal={true}
            onOpenNotifications={() => {
              const today = new Date().toISOString().slice(0, 10);
              setNotifAcknowledgedDate(today);
              try {
                localStorage.setItem('joyearn_notif_last_viewed_date', today);
              } catch {}
              setActiveModal('notifications');
            }}
            onOpenProfile={() => setActiveModal('settings')}
            unreadNotificationCount={totalBellBadgeCount}
          />
        )}



        {/* Google Authentication & Email Confirmation Modal */}
        {activeModal === 'auth' && (
          <GoogleAuthModal
            currentUser={currentUser}
            onUserChange={handleUserChange}
            onAwardWelcomeBonus={(pts) => handleEarnPoints(pts, 'Google Account Welcome Bonus 🎉')}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
            currentPoints={points}
            streakDays={streakDays}
          />
        )}

        {/* Settings Modal */}
        {activeModal === 'settings' && (
          <SettingsModal
            onClose={() => setActiveModal(null)}
            seniorMode={seniorMode}
            onToggleSeniorMode={() => setSeniorMode(!seniorMode)}
            language={language}
            onLanguageChange={handleLanguageChange}
            isDarkMode={isDarkMode}
            onToggleDarkMode={handleToggleDarkMode}
            onOpenThemeSelector={() => setActiveModal('themes')}
            onOpenPrivacyPolicy={() => setActiveModal('privacy')}
            onOpenAuthModal={() => setActiveModal('auth')}
            onOpenRateApp={() => setShowRateModal(true)}
            currentUser={currentUser}
            onClearCache={handleClearAppCache}
            isImmersive={isImmersive}
            onToggleImmersive={toggleImmersive}
            androidFrameMode={androidFrameMode}
            onToggleAndroidFrame={() => setAndroidFrameMode(!androidFrameMode)}
            currentPoints={points}
            totalJoyPointsEarned={totalJoyPointsEarned}
            totalActivitiesCompleted={totalActivitiesCompleted}
            totalOfflineVideosSaved={offlineVideosCount}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            onOpenAdmin={() => setShowAdminModal(true)}
            onOpenAdvertiseModal={() => setShowAdvertiseModal(true)}
          />
        )}

        {/* Privacy Policy & Data Safety Modal */}
        {activeModal === 'privacy' && (
          <PrivacyPolicyModal
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {/* Play Store App Rating Modal (Triggers after 5 completed activities) */}
        {showRateModal && (
          <AppRateModal
            onClose={() => setShowRateModal(false)}
            onRateCompleted={(bonusPts) => {
              handleEarnPoints(bonusPts, 'Play Store Review Bonus ⭐');
            }}
            seniorMode={effectiveUrdu}
            completedActivitiesCount={totalActivitiesCompleted}
          />
        )}

        {/* Local Notification System & In-App Alerts */}
        <NotificationManager
          claimedChestToday={claimedChestToday}
          uncompletedTasksCount={uncompletedTasksCount}
          onOpenChest={() => setActiveModal('chest')}
          onOpenTasks={() => {
            setActiveModal(null);
            handleSelectTab('tasks');
          }}
          onOpenLearn={() => {
            setActiveModal(null);
            handleSelectTab('learn');
          }}
          seniorMode={effectiveUrdu}
          isOpen={activeModal === 'notifications'}
          onClose={() => setActiveModal(null)}
          onUnreadCountChange={setUnreadNotifCount}
          streakDays={streakDays}
          userUid={currentUser?.uid}
          isLearningSessionActive={activeTab === 'learn'}
        />

        {/* ANDROID RECENTS / APP INFO SWITCHER SHEET */}
        {showRecentsSheet && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-3">
            <div className="bg-slate-900 text-white rounded-3xl w-full max-w-md p-4 space-y-3 shadow-2xl border-t border-white/20 animate-bounce-subtle">
              <div className="w-12 h-1 bg-white/30 rounded-full mx-auto" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-lg">
                    {theme.mascot}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">JoyEarn Global App</h3>
                    <p className="text-[10px] text-gray-400">Running v2.4.0 • Android 14 Material</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRecentsSheet(false)}
                  className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full font-bold"
                >
                  Close
                </button>
              </div>

              {/* Running App Overview Cards */}
              <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>System Memory:</span>
                  <strong className="text-emerald-400">12.4 MB (Smooth 60 FPS)</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>Google Play Protect:</span>
                  <strong className="text-emerald-400">✓ Verified Safe (0 Threats)</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>Payment Gateway:</span>
                  <strong className="text-amber-400">Google Play Billing (USD)</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span>Offline Storage:</span>
                  <strong className="text-blue-400">Active (Play without WiFi)</strong>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowRecentsSheet(false);
                    setShowInstallModal(true);
                  }}
                  className="py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl text-xs font-bold tap-bounce text-center"
                >
                  Install Android App
                </button>
                <button
                  onClick={() => {
                    setShowRecentsSheet(false);
                    handleAndroidHome();
                  }}
                  className="py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 rounded-xl text-xs font-bold tap-bounce text-center"
                >
                  Return to App
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FIXED ANDROID MATERIAL 3 BOTTOM NAVIGATION BAR + PERSISTENT VOICE PLAYBACK BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-md mx-auto">
          <VoicePlaybackBar />
        </div>
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-pink-100 dark:border-slate-800 shadow-2xl">
          <div className="max-w-md mx-auto">
            <AndroidBottomNav
              activeTab={activeTab}
              onSelectTab={(tab) => {
                if (tab === 'vlogs') {
                  handleSelectTab('vlogs', 'videos');
                  return;
                }
                handleSelectTab(tab as NavTab);
              }}
              seniorMode={effectiveUrdu}
              uncompletedTasksCount={uncompletedTasksCount}
            />
          </div>
        </div>
      </div>

      {/* Vlogs In-App Video Camera Modal */}
      <CameraStudioModal
        isOpen={isCameraStudioOpen}
        onClose={() => setIsCameraStudioOpen(false)}
        seniorMode={effectiveUrdu}
        onEarnPoints={handleEarnPoints}
        currentUser={currentUser}
        initialMode="video"
        onPublishVlog={handlePublishCameraVlog}
      />

      {/* Daily Fun Missions (Quiz Battle, Picture Puzzle, Brain Challenge) Modal */}
      <DailyMissionsModal
        isOpen={activeDailyMission !== null}
        missionId={activeDailyMission}
        onClose={() => setActiveDailyMission(null)}
        uid={currentUser?.uid || 'local'}
        displayName={currentUser?.displayName || userName}
        onEarnPoints={handleEarnPoints}
        onMissionUpdated={() => setMissionsRefreshKey((k) => k + 1)}
      />

      {/* Standalone Streak Leaderboard Modal */}
      <StreakLeaderboardModal
        isOpen={showStreakLeaderboard}
        onClose={() => setShowStreakLeaderboard(false)}
        userStreak={streakDays}
        userName={userName}
        userPoints={points}
        seniorMode={effectiveUrdu}
      />

      {/* 7-Day Daily Goals Calendar View Modal */}
      <DailyGoalsCalendarModal
        isOpen={showDailyGoalsCalendarModal || activeModal === 'dailyGoalsCalendar'}
        onClose={() => {
          setShowDailyGoalsCalendarModal(false);
          if (activeModal === 'dailyGoalsCalendar') setActiveModal(null);
        }}
        streakDays={streakDays}
        todayActivitiesCount={dailyGoalCount}
        seniorMode={effectiveUrdu}
      />

      {/* Hidden Admin Withdrawal Portal (Opened only by ADMIN_EMAIL) */}
      <AdminWithdrawalModal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        currentUserEmail={currentUser?.email}
        seniorMode={effectiveUrdu}
      />

      {/* First-Time Tutorial Coach-Mark Tooltip Overlay */}
      <FirstTimeTutorialOverlay
        seniorMode={effectiveUrdu}
      />

      {/* Sponsor Advertise With Us Modal */}
      <SponsorAdvertiseModal
        isOpen={showAdvertiseModal}
        onClose={() => setShowAdvertiseModal(false)}
        currentUser={currentUser}
        seniorMode={effectiveUrdu}
      />

      {/* Policy-Safe Interstitial on Returning to Home from Features (Suppressed in Owner Ad-Free Mode) */}
      <AdMobInterstitialModal
        isOpen={showFeatureExitInterstitial && !isOwnerLoggedIn && !hasAdFree}
        onClose={() => setShowFeatureExitInterstitial(false)}
        seniorMode={effectiveUrdu}
      />

      {/* Engagement Hub Modals (Levels/Shield, Knowledge Album, 30-Day Courses, Weekly Challenge, Event Quizzes) */}
      <EngagementModals
        activeModal={engagementModal}
        onClose={() => setEngagementModal(null)}
        uid={currentUser?.uid || 'local'}
        userName={userName}
        totalPoints={totalJoyPointsEarned}
        streakDays={streakDays}
        quizzesCompletedCount={completedQuizIds.length}
        onEarnPoints={handleEarnPoints}
        onTriggerConfetti={handleTriggerConfetti}
        seniorMode={effectiveUrdu}
      />

      {/* Lightweight Canvas Confetti Effect */}
      <ConfettiEffect
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      {/* Global Non-Blocking Toast Banner */}
      {appToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92%] animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center justify-between gap-3 backdrop-blur-md ${
              appToast.tone === 'warn'
                ? 'bg-amber-950/95 border-amber-500 text-amber-100'
                : appToast.tone === 'success'
                ? 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
                : 'bg-slate-900/95 border-slate-700 text-white'
            }`}
          >
            <span className="leading-snug">{appToast.message}</span>
            <button
              type="button"
              onClick={() => setAppToast(null)}
              className="text-white/70 hover:text-white font-black text-xs shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
