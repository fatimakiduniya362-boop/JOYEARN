import React, { useState, useMemo, useRef } from 'react';
import {
  CheckCircle2,
  Play,
  RotateCw,
  Gift,
  ShieldCheck,
  Sparkles,
  Users,
  Compass,
  Search,
  Bell,
  User,
  ChevronRight,
  ClipboardCheck,
  Share2,
  X,
  Star,
} from 'lucide-react';
import { AppUser, SponsoredTask } from '../types';
import { MandatoryTaskId } from '../utils/dailyTasksConfig';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { getScheduledDailyTask, getScheduleDayNumber } from '../services/contentScheduleService';

interface TasksPageProps {
  tasks: SponsoredTask[];
  onCompleteTask: (taskId: string) => void;
  onEarnPoints?: (points: number, reason: string) => void;
  seniorMode: boolean;
  completedDailyTaskIds: MandatoryTaskId[];
  onDailyTaskAction: (actionKey: 'checkin' | 'learn' | 'watch' | 'wheel' | 'chest') => void;
  streakDays?: number;
  todayPoints?: number;
  onBackToHome?: () => void;
  currentUser?: AppUser | null;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  unreadNotificationCount?: number;
  onOpenInvite?: () => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  tasks,
  onCompleteTask,
  onEarnPoints,
  seniorMode,
  completedDailyTaskIds,
  onDailyTaskAction,
  streakDays = 0,
  onBackToHome,
  currentUser = null,
  onOpenNotifications,
  onOpenProfile,
  unreadNotificationCount = 0,
  onOpenInvite,
}) => {
  const { success, selection } = useHaptics();

  // 150-Day Unified Content Schedule - Today's Quest
  const scheduledQuest = getScheduledDailyTask();
  const dayNumber = getScheduleDayNumber();
  const [scheduledQuestCompleted, setScheduledQuestCompleted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`joyearn_quest_done_${scheduledQuest.id}`) === 'true';
    } catch {
      return false;
    }
  });
  const [showQuestDetails, setShowQuestDetails] = useState<boolean>(false);

  // Header search & section refs
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const moreTasksRef = useRef<HTMLDivElement | null>(null);

  // Selected community task modal state
  const [activeTaskModal, setActiveTaskModal] = useState<SponsoredTask | null>(null);
  const [taskInProgress, setTaskInProgress] = useState(false);
  const [taskSuccessNotice, setTaskSuccessNotice] = useState<string | null>(null);

  // Duplicate check-in click guard within same session
  const [claimingCheckin, setClaimingCheckin] = useState(false);

  const completedDailyCount = completedDailyTaskIds.length;
  const isWatchDone = completedDailyTaskIds.includes('daily_video');
  const isQuizDone = completedDailyTaskIds.includes('daily_quiz');
  const isCheckinDone = completedDailyTaskIds.includes('daily_checkin');
  const isWheelDone = completedDailyTaskIds.includes('daily_wheel');
  const isChestDone = completedDailyTaskIds.includes('daily_chest');

  const scrollToMoreTasks = () => {
    soundService.playClick();
    moreTasksRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Handle Daily Check-in with strict duplicate prevention
  const handleClaimCheckin = () => {
    if (isCheckinDone || claimingCheckin) return;
    setClaimingCheckin(true);
    soundService.playClick();
    onDailyTaskAction('checkin');
    setTaskSuccessNotice('✓ Daily Check-In claimed! (+50 JoyPoints)');
    setTimeout(() => {
      setClaimingCheckin(false);
    }, 1000);
    setTimeout(() => {
      setTaskSuccessNotice(null);
    }, 4000);
  };

  // Handle Share App action (opens real InviteModal or Web Share fallback)
  const handleShareApp = async () => {
    soundService.playClick();
    if (onOpenInvite) {
      onOpenInvite();
      return;
    }
    const shareText = 'Join me on JoyEarn — Watch, Learn, Play & Earn honest rewards!';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'JoyEarn', text: shareText, url: window.location.href });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
      setTaskSuccessNotice('✓ JoyEarn invite link copied to clipboard!');
      setTimeout(() => setTaskSuccessNotice(null), 3500);
    } catch {}
  };

  // Handle completing community task with strict duplicate guard
  const handleConfirmCommunityTask = () => {
    if (!activeTaskModal || activeTaskModal.completed || taskInProgress) return;
    setTaskInProgress(true);
    soundService.playClick();

    setTimeout(() => {
      onCompleteTask(activeTaskModal.id);
      soundService.playFanfare();
      success();
      setTaskInProgress(false);
      setTaskSuccessNotice(`✓ Completed: ${activeTaskModal.title} (+${activeTaskModal.points} Pts)`);
      setActiveTaskModal(null);

      setTimeout(() => {
        setTaskSuccessNotice(null);
      }, 4000);
    }, 600);
  };

  // Handle completing 150-day scheduled quest with duplicate prevention
  const handleCompleteScheduledQuest = () => {
    if (scheduledQuestCompleted) return;
    soundService.playFanfare();
    success();
    setScheduledQuestCompleted(true);
    try {
      localStorage.setItem(`joyearn_quest_done_${scheduledQuest.id}`, 'true');
    } catch {}
    if (onEarnPoints) {
      onEarnPoints(scheduledQuest.points, `Day ${dayNumber} Quest: ${scheduledQuest.title}`);
    }
    setTaskSuccessNotice(
      `🎉 Completed Day ${dayNumber} Quest: ${scheduledQuest.title} (+${scheduledQuest.points} JoyPoints)`
    );
    setTimeout(() => {
      setTaskSuccessNotice(null);
    }, 4500);
  };

  // Filter community tasks when searching
  const filteredCommunityTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.requirements && t.requirements.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  // Primary 4 Available Tasks matching reference layout & wired to real JoyEarn actions/points
  const primaryAvailableTasks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = [
      {
        id: 'watch_videos',
        title: seniorMode ? 'ویڈیوز دیکھیں' : 'Watch Videos',
        description: seniorMode
          ? 'مختصر محفوظ ویڈیوز دیکھیں اور پوائنٹس کمائیں'
          : 'Watch short videos and earn points',
        pointsLabel: '+25',
        done: isWatchDone,
        ctaLabel: seniorMode ? 'شروع' : 'Start',
        ctaIcon: 'play' as const,
        iconBg: 'bg-gradient-to-br from-[#ff1b8d] to-[#d9006c]',
        iconType: 'video' as const,
        onClick: () => {
          soundService.playClick();
          onDailyTaskAction('watch');
        },
      },
      {
        id: 'take_quiz',
        title: seniorMode ? 'کوئز حل کریں' : 'Take Quiz',
        description: seniorMode
          ? 'سوالات کے جوابات دیں اور پوائنٹس کمائیں'
          : 'Answer quiz questions and earn points',
        pointsLabel: '+25',
        done: isQuizDone,
        ctaLabel: seniorMode ? 'شروع' : 'Start',
        ctaIcon: 'play' as const,
        iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
        iconType: 'quiz' as const,
        onClick: () => {
          soundService.playClick();
          onDailyTaskAction('learn');
        },
      },
      {
        id: 'daily_checkin',
        title: seniorMode ? 'روزانہ حاضری' : 'Daily Check-In',
        description: seniorMode
          ? 'روزانہ آئیں اور اپنا انعام حاصل کریں'
          : 'Come daily and collect your rewards',
        pointsLabel: '+50',
        done: isCheckinDone,
        ctaLabel: seniorMode ? 'حاصل کریں' : 'Claim',
        ctaIcon: 'gift' as const,
        iconBg: 'bg-gradient-to-br from-pink-500 to-rose-600',
        iconType: 'checkin' as const,
        onClick: handleClaimCheckin,
      },
      {
        id: 'share_app',
        title: seniorMode ? 'ایپ شیئر کریں' : 'Share App',
        description: seniorMode
          ? 'دوستوں کے ساتھ JoyEarn شیئر کریں اور پوائنٹس کمائیں'
          : 'Share JoyEarn with friends and earn points',
        pointsLabel: '+100',
        done: false,
        ctaLabel: seniorMode ? 'شیئر' : 'Share',
        ctaIcon: 'share' as const,
        iconBg: 'bg-gradient-to-br from-violet-500 to-indigo-600',
        iconType: 'share' as const,
        onClick: handleShareApp,
      },
    ];
    if (!q) return list;
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
    );
  }, [seniorMode, isWatchDone, isQuizDone, isCheckinDone, searchQuery, onDailyTaskAction]);

  return (
    <div className="w-full flex flex-col bg-white min-h-screen pb-28 max-w-lg mx-auto">
      {/* 1. STICKY PINK-AND-WHITE HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md">
        <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
          {/* Left: JoyEarn Logo */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onBackToHome?.();
              }}
              className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] flex items-center justify-center shadow-sm tap-bounce"
              aria-label="JoyEarn Home"
            >
              <Play className="w-[18px] h-[18px] text-white fill-white ml-0.5" />
            </button>
            <span className="text-[22px] font-extrabold tracking-tight text-[#ec0078] leading-none">
              JoyEarn
            </span>
          </div>

          {/* Right: Search, Notification Bell with Badge, Profile Avatar */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                setSearchOpen((prev) => {
                  if (prev) setSearchQuery('');
                  return !prev;
                });
              }}
              aria-label="Search tasks"
              className={`p-1.5 rounded-full transition-colors tap-bounce ${
                searchOpen ? 'bg-pink-100 text-[#ec0078]' : 'text-slate-900 hover:bg-pink-50'
              }`}
            >
              <Search className="w-[22px] h-[22px]" strokeWidth={2.2} />
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenNotifications?.();
              }}
              aria-label="Notifications"
              className="relative p-1.5 rounded-full text-slate-900 hover:bg-pink-50 transition-colors tap-bounce"
            >
              <Bell className="w-[22px] h-[22px]" strokeWidth={2.2} />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-none flex items-center justify-center border-2 border-white tabular-nums">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                onOpenProfile?.();
              }}
              aria-label="User profile and settings"
              className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-pink-200 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center shrink-0 tap-bounce"
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
        </div>

        {/* Expandable Search Input */}
        {searchOpen && (
          <div className="px-4 pb-2.5">
            <div className="flex items-center gap-2 bg-pink-50/90 border border-pink-200 rounded-full px-3.5 py-2">
              <Search className="w-4 h-4 text-[#ec0078] shrink-0" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={seniorMode ? 'ٹاسک تلاش کریں...' : 'Search available tasks & quests...'}
                className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-rose-400 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="p-0.5 rounded-full text-rose-500 hover:bg-pink-100"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT BODY */}
      <div className="px-4 space-y-4 pt-1">
        {/* 2. HERO BANNER ("Complete Tasks / Earn JoyPoints! — Simple Tasks • Big Rewards") */}
        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-5 py-4 text-white shadow-md shadow-pink-200/70 flex items-center justify-between gap-3">
          {/* Decorative Checklist & Coin Visual on Left */}
          <div className="relative z-10 shrink-0 w-20 h-20 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/95 border-2 border-pink-200 shadow-lg flex flex-col items-center justify-center gap-1 -rotate-6">
              <ClipboardCheck className="w-8 h-8 text-[#ec0078]" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 border-2 border-yellow-100 shadow-md flex items-center justify-center">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          </div>

          <div className="relative z-10 flex-1 space-y-1">
            <h1 className="text-[22px] sm:text-[24px] font-black leading-[1.08] tracking-tight italic drop-shadow-xs">
              <span className="block text-white">
                {seniorMode ? 'ٹاسک مکمل کریں' : 'Complete Tasks'}
              </span>
              <span className="block text-[#fde047]">
                {seniorMode ? 'جوائے پوائنٹس کمائیں!' : 'Earn JoyPoints!'}
              </span>
            </h1>
            <p className="text-[12px] font-bold text-white/95 tracking-wide pt-0.5">
              {seniorMode ? 'آسان ٹاسک • بڑے انعامات' : 'Simple Tasks • Big Rewards'}
            </p>
          </div>
        </div>

        {/* Success Toast / Notice */}
        {taskSuccessNotice && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-xs rounded-2xl shadow-xs flex items-center justify-between">
            <span>{taskSuccessNotice}</span>
            <button
              type="button"
              onClick={() => setTaskSuccessNotice(null)}
              className="text-emerald-700 font-bold ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* 3. AVAILABLE TASKS SECTION (EXACT REFERENCE CARD STYLE) */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-[#ec0078]" />
              <h2 className="font-extrabold text-slate-900 text-[15px]">
                {seniorMode ? 'دستیاب ٹاسک' : 'Available Tasks'}
              </h2>
            </div>
            <button
              type="button"
              onClick={scrollToMoreTasks}
              className="text-xs font-extrabold text-[#ec0078] hover:text-[#be0060] flex items-center gap-0.5 tap-bounce"
            >
              <span>{seniorMode ? 'سب دیکھیں' : 'View All'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {primaryAvailableTasks.map((item) => (
              <div
                key={item.id}
                className="bg-[#fdf2f8] border border-pink-100 rounded-[22px] px-3.5 py-3 shadow-2xs flex items-center justify-between gap-2.5"
              >
                {/* Left Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center shrink-0 shadow-sm text-white`}
                >
                  {item.iconType === 'video' && <Play className="w-6 h-6 fill-white ml-0.5" />}
                  {item.iconType === 'quiz' && <ClipboardCheck className="w-6 h-6" />}
                  {item.iconType === 'checkin' && <Gift className="w-6 h-6" />}
                  {item.iconType === 'share' && <Share2 className="w-6 h-6" />}
                </div>

                {/* Center Title & Description */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-extrabold text-[14px] text-slate-900 leading-tight truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11.5px] text-slate-600 leading-snug line-clamp-2 mt-0.5">
                    {item.description}
                  </p>
                </div>

                {/* Right Star Points + Pill CTA Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 text-[13px] font-black text-[#ec0078] tabular-nums">
                    <span>⭐</span>
                    <span>{item.pointsLabel}</span>
                  </span>

                  {item.done ? (
                    <span className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Done</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={item.id === 'daily_checkin' && claimingCheckin}
                      onClick={item.onClick}
                      className="px-4 py-2 rounded-full bg-[#ec0078] hover:bg-[#d1006a] text-white font-extrabold text-xs shadow-xs tap-bounce inline-flex items-center gap-1 disabled:opacity-60"
                    >
                      <span>{item.ctaLabel}</span>
                      {item.ctaIcon === 'play' && <Play className="w-3 h-3 fill-white" />}
                      {item.ctaIcon === 'gift' && <Gift className="w-3.5 h-3.5" />}
                      {item.ctaIcon === 'share' && <Share2 className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. BOTTOM PROMO BANNER ("Complete More Tasks / Get More Rewards!" + Explore) */}
        <div
          onClick={scrollToMoreTasks}
          className="rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-4 py-3.5 text-white shadow-md shadow-pink-200/70 cursor-pointer tap-bounce flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <Gift className="w-7 h-7 text-yellow-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-black italic leading-tight truncate">
                {seniorMode ? 'مزید ٹاسک مکمل کریں' : 'Complete More Tasks'}
              </h3>
              <p className="text-[13px] font-black italic text-[#fde047] leading-tight truncate">
                {seniorMode ? 'مزید انعامات حاصل کریں!' : 'Get More Rewards!'}
              </p>
            </div>
          </div>

          <span className="px-4 py-2 rounded-full bg-white text-[#9d174d] font-black text-xs inline-flex items-center gap-1 shrink-0 shadow-sm">
            <span>{seniorMode ? 'دیکھیں' : 'Explore'}</span>
            <Play className="w-3 h-3 fill-[#ec0078] text-[#ec0078]" />
          </span>
        </div>

        {/* 5. PRESERVED ADDITIONAL DAILY BONUS ACTIVITIES, 150-DAY QUEST & COMMUNITY QUESTS */}
        <div ref={moreTasksRef} className="space-y-4 pt-2">
          {/* Remaining Mandatory Daily Tasks (Wheel & Streak Chest + Routine Progress) */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-[#ec0078]" />
                <h2 className="font-extrabold text-slate-900 text-sm">
                  {seniorMode ? 'روزانہ بونس مشنز' : 'Daily Bonus Activities'}
                </h2>
              </div>
              <span className="text-[11px] font-bold text-[#ec0078] bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-100">
                {completedDailyCount}/5 Daily Done • {streakDays}d Streak
              </span>
            </div>

            {/* Lucky Joy Wheel */}
            <div className="bg-[#fdf2f8] border border-pink-100 rounded-[22px] px-3.5 py-3 flex items-center justify-between gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shrink-0 text-white shadow-xs">
                <RotateCw className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-[13.5px] text-slate-900 truncate">
                  {seniorMode ? 'خوش قسمت وہیل' : 'Lucky Joy Wheel'}
                </h3>
                <p className="text-[11px] text-slate-600 truncate">
                  Free daily spin for genuine JoyPoints bonuses
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-[#ec0078]">⭐ +30</span>
                {isWheelDone ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Done</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      onDailyTaskAction('wheel');
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#ec0078] hover:bg-[#d1006a] text-white font-extrabold text-xs tap-bounce shadow-xs"
                  >
                    Spin ▶
                  </button>
                )}
              </div>
            </div>

            {/* Daily Streak Chest */}
            <div className="bg-[#fdf2f8] border border-pink-100 rounded-[22px] px-3.5 py-3 flex items-center justify-between gap-2.5">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shrink-0 text-white shadow-xs">
                <Gift className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-extrabold text-[13.5px] text-slate-900 truncate">
                  {seniorMode ? 'روزانہ انعام کا ڈبہ' : 'Daily Streak Chest'}
                </h3>
                <p className="text-[11px] text-slate-600 truncate">
                  Unlock your daily streak treasure chest for loyalty rewards
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-black text-[#ec0078]">⭐ +35</span>
                {isChestDone ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Done</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      onDailyTaskAction('chest');
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#ec0078] hover:bg-[#d1006a] text-white font-extrabold text-xs tap-bounce shadow-xs"
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* 150-Day Unified Content Schedule: Today's Featured Quest */}
          <section className="rounded-[24px] bg-gradient-to-br from-[#ec0078] via-rose-500 to-pink-500 text-white p-4 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase">
                  Day {dayNumber} of 150
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white text-[#9d174d] text-[10px] font-black uppercase">
                  {scheduledQuest.category}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-pink-100 font-bold">
                  <Compass className="w-3 h-3" />
                  <span>{scheduledQuest.difficulty}</span>
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-xs font-black shrink-0">
                +{scheduledQuest.points} Pts
              </span>
            </div>

            <h3 className="font-black text-sm leading-snug">
              {seniorMode && scheduledQuest.urduTitle ? scheduledQuest.urduTitle : scheduledQuest.title}
            </h3>
            <p className="text-xs text-pink-50 line-clamp-2">
              {seniorMode && scheduledQuest.urduDescription
                ? scheduledQuest.urduDescription
                : scheduledQuest.description}
            </p>

            {showQuestDetails && (
              <div className="pt-2 border-t border-white/20 text-[11px] text-white/95 bg-white/10 p-2.5 rounded-xl">
                <span className="font-black uppercase text-[10px] text-yellow-200 block mb-0.5">
                  Verification Requirement:
                </span>
                {scheduledQuest.verificationCondition}
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setShowQuestDetails((prev) => !prev);
                }}
                className="text-[11px] font-extrabold text-white/90 hover:text-white underline"
              >
                {showQuestDetails ? 'Hide Details ▲' : 'View Details ▼'}
              </button>

              {scheduledQuestCompleted ? (
                <span className="px-3 py-1.5 bg-emerald-500 text-white rounded-full font-black text-xs inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Done for Today ✓</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleCompleteScheduledQuest}
                  className="px-4 py-1.5 bg-white text-[#9d174d] hover:bg-pink-50 font-black text-xs rounded-full shadow-xs tap-bounce inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#ec0078]" />
                  <span>Complete Quest (+{scheduledQuest.points} Pts)</span>
                </button>
              )}
            </div>
          </section>

          {/* Verified Community & Partner Quests */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between px-0.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#ec0078]" />
                <h2 className="font-extrabold text-slate-900 text-sm">
                  {seniorMode ? 'کمیونٹی مشنز' : 'Community & Partner Quests'}
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-bold">
                {tasks.filter((t) => t.completed).length}/{tasks.length} Done
              </span>
            </div>

            <div className="space-y-2.5">
              {filteredCommunityTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-[22px] border transition-all flex items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-slate-50 border-slate-200 opacity-80'
                      : 'bg-[#fdf2f8] border-pink-100 hover:border-pink-300 shadow-2xs'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#9d174d] bg-[#fce7f3] px-2 py-0.5 rounded-full">
                        {task.category || 'Community'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        Est: {task.estTime || '2 mins'}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-[13.5px] text-slate-900 truncate mt-1">
                      {task.title}
                    </h3>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {task.requirements}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-black text-[#ec0078] tabular-nums">
                      ⭐ +{task.points}
                    </span>

                    {task.completed ? (
                      <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          soundService.playClick();
                          selection();
                          setActiveTaskModal(task);
                        }}
                        className="px-3.5 py-1.5 bg-[#ec0078] hover:bg-[#d1006a] text-white rounded-full font-extrabold text-xs tap-bounce shadow-xs"
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Honest Anti-Scam Fair Play Footer Note */}
          <div className="bg-pink-50/70 border border-pink-100 rounded-2xl p-3 text-[11.5px] text-[#831843] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ec0078] shrink-0" />
            <span className="font-semibold">
              Strict Anti-Scam Standard: Zero paid app installs, fake clicks, or pyramid schemes.
            </span>
          </div>
        </div>
      </div>

      {/* Task Completion Workflow Modal */}
      {activeTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-pink-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#9d174d] bg-[#fce7f3] px-2.5 py-0.5 rounded-full">
                {activeTaskModal.category || 'Task Verification'}
              </span>
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-slate-900">{activeTaskModal.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{activeTaskModal.requirements}</p>
            </div>

            <div className="bg-[#fdf2f8] border border-pink-100 rounded-2xl p-3 text-xs text-[#831843] space-y-1">
              <div className="font-extrabold flex items-center justify-between">
                <span>Task Reward:</span>
                <span className="text-[#ec0078] font-black">+{activeTaskModal.points} JoyPoints</span>
              </div>
              <p className="text-[11px] text-slate-600">
                Follow all educational guidelines honestly. No third-party downloads required.
              </p>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTaskModal(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-xs tap-bounce"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCommunityTask}
                disabled={taskInProgress || activeTaskModal.completed}
                className="flex-1 py-3 bg-[#ec0078] hover:bg-[#d1006a] text-white rounded-full font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {taskInProgress ? 'Verifying...' : 'Complete & Claim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
