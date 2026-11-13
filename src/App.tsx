import { darkModeService } from './services/darkModeService';
import { crashlytics } from './services/crashlytics';
import { FirstTimeTutorialOverlay } from './components/FirstTimeTutorialOverlay';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wallet,
  Play,
  Gift,
  Settings,
  ShieldCheck,
  ChevronRight,
  Bell,
  WifiOff,
  Camera
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
import { WatchPage } from './components/WatchPage';
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
import { syncUserDataToCloud, loadUserDataFromCloud, deleteUserDataFromFirestore, recordTaskCompletionInFirestore } from './services/firestoreService';
import { LiveStreamModal } from './components/LiveStreamModal';
import { CommunityChatModal } from './components/CommunityChatModal';
import { ShopMarketModal } from './components/ShopMarketModal';
import { CreatorAgencyModal } from './components/CreatorAgencyModal';
import { VlogsSection } from './components/VlogsSection';
import { submitVlog } from './services/vlogService';
import { AdMobInterstitialModal } from './components/AdMobInterstitialModal';
import { adMobManager } from './services/adMobService';
import { CameraStudioModal } from './components/CameraStudioModal';
import { LudoGame } from './components/LudoGame';
import { useImmersiveMode } from './hooks/useImmersiveMode';
import { soundService } from './services/soundService';
import { hapticService } from './services/haptics';
import { initAuth, logout, deleteCurrentAuthUser, getLastSavedProfile, checkRedirectResult } from './services/googleAuth';

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

  // authReady stays false until Firebase onAuthStateChanged has fired for the first time
  const [authReady, setAuthReady] = useState(false);
  const [serverBusyNotice, setServerBusyNotice] = useState<string | null>(null);

  // Initial JoyPoints balance is strictly 0 for new users
  const [points, setPoints] = useState<number>(0);
  const [pointsScaling, setPointsScaling] = useState(false);
  const prevPointsRef = useRef(points);

  // Animate JoyPoints balance indicator with subtle scaling effect whenever new points are earned
  useEffect(() => {
    if (points > prevPointsRef.current) {
      setPointsScaling(true);
      const timer = setTimeout(() => {
        setPointsScaling(false);
      }, 750);
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

  const [totalJoyPointsEarned, setTotalJoyPointsEarned] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_lifetime_points');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });
  const [todayPoints, setTodayPoints] = useState<number>(0);
  const [streakDays, setStreakDays] = useState<number>(0);
  const [quizStreakFireAnim, setQuizStreakFireAnim] = useState<boolean>(false);

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

  // Offline Mode Status Detector (Browser navigator.onLine & network events)
  const [isDeviceOffline, setIsDeviceOffline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? !navigator.onLine : false;
  });

  useEffect(() => {
    const handleOnline = () => setIsDeviceOffline(false);
    const handleOffline = () => setIsDeviceOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

  // Initialize Auth, Lucky wheel, & anti-cheat daily resets
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

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
      setTodayPoints(0);
    } else {
      const savedToday = localStorage.getItem('joyearn_today_points');
      if (savedToday) setTodayPoints(parseInt(savedToday, 10) || 0);
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

    // Check for redirect sign-in result on startup
    checkRedirectResult().catch(() => {});

    const unsubscribe = initAuth(
      (user) => {
        setAuthReady(true);
        const isEmailSent = localStorage.getItem(`joyearn_email_sent_${user.uid}`) === 'true';
        setCurrentUser({
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          confirmationEmailSent: isEmailSent
        });
        if (user.displayName) {
          setUserName(user.displayName.split(' ')[0]);
        }

        // Restore points, streak & today's progress from cloud Firestore linked to login
        loadUserDataFromCloud(user.uid).then((cloud) => {
          if (cloud) {
            const realPoints = typeof cloud.points === 'number' ? cloud.points : 0;
            const realStreak = typeof cloud.streakDays === 'number' ? cloud.streakDays : 0;
            const realToday = (cloud.lastActiveDate === todayStr && typeof cloud.todayPoints === 'number')
              ? cloud.todayPoints
              : 0;
            const realTotal = typeof (cloud as any).totalEarned === 'number'
              ? (cloud as any).totalEarned
              : realPoints;

            setPoints(realPoints);
            setStreakDays(realStreak);
            setTodayPoints(realToday);
            setTotalJoyPointsEarned(realTotal);
          } else {
            // New user: strictly 0 points, 0 balance, 0 streak
            setPoints(0);
            setStreakDays(0);
            setTodayPoints(0);
            setTotalJoyPointsEarned(0);
            syncUserDataToCloud(user.uid, {
              points: 0,
              streakDays: 0,
              todayPoints: 0,
              email: user.email,
              displayName: user.displayName,
              lastActiveDate: todayStr,
            }).catch(() => {});
          }
        }).catch(() => {
          // Never sign out on network/Firestore error
        });
      },
      () => {
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
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [referrals, setReferrals] = useState<ReferralUser[]>(INITIAL_REFERRALS);
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>(['q1']);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>(['v1']);
  const [gamesCompletedCount, setGamesCompletedCount] = useState<number>(1);

  // Active primary bottom navigation tab & navigation history
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [vlogsInitialTab, setVlogsInitialTab] = useState<'videos' | 'vlogs'>('videos');
  // Active modal
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);

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
    if (adMobManager.shouldTriggerAdAfterFeature(featureName, currentUser?.email)) {
      setTimeout(() => {
        setShowFeatureExitInterstitial(true);
      }, 500);
    }
  };

  const handleSelectTab = (tab: NavTab, initialSubTab?: 'videos' | 'vlogs') => {
    soundService.playClick();
    let targetTab: NavTab = tab;
    if (tab === 'watch') {
      setVlogsInitialTab('videos');
      targetTab = 'vlogs';
    } else if (tab === 'vlogs') {
      if (initialSubTab) {
        setVlogsInitialTab(initialSubTab);
      }
    }

    if (targetTab === activeTab) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // Interstitial shown when user returns to Home from a feature (watch, learn, vlogs, etc., wallet excluded)
    const prevTab = activeTab;
    if (prevTab !== 'home' && targetTab === 'home') {
      if (adMobManager.shouldTriggerAdAfterFeature(prevTab, currentUser?.email)) {
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

  // Exclusive Owner Identification: ONLY fatimakiduniya362@gmail.com or active owner email
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

  // Uncompleted tasks count for reminders & notifications
  const uncompletedTasksCount = tasks.filter((t) => !t.completed).length;

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

  // Add Points handler with Anti-Cheat Daily Max Limit
  const handleEarnPoints = (earnedPoints: number, reason: string) => {
    // Check anti-cheat daily points ceiling
    if (todayPoints >= DAILY_MAX_POINTS) {
      soundService.playClick();
      try {
        alert(`Daily maximum points limit reached (${DAILY_MAX_POINTS.toLocaleString()} Pts). Anti-cheat protection active: please return tomorrow to keep earning!`);
      } catch {}
      return;
    }

    const availableAllowance = DAILY_MAX_POINTS - todayPoints;
    const actualPointsEarned = Math.min(earnedPoints, availableAllowance);
    if (actualPointsEarned <= 0) return;

    soundService.playCoin();
    hapticService.success();
    crashlytics.log(`Points earned: +${actualPointsEarned} (${reason})`);
    crashlytics.setCustomKey('userPoints', points + actualPointsEarned);
    setPoints((prev) => prev + actualPointsEarned);
    setTotalJoyPointsEarned((prev) => {
      const next = prev + actualPointsEarned;
      try {
        localStorage.setItem('joyearn_lifetime_points', String(next));
      } catch {}
      return next;
    });
    setTodayPoints((prev) => {
      const nextToday = prev + actualPointsEarned;
      try {
        localStorage.setItem('joyearn_today_points', String(nextToday));
      } catch {}
      return nextToday;
    });

    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      title: reason,
      type: 'earn',
      points: actualPointsEarned,
      date: 'Just now',
      status: 'Completed',
    };
    setTransactions((prev) => [newTx, ...prev]);

    // Cloud sync to Firestore / local device storage
    if (currentUser?.uid) {
      syncUserDataToCloud(currentUser.uid, {
        points: points + actualPointsEarned,
        streakDays,
        todayPoints: todayPoints + actualPointsEarned,
        email: currentUser.email,
        displayName: currentUser.displayName,
      });
    }

    // Mascot encouragement
    const cheers = [
      'Great job! Honest effort makes honest rewards! ⭐',
      'Activity completed! Your points are credited! 🎉',
      "Keep learning and having fun together! 🐰",
      'Awesome work! Let\'s earn sustainably! 🌿',
    ];
    setMascotQuote(cheers[Math.floor(Math.random() * cheers.length)]);
  };

  // Deduct points for withdrawals or perks
  const handleDeductPoints = (deductAmount: number, reason: string) => {
    soundService.playClick();
    setPoints((prev) => Math.max(0, prev - deductAmount));
    const newTx: TransactionRecord = {
      id: `tx-wd-${Date.now()}`,
      title: reason,
      type: 'perk',
      points: -deductAmount,
      date: 'Just now',
      status: 'Pending',
    };
    setTransactions((prev) => [newTx, ...prev]);

    if (currentUser?.uid) {
      syncUserDataToCloud(currentUser.uid, {
        points: Math.max(0, points - deductAmount),
        streakDays,
        todayPoints,
        email: currentUser.email,
        displayName: currentUser.displayName,
      });
    }
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
      try {
        alert('You have already claimed your daily bonus today! Return tomorrow for the next bonus.');
      } catch {}
      return;
    }
    setClaimedChestToday(true);
    try {
      localStorage.setItem('joyearn_daily_chest_last_claimed', todayStr);
    } catch {}
    setStreakDays((s) => s + 1);
    hapticService.heavy();
    markMandatoryTaskDone('daily_chest');
    handleEarnPoints(earnedPoints, `Daily Streak Chest (Day ${streakDays + 1})`);
  };

  // Redeem in-app perk
  const handleRedeemPerk = (perkId: string, perkName: string, cost: number): boolean => {
    if (points < cost) return false;
    setPoints((p) => p - cost);
    const newTx: TransactionRecord = {
      id: `tx-${Date.now()}`,
      title: `Unlocked: ${perkName}`,
      type: 'perk',
      points: -cost,
      date: 'Today, Just now',
      status: 'Completed',
    };
    setTransactions((prev) => [newTx, ...prev]);
    return true;
  };

  // Logout handler
  const handleLogout = () => {
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
    setCurrentUser(null);
    setPoints(100);
    setTodayPoints(0);
    setStreakDays(0);
    soundService.playClick();
    try {
      alert('Your account and personal data have been permanently deleted per Google Play Policy.');
    } catch {}
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
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      try {
        alert(`Accomplishment & invite link with referral code ${userReferralCode} copied to clipboard! 📋`);
      } catch {}
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

  // Daily Goal: Target of 5 completed activities providing visual cue for daily login bonus
  const dailyGoalTarget = 5;
  const dailyGoalCount = Math.min(dailyGoalTarget, totalActivitiesCompleted);
  const dailyGoalPercentage = Math.round((dailyGoalCount / dailyGoalTarget) * 100);
  const isDailyGoalMet = totalActivitiesCompleted >= dailyGoalTarget;

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
          <div className="flex flex-col w-full pb-28">
            {/* TOP STATUS BAR & CONTROLS */}
            <header className="px-4 pt-3 pb-2 flex items-center justify-between max-w-lg mx-auto w-full">
          {/* Brand Logo & Senior Mode */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-amber-400 text-white flex items-center justify-center text-xl shadow-md animate-float">
              {theme.mascot}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="font-black text-lg tracking-tight bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  JoyEarn
                </h1>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.2 rounded-full">
                  Global
                </span>
                {/* Offline Mode Status Badge in Header */}
                {isDeviceOffline && (
                  <button
                    onClick={() => {
                      soundService.playClick();
                      setActiveModal('offline');
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 text-[10px] font-black shadow-2xs tap-bounce animate-pulse"
                    title="Offline Mode: Device is offline. You can still access cached content."
                  >
                    <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Offline Mode</span>
                    <span className="text-[8.5px] opacity-75 hidden xs:inline">• Cached content accessible</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-500 font-medium">
                {isUrdu ? 'محفوظ • خاندانی • انعامات' : 'Safe • Family • Rewards'}
              </p>
            </div>
          </div>

          {/* Clean, Non-crowded Utility Actions */}
          <div className="flex items-center gap-2">
            {/* Daily Goal Circular Progress Ring (Visual Cue for Daily Login Bonus) */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('chest');
              }}
              className={`relative flex items-center gap-1.5 p-1 px-1.5 sm:px-2 rounded-2xl border transition-all tap-bounce ${
                isDailyGoalMet
                  ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-xs ring-2 ring-amber-400/50'
                  : 'bg-white/90 hover:bg-white border-gray-200 shadow-xs'
              }`}
              title={
                isDailyGoalMet
                  ? 'Daily Goal 5/5 Completed! Tap to claim your Daily Login Bonus'
                  : `Daily Goal: ${dailyGoalCount}/5 Activities Complete. Reach 5 for Daily Login Bonus (+100 JoyPoints)!`
              }
            >
              {/* Circular SVG Progress Ring */}
              <div className="relative w-8 h-8 flex items-center justify-center">
                <svg className="w-8 h-8 -rotate-90 transform" viewBox="0 0 36 36">
                  {/* Background Track Circle */}
                  <path
                    className="text-slate-100"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* Animated Progress Ring */}
                  <path
                    className={
                      isDailyGoalMet
                        ? 'text-amber-500'
                        : dailyGoalCount >= 3
                        ? 'text-emerald-500'
                        : 'text-rose-500'
                    }
                    strokeDasharray={`${dailyGoalPercentage}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>

                {/* Inner Icon / Text */}
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                  {isDailyGoalMet ? (
                    <span className="text-xs">🎁</span>
                  ) : (
                    <span className="text-[9.5px] font-black text-slate-800">
                      {dailyGoalCount}<span className="text-[7.5px] text-slate-400">/5</span>
                    </span>
                  )}
                </div>

                {/* Pulsing indicator when bonus is ready or goal met */}
                {(!claimedChestToday || isDailyGoalMet) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                )}
              </div>

              {/* Text Tag next to the ring */}
              <div className="text-left hidden xs:flex sm:flex flex-col pr-0.5 leading-tight">
                <span className="text-[8.5px] font-black uppercase text-amber-700">
                  {isDailyGoalMet ? 'Goal Won!' : 'Daily Goal'}
                </span>
                <span className="text-[9.5px] font-extrabold text-slate-700">
                  {dailyGoalCount}/5 <span className="text-[8px] text-emerald-600 font-bold">{isDailyGoalMet ? 'Claim 🎁' : '+Bonus'}</span>
                </span>
              </div>
            </button>

            {/* Notification Bell with Ping Badge */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('notifications');
              }}
              className="p-2.5 rounded-2xl bg-white/90 hover:bg-white border border-gray-200 text-xs tap-bounce shadow-xs relative text-slate-700"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-amber-500" />
              {(!claimedChestToday || uncompletedTasksCount > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white animate-ping" />
              )}
              {(!claimedChestToday || uncompletedTasksCount > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
              )}
            </button>

            {/* Camera & Video Studio Quick Button */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('camera');
              }}
              className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 border border-rose-200 text-xs tap-bounce shadow-xs relative text-rose-600 transition-colors"
              title="JoyEarn Camera Studio (Take Photo / Record Video 📸🎥)"
            >
              <Camera className="w-4 h-4 text-rose-500" />
            </button>


            {/* Central Settings Gear Button */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('settings');
              }}
              className="p-2.5 rounded-2xl bg-white/90 hover:bg-white border border-gray-200 text-slate-800 text-xs tap-bounce shadow-xs"
              title="Settings (Audio, Themes, Language, Immersive Mode, Cache)"
            >
              <Settings className="w-4 h-4 text-slate-700" />
            </button>

            {/* Exclusive Owner Panel Button (Visible ONLY to verified owner) */}
            {isOwnerLoggedIn && (
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowAdminModal(true);
                }}
                className="px-2.5 py-1.5 rounded-2xl bg-gradient-to-r from-purple-800 to-indigo-800 hover:brightness-110 text-white text-xs tap-bounce shadow-md flex items-center gap-1.5 border border-purple-400/40"
                title="Owner Panel (Full Control)"
              >
                <span className="text-xs">👑</span>
                <span className="font-black text-[10px] tracking-wide">Owner</span>
              </button>
            )}
          </div>
        </header>

        {/* =========================================================================
            SNAPCHAT-INSPIRED PREMIUM MINIMAL HOME DASHBOARD
           ========================================================================= */}

        {/* 1. HERO BALANCE CARD */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div
            className={`bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 rounded-3xl p-5 text-white shadow-lg space-y-3.5 relative overflow-hidden transition-all duration-300 ${
              pointsScaling ? 'scale-[1.02] ring-4 ring-pink-300/80 shadow-2xl' : 'scale-100'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-pink-100 font-extrabold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-pink-200" />
                  <span>{effectiveUrdu ? 'موجودہ بیلنس' : 'Available Balance'}</span>
                </span>
                <div className="text-3xl font-black mt-1 flex items-baseline gap-2">
                  <span>${(points / 1000).toFixed(2)}</span>
                  <span className="text-xs font-bold text-pink-100">USD</span>
                </div>
                <div className="text-xs text-pink-100 font-bold mt-0.5">
                  ⭐ {points.toLocaleString()} JoyPoints (1,000 Pts = $1.00 USD)
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-pink-200 block">
                  {effectiveUrdu ? 'آج حاصل کردہ' : "Today's Progress"}
                </span>
                <span className="text-sm font-black text-white">+{todayPoints} Pts</span>
              </div>
            </div>

            {/* Status indicator with $100 Minimum & Progress Bar */}
            <div className="pt-2 border-t border-white/20 space-y-1.5 text-xs text-pink-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px]">
                  {points >= 100000 ? (
                    <span className="text-emerald-300 font-extrabold">✓ {effectiveUrdu ? 'کیش آؤٹ کے لیے تیار ($100)' : 'Eligible for $100 Cash Out'}</span>
                  ) : (
                    <span>{effectiveUrdu ? `مزید $${((100000 - points) / 1000).toFixed(2)} درکار ہے` : `Need $${((100000 - points) / 1000).toFixed(2)} more to reach $100`}</span>
                  )}
                </span>

                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
                  $100 Min Withdrawal
                </span>
              </div>

              {/* Progress bar toward $100 */}
              <div className="w-full bg-black/25 h-2 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-amber-300 to-emerald-300 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(3, Math.round((points / 100000) * 100)))}%` }}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  soundService.playClick();
                  handleSelectTab('wallet');
                }}
                className="py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 tap-bounce shadow-sm"
              >
                <Wallet className="w-3.5 h-3.5 text-rose-600" />
                <span>{effectiveUrdu ? 'رقم نکلوائیں' : 'Withdraw Funds'}</span>
              </button>

              <button
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('chest');
                }}
                className="py-2.5 bg-white/20 hover:bg-white/30 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 tap-bounce border border-white/25"
              >
                <Gift className="w-3.5 h-3.5 text-amber-200" />
                <span>{effectiveUrdu ? 'روزانہ سینہ' : 'Daily Streak Chest'}</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. DAILY 5 MANDATORY TASKS CHECKLIST */}
        <DailyTasksCard
          completedTaskIds={completedDailyTaskIds}
          onTaskAction={(actionKey) => {
            if (actionKey === 'checkin') {
              markMandatoryTaskDone('daily_checkin');
              handleEarnPoints(50, 'Daily Check-in 📅');
            } else if (actionKey === 'learn') {
              handleSelectTab('learn');
            } else if (actionKey === 'watch') {
              handleSelectTab('watch');
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

        {/* 3. SNAPCHAT 4-CARD FEATURE GRID */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div className="flex items-center justify-between mb-2.5 px-0.5">
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">
              {effectiveUrdu ? 'اہم سرگرمیاں' : 'Core Activities'}
            </h2>
            <span className="text-[11px] font-bold text-pink-600">
              Verified & Safe
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: Watch & Learn */}
            <div
              onClick={() => {
                soundService.playClick();
                handleSelectTab('watch');
              }}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer tap-bounce flex flex-col justify-between group min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-pink-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🎬
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
                  +25 Pts
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  {effectiveUrdu ? 'ویڈیوز دیکھیں' : 'Watch Videos'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {effectiveUrdu ? 'محفوظ خاندانی ویڈیوز' : 'Family arts, DIY & science'}
                </p>
              </div>
            </div>

            {/* Card 2: Alphabet & Numbers */}
            <div
              onClick={() => {
                soundService.playClick();
                handleSelectTab('learn');
              }}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer tap-bounce flex flex-col justify-between group min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  📚
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                  A-Z & 1-100
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  {effectiveUrdu ? 'حروف اور گنتی' : 'Learn A–Z & 1–100'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {effectiveUrdu ? 'مکمل ۲۶ حروف اور ۱۰۰ نمبرز' : 'Complete 26 letters & numbers'}
                </p>
              </div>
            </div>

            {/* Card 3: Daily Quiz */}
            <div
              onClick={() => {
                soundService.playClick();
                handleSelectTab('learn');
              }}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer tap-bounce flex flex-col justify-between group min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🧠
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  +50 Pts
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  {effectiveUrdu ? 'روزانہ کوئز' : 'Daily Quiz'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {effectiveUrdu ? '۵ روزانہ تعلیمی سوالات' : '5 questions each day'}
                </p>
              </div>
            </div>

            {/* Card 4: Lucky Bonus Wheel */}
            <div
              onClick={() => {
                soundService.playClick();
                setActiveModal('wheel');
              }}
              className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-pink-300 transition-all cursor-pointer tap-bounce flex flex-col justify-between group min-h-[140px]"
            >
              <div className="flex items-start justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  🎡
                </div>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Free Spin
                </span>
              </div>
              <div className="mt-3">
                <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                  {effectiveUrdu ? 'لکی وہیل' : 'Lucky Wheel'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                  {effectiveUrdu ? 'روزانہ مفت بونس پوائنٹس' : 'Daily bonus points spin'}
                </p>
              </div>
            </div>
          </div>
        </section>

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
                handleSelectTab('watch');
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

        {/* 6. JOYEARN CAMERA & VIDEO MAKER STUDIO BANNER */}
        <section className="px-4 py-2 max-w-lg mx-auto w-full">
          <div
            onClick={() => {
              soundService.playClick();
              setActiveModal('camera');
            }}
            className="bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white rounded-3xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer tap-bounce border-2 border-pink-300 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 bg-pink-400 text-pink-950 font-black text-[9.5px] px-3 py-0.5 rounded-bl-2xl uppercase tracking-wider shadow-xs">
              📸 {effectiveUrdu ? 'کیمرہ اور ویڈیو' : 'Photo & Video Studio'}
            </div>

            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform">
                📷
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-white">
                    {effectiveUrdu ? 'کیمرہ اور ویڈیو اسٹوڈیو' : 'Camera & Video Studio'}
                  </h3>
                  <span className="text-[10px] font-black bg-white text-rose-600 px-2 py-0.2 rounded-full shadow-xs">
                    +50 / +100 Pts
                  </span>
                </div>
                <p className="text-xs text-rose-100 mt-0.5 line-clamp-1">
                  {effectiveUrdu
                    ? 'تصویر لیں، فلٹرز اور اسٹیکرز لگائیں، یا تعلیمی وی لاگ ویڈیو ریکارڈ کریں!'
                    : 'Snap photos with filters & stickers, or record up to 60s educational vlogs!'}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] font-black text-amber-200 group-hover:text-white transition-colors flex items-center gap-1">
                    <span>{effectiveUrdu ? 'ابھی کیمرہ کھولیں' : 'Open Camera & Studio'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[10px] text-white/80 font-bold">
                    • Photo &amp; Video Mode
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

        {/* DEDICATED WATCH VIDEOS PAGE */}
        {activeTab === 'watch' && (
          <WatchPage
            videos={videos}
            onEarnPoints={handleEarnPoints}
            onToggleOffline={handleToggleOffline}
            seniorMode={effectiveUrdu}
            watchedVideoIds={watchedVideoIds}
            onCompleteVideo={(videoId) => {
              setWatchedVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
              markMandatoryTaskDone('daily_video');
            }}
            onBackToHome={() => handleSelectTab('home')}
          />
        )}

        {/* DEDICATED VIDEOS & COMMUNITY VLOGS PAGE */}
        {activeTab === 'vlogs' && (
          <div className="pb-24">
            <VlogsSection
              isOpen={true}
              onClose={() => handleSelectTab('home')}
              currentUser={currentUser}
              seniorMode={effectiveUrdu}
              onOpenLiveCamera={() => setActiveModal('camera')}
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
                handleSelectTab('learn');
              } else if (actionKey === 'watch') {
                handleSelectTab('watch');
              } else if (actionKey === 'wheel') {
                setActiveModal('wheel');
              } else if (actionKey === 'chest') {
                setActiveModal('chest');
              }
            }}
            streakDays={streakDays}
            todayPoints={todayPoints}
            onBackToHome={() => handleSelectTab('home')}
            onOpenLiveCamera={() => setActiveModal('camera')}
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
              handleSelectTab('watch');
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
            onSpendPoints={(amt) => setPoints((p) => Math.max(0, p - amt))}
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
            onPurchaseItem={(cost) => setPoints((p) => Math.max(0, p - cost))}
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
            onOpenLiveCamera={() => setActiveModal('camera')}
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
          />
        )}

        {/* JoyEarn Camera & Video Maker Studio Modal */}
        {activeModal === 'camera' && (
          <CameraStudioModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
            onEarnPoints={handleEarnPoints}
            currentUser={currentUser}
            onSetProfilePhoto={(photoUrl) => {
              if (currentUser) {
                const updated = { ...currentUser, photoURL: photoUrl };
                setCurrentUser(updated);
                try {
                  localStorage.setItem('joyearn_app_user', JSON.stringify(updated));
                } catch {}
              }
            }}
            onPublishVlog={async (vlog) => {
              handleEarnPoints(100, `Published Video: ${vlog.title} 🎬`);
              if (currentUser) {
                try {
                  await submitVlog({
                    uid: currentUser.uid,
                    creatorName: currentUser.displayName || 'Community Creator',
                    title: vlog.title,
                    description: `Recorded live with JoyEarn Camera Studio • Duration: ${vlog.duration}`,
                    category: (vlog.category as any) || 'funny and wholesome',
                    videoType: 'recorded',
                    videoBlob: vlog.videoBlob,
                    videoUrl: vlog.videoUrl,
                    duration: vlog.duration,
                    isShort: true,
                  });
                } catch (e) {
                  console.warn('Could not auto-submit recorded vlog:', e);
                }
              }
            }}
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

      {/* FIXED ANDROID MATERIAL 3 BOTTOM NAVIGATION BAR (Anchored directly to viewport bottom across all 5 pages) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto">
          <AndroidBottomNav
            activeTab={activeTab}
            onSelectTab={(tab) => handleSelectTab(tab as NavTab)}
            seniorMode={effectiveUrdu}
            uncompletedTasksCount={uncompletedTasksCount}
          />
        </div>
      </div>

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

      {/* Policy-Safe Interstitial on Returning to Home from Features */}
      <AdMobInterstitialModal
        isOpen={showFeatureExitInterstitial}
        onClose={() => setShowFeatureExitInterstitial(false)}
        seniorMode={effectiveUrdu}
      />

      {/* Lightweight Canvas Confetti Effect */}
      <ConfettiEffect
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
