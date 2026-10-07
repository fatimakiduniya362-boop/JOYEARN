import { darkModeService } from './services/darkModeService';
import { FirstTimeTutorialOverlay } from './components/FirstTimeTutorialOverlay';
import { AdMobBanner } from './components/AdMobBanner';
import { PromotedOffersSection } from './components/PromotedOffersSection';
import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Wallet,
  Play,
  BookOpen,
  Gamepad2,
  CheckSquare,
  Users,
  Download,
  TrendingUp,
  Package,
  Baby,
  Flower2,
  Gift,
  Settings,
  ShieldCheck,
  ChevronRight,
  Sun,
  Flame,
  Volume2,
  Heart,
  Eye,
  Info,
  Search,
  X,
  Filter,
  Bell,
  Smartphone,
  Globe,
  Languages,
  Share2,
  WifiOff
} from 'lucide-react';

import { ThemeKey, VideoContent, QuizItem, SponsoredTask, WithdrawalRequest, TransactionRecord, ReferralUser } from './types';
import { THEMES, INITIAL_VIDEOS, INITIAL_QUIZZES, INITIAL_TASKS, INITIAL_TRANSACTIONS, INITIAL_REFERRALS } from './data/mockData';
import { getTodayUnlockedVideos, getTodayDayIndex } from './utils/dailyRotation';
import { ALL_QUIZZES } from './data/quizDatabase';
import { DailyTasksCard } from './components/DailyTasksCard';
import { MandatoryTaskId } from './utils/dailyTasksConfig';
import { isDailyQuizCompletedToday } from './services/dailyQuizService';

// Modals & Android Components
import { MiniGames } from './components/MiniGames';
import { KidsZone } from './components/KidsZone';
import { VirtualGarden } from './components/VirtualGarden';
import { WalletModal, DAILY_MAX_POINTS } from './components/WalletModal';
import { WatchModal } from './components/WatchModal';
import { VideoThumbnail } from './components/VideoThumbnail';
import { LearnModal } from './components/LearnModal';
import { TasksModal } from './components/TasksModal';
import { InviteModal } from './components/InviteModal';
import { OfflineModal } from './components/OfflineModal';
import { DailyChestModal } from './components/DailyChestModal';
import { ThemeSelectorModal } from './components/ThemeSelectorModal';
import { NotificationManager } from './components/NotificationManager';
import { AchievementsSection } from './components/AchievementsSection';
import { AndroidBottomNav } from './components/AndroidBottomNav';
import { usePWAInstall } from './hooks/usePWAInstall';
import { AppUser } from './types';
import { LuckyWheelModal } from './components/LuckyWheelModal';
import { GoogleAuthModal } from './components/GoogleAuthModal';
import { TopEarnersSection } from './components/TopEarnersSection';
import { SettingsModal } from './components/SettingsModal';
import { PrivacyPolicyModal } from './components/PrivacyPolicyModal';
import { AppRateModal } from './components/AppRateModal';
import { FirstOpenAuthScreen } from './components/FirstOpenAuthScreen';
import { ConfettiEffect } from './components/ConfettiEffect';
import { ActivityGoals } from './components/ActivityGoals';
import { PersonalDashboardModal } from './components/PersonalDashboardModal';
import { StreakLeaderboardModal } from './components/StreakLeaderboardModal';
import { AdminWithdrawalModal, ADMIN_EMAIL } from './components/AdminWithdrawalModal';
import { RotatingSponsorAdCard } from './components/SponsorAdCard';
import { syncUserDataToCloud, loadUserDataFromCloud, deleteUserDataFromFirestore, recordTaskCompletionInFirestore } from './services/firestoreService';
import { LiveStreamModal } from './components/LiveStreamModal';
import { CommunityChatModal } from './components/CommunityChatModal';
import { ShopMarketModal } from './components/ShopMarketModal';
import { CreatorAgencyModal } from './components/CreatorAgencyModal';
import { VlogShortsModal } from './components/VlogShortsModal';
import { useImmersiveMode } from './hooks/useImmersiveMode';
import { soundService } from './services/soundService';
import { hapticService } from './services/haptics';
import { crashlytics } from './services/crashlytics';
import { initAuth, logout, deleteCurrentAuthUser } from './services/googleAuth';

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

  // User state
  const [userName, setUserName] = useState(() => localStorage.getItem('joyearn_userName') || 'Learner');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('joyearn_app_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [points, setPoints] = useState(1450); // initial JoyPoints balance
  const [totalJoyPointsEarned, setTotalJoyPointsEarned] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_lifetime_points');
      return saved ? Math.max(parseInt(saved, 10), 1450) : 1450;
    } catch {
      return 1450;
    }
  });
  const [todayPoints, setTodayPoints] = useState(185);
  const [streakDays, setStreakDays] = useState(4);
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

    const unsubscribe = initAuth(
      (user) => {
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
            if (typeof cloud.points === 'number') setPoints(cloud.points);
            if (typeof cloud.streakDays === 'number') setStreakDays(cloud.streakDays);
            if (cloud.lastActiveDate === todayStr && typeof cloud.todayPoints === 'number') {
              setTodayPoints(cloud.todayPoints);
            }
          } else {
            // Initial sync to Firestore
            syncUserDataToCloud(user.uid, {
              points,
              streakDays,
              todayPoints,
              email: user.email,
              displayName: user.displayName,
              lastActiveDate: todayStr,
            });
          }
        });
      },
      () => {
        setCurrentUser(null);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
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

  // Active modal
  const [activeModal, setActiveModal] = useState<
    | null
    | 'watch'
    | 'learn'
    | 'play'
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
  >(null);

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
    setSearchQuery('');
    setShowRecentsSheet(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Add Points handler with Anti-Cheat Daily Max Limit
  const handleEarnPoints = (earnedPoints: number, reason: string) => {
    // Check anti-cheat daily points ceiling
    if (todayPoints >= DAILY_MAX_POINTS) {
      soundService.playClick();
      alert(`Daily maximum points limit reached (${DAILY_MAX_POINTS.toLocaleString()} Pts). Anti-cheat protection active: please return tomorrow to keep earning!`);
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
      alert('You have already claimed your daily bonus today! Return tomorrow for the next bonus.');
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
    alert('Your account and personal data have been permanently deleted per Google Play Policy.');
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
      alert(`Accomplishment & invite link with referral code ${userReferralCode} copied to clipboard! 📋`);
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

  // Trigger Confetti effect when user hits daily goal of 5 completed activities
  const prevActivitiesCountRef = useRef(totalActivitiesCompleted);
  useEffect(() => {
    if (prevActivitiesCountRef.current < 5 && totalActivitiesCompleted >= 5) {
      soundService.playDailyGoalCheer();
      soundService.playStreakFlame();
      setShowConfetti(true);
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
      keywords: ['invite', 'earn', 'referral', 'friend', 'bonus', 'share', 'code', 'whatsapp', 'sms', 'دعوت', 'دوست'],
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

  // MANDATORY AUTH GATE: User must sign in or continue with Google to open this app interface
  if (!currentUser) {
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
      className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : `bg-gradient-to-br ${theme.gradient} text-slate-800`} transition-colors duration-500 pb-8 flex flex-col items-center justify-start`}
    >
      {/* Centered Mobile Shell with optional Android Phone Chassis Frame */}
      <div
        className={`w-full max-w-md min-h-screen flex flex-col shadow-2xl relative ${isDarkMode ? 'bg-slate-900/90 text-slate-100' : 'bg-white/40 text-slate-800'} backdrop-blur-xs transition-all duration-300 ${
          androidFrameMode
            ? 'border-[12px] border-slate-950 rounded-[48px] overflow-hidden my-4 ring-8 ring-slate-800/30 shadow-2xl'
            : 'border-x border-white/40'
        }`}
      >
        {/* TOP STATUS BAR & CONTROLS */}
        <header className="p-4 pb-2 flex items-center justify-between">
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

            {/* Google Profile / Sign-in Pill */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('auth');
              }}
              className={`p-1.5 px-3 rounded-2xl text-xs font-black transition-all tap-bounce flex items-center gap-1.5 shadow-xs border ${
                currentUser
                  ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-800'
                  : 'bg-white/95 hover:bg-white border-gray-200 text-gray-700'
              }`}
              title={
                currentUser
                  ? `Logged in: ${currentUser.displayName || currentUser.email}`
                  : 'Sign in with Google'
              }
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-4 h-4 rounded-full border border-rose-400 object-cover"
                  onError={(e) => { (e.currentTarget as HTMLElement).style.display = "none"; }}
                />
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span className="text-[11px] font-black max-w-[70px] truncate">
                {currentUser ? (currentUser.displayName?.split(' ')[0] || 'User') : (effectiveUrdu ? 'لاگ ان' : 'Google')}
              </span>
              {currentUser?.confirmationEmailSent && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Email receipt confirmed" />
              )}
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
          </div>
        </header>

        {/* CUTE AMBIENT DECORATIONS */}
        <div className="px-4 py-1 flex items-center justify-between text-xs text-gray-500 select-none overflow-hidden">
          <div className="flex items-center gap-2 text-sm animate-pulse-subtle">
            <span>🌳</span>
            <span>🌸</span>
            <span>🦋</span>
            <span>🐰</span>
            <span>🌈</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>⭐</span>
            <span>🎈</span>
            <span>🏡</span>
            <span>🚗</span>
            <span>🐼</span>
          </div>
        </div>

        {/* DAILY TASKS CARD: Top of Home with exactly 5 mandatory tasks resetting at midnight */}
        <DailyTasksCard
          completedTaskIds={completedDailyTaskIds}
          onTaskAction={(actionKey) => {
            if (actionKey === 'checkin') {
              markMandatoryTaskDone('daily_checkin');
              handleEarnPoints(50, 'Daily Check-in 📅');
            } else if (actionKey === 'learn') {
              setActiveModal('learn');
            } else if (actionKey === 'watch') {
              setActiveModal('watch');
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

        {/* DIRECT SPONSOR ADS ON HOME (Clearly labelled "Sponsored", rotating, zero points) */}
        <section className="px-4 py-1">
          <RotatingSponsorAdCard variant="card" />
        </section>

        {/* USER GREETING & FRIENDLY MASCOT BANNER */}
        <section className="px-4 py-2">
          <div className="bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-emerald-500/10 border border-white/80 backdrop-blur-md rounded-2xl p-3 flex items-center gap-3 shadow-xs">
            <div className="text-3xl animate-bounce-subtle shrink-0">
              {theme.mascot}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-gray-900 ${seniorMode ? 'text-lg' : 'text-sm'}`}>
                  {isUrdu ? `خوش آمدید، ${userName}! 👋` : `Welcome back, ${userName}! 👋`}
                </span>
              </div>
              <p className={`text-xs text-gray-600 line-clamp-1 font-medium mt-0.5 ${seniorMode ? 'text-sm' : ''}`}>
                {mascotQuote}
              </p>
            </div>
            {/* User Dashboard Trigger */}
            <button
              onClick={() => {
                soundService.playClick();
                setActiveModal('dashboard');
              }}
              className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl shadow-sm tap-bounce flex flex-col items-center shrink-0 hover:brightness-110"
              title="Open User Activity & Earnings Dashboard"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase">
                {isUrdu ? 'ڈیش بورڈ' : 'Dashboard'}
              </span>
            </button>

            {/* Daily Chest & Streak Days Display with Fire Animation */}
            <button
              onClick={() => setActiveModal('chest')}
              className={`p-2 rounded-xl shadow-sm tap-bounce flex flex-col items-center shrink-0 relative transition-all duration-500 ${
                quizStreakFireAnim
                  ? 'bg-gradient-to-tr from-red-600 via-orange-500 to-amber-400 text-white shadow-xl shadow-orange-500/50 scale-110 ring-4 ring-amber-300 animate-pulse'
                  : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white'
              }`}
              title="Open Daily Reward Chest"
            >
              {quizStreakFireAnim ? (
                <Flame className="w-4 h-4 text-amber-200 fill-amber-300 animate-bounce" />
              ) : (
                <Gift className="w-4 h-4 animate-bounce" />
              )}
              <span className="text-[9px] font-black uppercase flex items-center gap-0.5">
                {quizStreakFireAnim && <span>🔥</span>}
                <span>{isUrdu ? `دن ${streakDays}` : `Day ${streakDays}`}</span>
              </span>
              {quizStreakFireAnim && (
                <>
                  <span className="absolute -top-1 -right-1 text-xs animate-spin-slow">✨</span>
                  <span className="absolute -bottom-1 -left-1 text-xs animate-bounce">🔥</span>
                </>
              )}
            </button>

            {/* Lucky Wheel Quick Trigger */}
            <button
              onClick={() => setActiveModal('wheel')}
              className={`p-2 bg-gradient-to-r ${
                hasSpunWheelToday
                  ? 'from-slate-400 to-slate-500 opacity-90'
                  : 'from-violet-500 via-fuchsia-500 to-pink-500 animate-pulse-subtle'
              } text-white rounded-xl shadow-sm tap-bounce flex flex-col items-center shrink-0`}
              title="Spin Lucky Wheel for Daily Bonus Points"
            >
              <span className="text-base leading-none">🎡</span>
              <span className="text-[9px] font-black uppercase mt-0.5">
                {hasSpunWheelToday ? (effectiveUrdu ? 'مکمل' : 'Done') : (effectiveUrdu ? 'اسپن' : 'Spin')}
              </span>
            </button>
          </div>
        </section>

        {/* ACTIVITY GOALS COMPONENT: 5-ACTIVITY PROGRESS RING & CLAIM REWARD INTERACTION */}
        <section className="px-4 py-1.5">
          <ActivityGoals
            completedActivitiesCount={totalActivitiesCompleted}
            target={5}
            quizCompleted={completedQuizzesCount > 0}
            videoWatched={watchedVideosCount > 0}
            wheelSpun={hasSpunWheelToday}
            chestClaimed={claimedChestToday}
            taskCompleted={activeReferralsCount > 0}
            onOpenQuiz={() => setActiveModal('learn')}
            onOpenVideos={() => setActiveModal('watch')}
            onOpenWheel={() => setActiveModal('wheel')}
            onOpenChest={() => setActiveModal('chest')}
            onOpenTasks={() => setActiveModal('tasks')}
            onClaimGoalReward={(bonusPoints) => {
              handleEarnPoints(bonusPoints, '5/5 Daily Activity Goal Completed 🎯');
              handleTriggerConfetti();
            }}
            seniorMode={effectiveUrdu}
            currentPoints={points}
          />
        </section>

        {/* REWARD BALANCE DISPLAY CARD */}
        <section className="px-4 py-2">
          <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 rounded-3xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden">
            {/* Background shimmer visual */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-amber-100 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
                  {isUrdu ? 'موجودہ جوائے پوائنٹس بیلنس' : 'Available JoyPoints'}
                </span>
                <div className="text-3xl font-black mt-1 flex items-baseline gap-1.5">
                  <span>⭐ {points.toLocaleString()}</span>
                  <span className="text-xs font-semibold text-amber-200">JoyPoints</span>
                </div>
                {/* Clear Policy Disclaimer Tag */}
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-black text-amber-950 bg-amber-200/90 px-2 py-0.5 rounded-lg shadow-2xs">
                    Ad-Funded Rewards
                  </span>
                  <span className="text-[10px] text-amber-100 font-medium opacity-90">
                    Redeem for Payouts in Wallet
                  </span>
                </div>
              </div>

              {/* Status pill */}
              <div
                onClick={() => setActiveModal('wallet')}
                className="bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-2xl cursor-pointer backdrop-blur-md tap-bounce text-right"
              >
                <span className="text-[10px] text-amber-100 block font-semibold">
                  {isUrdu ? 'پوائنٹ سسٹم' : 'Reward Currency'}
                </span>
                <span className="text-xs font-black text-white">Redeemable</span>
              </div>
            </div>

            {/* Today's Tracker & Conversion Note */}
            <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs text-amber-100">
              <div>
                <span className="opacity-80">{isUrdu ? 'آج حاصل کردہ: ' : "Today's Progress: "}</span>
                <strong className="text-white font-extrabold">+{todayPoints} JoyPoints</strong>
              </div>
              <div className="text-[10px] opacity-90 bg-black/20 px-2.5 py-0.5 rounded-full font-bold">
                1,000 Pts = $1.00 USD
              </div>
            </div>

            {/* Quick Actions: Personal Dashboard, Streak Board, Wallet Store, Garden */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('dashboard');
                }}
                className="flex-1 py-2.5 bg-white text-emerald-950 font-black rounded-xl shadow text-xs flex items-center justify-center gap-1.5 tap-bounce hover:bg-emerald-50"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isUrdu ? 'ڈیش بورڈ' : "Dashboard"}</span>
              </button>
              <button
                onClick={() => {
                  soundService.playClick();
                  setShowStreakLeaderboard(true);
                }}
                className={`py-2.5 px-3 border rounded-xl text-xs flex items-center gap-1 tap-bounce transition-all ${
                  quizStreakFireAnim
                    ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white border-amber-300 font-black shadow-lg shadow-orange-500/40 animate-pulse scale-105'
                    : 'bg-white/20 hover:bg-white/30 border-white/30 text-white font-extrabold'
                }`}
                title="Global Streak Leaderboard"
              >
                <span className={quizStreakFireAnim ? 'animate-bounce text-sm' : ''}>🔥</span>
                <span>{isUrdu ? 'اسٹریک بورڈ' : 'Streak Board'}</span>
              </button>
              <button
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('wallet');
                }}
                className="py-2.5 px-3 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 tap-bounce"
                title="Open Perks Store & In-App Shop"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'والیٹ' : 'Wallet'}</span>
              </button>
              <button
                onClick={() => {
                  soundService.playClick();
                  setActiveModal('garden');
                }}
                className="py-2.5 px-2.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 tap-bounce"
                title="Visit Your Virtual Garden"
              >
                <Flower2 className="w-3.5 h-3.5" />
                <span>{isUrdu ? 'باغ' : 'Garden'}</span>
              </button>
            </div>
          </div>
        </section>



        {/* LARGE "START EARNING" QUICK-START HERO BUTTON */}
        <section className="px-4 py-2">
          <button
            onClick={() => setActiveModal('watch')}
            className="w-full py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white rounded-3xl font-black text-base shadow-lg shadow-pink-500/25 flex items-center justify-between px-6 tap-bounce hover:brightness-105"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
                🚀
              </div>
              <div className="text-left">
                <span className="block text-xs uppercase tracking-widest text-pink-100 font-bold">
                  {isUrdu ? 'ویڈیوز • تعلیم • کھیلیں' : 'Watch • Learn • Play'}
                </span>
                <span className={seniorMode ? 'text-xl' : 'text-lg'}>
                  {isUrdu ? 'سیکھنا اور پوائنٹس حاصل کریں' : 'PLAY & EARN POINTS'}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center">
              <ChevronRight className="w-5 h-5 stroke-[3]" />
            </div>
          </button>
        </section>

        {/* SEARCH BAR & CATEGORY QUICK FILTERS */}
        <section className="px-4 py-2 space-y-2.5">
          {/* Main Search Input */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-gray-400">
              <Search className="w-4 h-4 text-pink-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isUrdu
                  ? 'سرگرمیاں، ٹاسک، کوئز، یا ویڈیوز تلاش کریں...'
                  : 'Search activities, tasks, quizzes, games...'
              }
              className={`w-full pl-10 pr-9 py-3 bg-white/90 border-2 border-pink-200/90 rounded-2xl shadow-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-200 transition-all ${
                seniorMode ? 'text-base font-semibold' : 'text-xs font-medium'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 tap-bounce"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {CATEGORY_TABS.map((tab) => {
              const isSelected = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 tap-bounce ${
                    isSelected
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm scale-105'
                      : 'bg-white/80 hover:bg-white text-gray-600 border border-gray-200'
                  }`}
                >
                  <span>{tab.emoji}</span>
                  <span>{isUrdu && tab.urduLabel ? tab.urduLabel : tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Search Query Feedback & Clear Helper */}
          {(searchQuery || selectedCategory !== 'All') && (
            <div className="flex items-center justify-between text-xs px-1 text-gray-600">
              <span>
                {isUrdu ? (
                  <>کل <strong>{filteredCards.length}</strong> آئٹمز ملے {searchQuery && <>برائے "<span className="text-pink-600 font-bold">{searchQuery}</span>"</>}</>
                ) : (
                  <>Found <strong>{filteredCards.length}</strong> {filteredCards.length === 1 ? 'module' : 'modules'} {searchQuery && <> for "<span className="text-pink-600 font-bold">{searchQuery}</span>"</>}</>
                )}
                {selectedCategory !== 'All' && <> in <strong>{selectedCategory}</strong></>}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="text-[11px] font-bold text-pink-600 hover:text-pink-800 underline"
              >
                {isUrdu ? 'تمام بحال کریں' : 'Reset All'}
              </button>
            </div>
          )}

          {/* Direct Hit Task Match Suggestion */}
          {directMatchingTasks.length > 0 && (
            <div
              onClick={() => setActiveModal('tasks')}
              className="p-2.5 bg-amber-50 border border-amber-300 rounded-2xl cursor-pointer hover:bg-amber-100/80 transition-all text-xs text-amber-950 flex items-center justify-between tap-bounce"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="text-base">📝</span>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">
                    Direct Task Match
                  </span>
                  <p className="font-bold truncate text-xs">{directMatchingTasks[0].title}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-black text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-200">
                +{directMatchingTasks[0].points} Pts →
              </span>
            </div>
          )}

          {/* Direct Hit Video Match Suggestion */}
          {directMatchingVideos.length > 0 && (
            <div
              onClick={() => setActiveModal('watch')}
              className="p-2.5 bg-rose-50 border border-rose-300 rounded-2xl cursor-pointer hover:bg-rose-100/80 transition-all text-xs text-rose-950 flex items-center justify-between tap-bounce"
            >
              <div className="flex items-center gap-2 truncate">
                <div className="w-16 shrink-0 rounded-lg overflow-hidden shadow-2xs">
                  <VideoThumbnail
                    videoUrl={directMatchingVideos[0].videoUrl}
                    title={directMatchingVideos[0].title}
                  />
                </div>
                <div className="truncate">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800 block">
                    Direct Video Match
                  </span>
                  <p className="font-bold truncate text-xs">{directMatchingVideos[0].title}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-black text-rose-700 bg-white px-2 py-0.5 rounded-full border border-rose-200">
                +{directMatchingVideos[0].points} Pts →
              </span>
            </div>
          )}
        </section>

        {/* 2-COLUMN ANIMATED ACTIVITY CARDS GRID */}
        <section className="px-4 py-2 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className={`font-black text-gray-900 ${seniorMode ? 'text-xl' : 'text-sm'}`}>
              {seniorMode ? 'تمام سرگرمیاں (Activities)' : 'Available Activities'}
            </h2>
            <span className="text-[11px] font-semibold text-gray-500">
              {filteredCards.length} of {ACTIVITY_CARDS.length} Modules
            </span>
          </div>

          {filteredCards.length === 0 ? (
            /* Empty State when Search has no matches */
            <div className="bg-white/90 border-2 border-dashed border-pink-200 rounded-3xl p-6 text-center space-y-3 my-2">
              <span className="text-5xl block animate-bounce-subtle">🔎🐰</span>
              <h3 className="font-bold text-gray-800 text-sm">
                No activities match "{searchQuery}"
              </h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Try searching for words like <span className="font-semibold text-pink-600">"quiz"</span>, <span className="font-semibold text-pink-600">"game"</span>, <span className="font-semibold text-pink-600">"video"</span>, <span className="font-semibold text-pink-600">"perks"</span>, or <span className="font-semibold text-pink-600">"fun"</span>.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 bg-pink-500 text-white rounded-xl text-xs font-bold tap-bounce hover:bg-pink-600 shadow-sm"
              >
                Clear Search & Show All
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredCards.map((card) => {
                return (
                  <div
                    key={card.id}
                    onClick={() => setActiveModal(card.id)}
                    className={`bg-white/95 rounded-3xl p-3.5 border-2 ${card.border} shadow-sm hover:shadow-md transition-all cursor-pointer tap-bounce flex flex-col justify-between relative overflow-hidden group`}
                  >
                    {/* Top Row: Emoji, Badge & Share Button */}
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                        {card.emoji}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {card.badge}
                        </span>
                        <button
                          onClick={(e) => handleShareCard(e, card)}
                          title="Share activity with friends"
                          className="p-1 rounded-full bg-slate-100 hover:bg-pink-100 text-slate-500 hover:text-pink-600 transition-colors tap-bounce"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mt-3">
                      <h3 className={`font-black text-gray-900 ${seniorMode ? 'text-lg' : 'text-sm'}`}>
                        {seniorMode && card.urduTitle ? card.urduTitle : card.title}
                      </h3>
                      <p className={`text-[11px] text-gray-500 line-clamp-1 mt-0.5 ${seniorMode ? 'text-xs' : ''}`}>
                        {card.subtitle}
                      </p>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="mt-3 pt-2 border-t border-gray-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-gray-600 truncate mr-1 flex items-center gap-1">
                          {card.isComplete ? (
                            <span className="text-emerald-600 font-black">✓</span>
                          ) : null}
                          <span>
                            {seniorMode && card.progressUrdu ? card.progressUrdu : card.progressText}
                          </span>
                        </span>
                        <span
                          className={`font-black shrink-0 ${
                            card.progressPct >= 100 ? 'text-emerald-600' : 'text-pink-600'
                          }`}
                        >
                          {card.progressPct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            card.progressPct >= 100
                              ? 'bg-emerald-500 shadow-sm'
                              : 'bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(card.progressPct, 4))}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom indicator with Share button */}
                    <div className="mt-2.5 pt-1.5 border-t border-gray-100/60 flex items-center justify-between text-[11px] font-bold text-gray-400">
                      <button
                        onClick={(e) => handleShareCard(e, card)}
                        className="flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:text-pink-700 bg-pink-50 hover:bg-pink-100 px-2 py-0.5 rounded-full transition-colors tap-bounce"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>{seniorMode ? 'شیئر کریں' : 'Share'}</span>
                      </button>
                      <div className="flex items-center gap-0.5 group-hover:text-pink-600 transition-colors">
                        <span>{seniorMode ? 'کھولیں' : 'Open'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* TOP 10 EARNERS LEADERBOARD SECTION */}
        <TopEarnersSection
          currentPoints={points}
          userName={userName}
          streakDays={streakDays}
          seniorMode={effectiveUrdu}
          onOpenActivity={(id) => setActiveModal(id as any)}
        />

        {/* ACHIEVEMENTS & BADGES SECTION */}
        <AchievementsSection
          completedTasksCount={completedTasksCount}
          completedQuizzesCount={completedQuizzesCount}
          watchedVideosCount={watchedVideosCount}
          activeReferralsCount={activeReferralsCount}
          streakDays={streakDays}
          gamesCompletedCount={gamesCompletedCount}
          seniorMode={effectiveUrdu}
          userName={userName}
          totalPoints={points}
        />

        {/* MORE APPS AND OFFERS (SPONSORED PROMOTIONS) */}
        <PromotedOffersSection
          seniorMode={effectiveUrdu}
        />

        {/* GOOGLE ADMOB BANNER (HOME SCREEN) */}
        <AdMobBanner
          seniorMode={effectiveUrdu}
        />

        {/* HONESTY, POLICY & TRANSPARENCY FOOTER BANNER */}
        <footer className="p-4 pt-2 space-y-2">
          <div className="bg-white/80 border border-gray-200/80 rounded-2xl p-3 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-gray-700">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{effectiveUrdu ? 'خاندانی تحفظ اور گوگل پلے تعمیل' : 'Family Safety & Google Play Compliance Guarantee'}</span>
            </div>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              {effectiveUrdu
                ? 'JoyEarn تعلیمی حوصلہ افزائی کے لیے ورچوئل پوائنٹس کا استعمال کرتا ہے۔ کوئی نقد رقم یا فرضی آمدنی کا وعدہ نہیں۔ 100% گوگل پلے پالیسی کے مطابق۔'
                : 'JoyEarn operates exclusively with virtual in-app JoyPoints for educational motivation and cosmetic in-app perks. 100% compliant with Google Play Families and Deceptive Behavior Policies.'}
            </p>
          </div>

          {/* Quick Legal & Settings Links */}
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

        {/* POLICY-COMPLIANT GOOGLE ADMOB FAMILY BANNER */}
        {!hasAdFree && (
          <div className="bg-slate-100 border-t border-slate-200/90 py-1.5 px-3 flex items-center justify-between text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5 font-bold text-slate-600">
              <span className="bg-slate-300 text-slate-700 px-1 py-0.2 rounded text-[9px] uppercase font-black">
                Ad
              </span>
              <span>Google AdMob • Family-Safe Learning Partner</span>
            </div>
            <button
              onClick={() => setActiveModal('wallet')}
              className="text-blue-600 font-extrabold hover:underline tap-bounce"
            >
              Remove Ads ($1.99)
            </button>
          </div>
        )}

        {/* ANDROID MATERIAL 3 BOTTOM NAVIGATION BAR & 3-BUTTON SYSTEM BAR */}
        <div className="sticky bottom-0 z-30 shadow-2xl">
          <AndroidBottomNav
            activeTab={
              activeModal === 'watch'
                ? 'watch'
                : activeModal === 'learn'
                ? 'learn'
                : activeModal === 'tasks'
                ? 'tasks'
                : activeModal === 'wallet'
                ? 'wallet'
                : 'home'
            }
            onSelectTab={(tab) => {
              if (tab === 'home') {
                setActiveModal(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } else if (tab === 'watch') {
                setActiveModal('watch');
              } else if (tab === 'learn') {
                setActiveModal('learn');
              } else if (tab === 'tasks') {
                setActiveModal('tasks');
              } else if (tab === 'wallet') {
                setActiveModal('wallet');
              }
            }}
            seniorMode={effectiveUrdu}
            uncompletedTasksCount={uncompletedTasksCount}
          />
        </div>

        {/* ACTIVE MODAL POPUPS */}
        {activeModal === 'watch' && (
          <WatchModal
            videos={videos}
            onEarnPoints={handleEarnPoints}
            onToggleOffline={handleToggleOffline}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
            watchedVideoIds={watchedVideoIds}
            onCompleteVideo={(videoId) => {
              setWatchedVideoIds((prev) => (prev.includes(videoId) ? prev : [...prev, videoId]));
              markMandatoryTaskDone('daily_video');
            }}
          />
        )}

        {activeModal === 'learn' && (
          <LearnModal
            quizzes={quizzes}
            onEarnPoints={handleEarnPoints}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
            completedQuizIds={completedQuizIds}
            onCompleteQuiz={(quizId) => {
              setCompletedQuizIds((prev) => (prev.includes(quizId) ? prev : [...prev, quizId]));
              if (isDailyQuizCompletedToday()) {
                markMandatoryTaskDone('daily_quiz');
              }
            }}
            streakDays={streakDays}
            onDailyQuizCompleted={() => {
              setQuizStreakFireAnim(true);
              soundService.playStreakFlame();
              soundService.playFanfare();
              hapticService.heavy();
              markMandatoryTaskDone('daily_quiz');
              setTimeout(() => setQuizStreakFireAnim(false), 8500);
            }}
          />
        )}

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

        {activeModal === 'tasks' && (
          <TasksModal
            tasks={tasks}
            onCompleteTask={handleCompleteTask}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {activeModal === 'invite' && (
          <InviteModal
            referrals={referrals}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
          />
        )}

        {activeModal === 'wallet' && (
          <WalletModal
            points={points}
            todayPoints={todayPoints}
            transactions={transactions}
            onRedeemPerk={handleRedeemPerk}
            onEarnPoints={handleEarnPoints}
            onDeductPoints={handleDeductPoints}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
            hasAdFree={hasAdFree}
            currentUser={currentUser}
            onOpenAdminPortal={() => setShowAdminModal(true)}
            onBuyAdFree={() => {
              setHasAdFree(true);
              localStorage.setItem('joyearn_has_ad_free', 'true');
            }}
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
          <KidsZone onClose={() => setActiveModal(null)} seniorMode={effectiveUrdu} />
        )}

        {activeModal === 'garden' && (
          <VirtualGarden onClose={() => setActiveModal(null)} seniorMode={effectiveUrdu} />
        )}

        {activeModal === 'chest' && (
          <DailyChestModal
            streak={streakDays}
            claimedToday={claimedChestToday}
            onClaimDaily={handleClaimChest}
            onClose={() => setActiveModal(null)}
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
            onClose={() => setActiveModal(null)}
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
            onOpenLearn={() => setActiveModal('learn')}
            onOpenWatch={() => setActiveModal('watch')}
            onOpenSpin={() => setActiveModal('wheel')}
            onOpenScratch={() => setActiveModal('play')}
            onOpenWallet={() => setActiveModal('wallet')}
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
            onClose={() => setActiveModal(null)}
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

        {/* Educational Vlogs & Shorts Modal */}
        {activeModal === 'vlogs' && (
          <VlogShortsModal
            isOpen={true}
            onClose={() => setActiveModal(null)}
            seniorMode={effectiveUrdu}
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
          onOpenTasks={() => setActiveModal('tasks')}
          onOpenLearn={() => setActiveModal('learn')}
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

      {/* Standalone Streak Leaderboard Modal */}
      <StreakLeaderboardModal
        isOpen={showStreakLeaderboard}
        onClose={() => setShowStreakLeaderboard(false)}
        userStreak={streakDays}
        userName={userName}
        userPoints={points}
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

      {/* Lightweight Canvas Confetti Effect */}
      <ConfettiEffect
        trigger={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />
    </div>
  );
}
