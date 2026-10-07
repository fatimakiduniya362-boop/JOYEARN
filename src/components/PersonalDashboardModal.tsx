import React, { useState } from 'react';
import {
  Calendar,
  Award,
  Sparkles,
  TrendingUp,
  Brain,
  Video,
  Flame,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Target,
  Gift,
  Star,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  PartyPopper,
  Edit3,
  Check
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { MilestoneComponent, STREAK_MILESTONES } from './MilestoneComponent';
import { WeeklyProgressTracker } from './WeeklyProgressTracker';
import { StreakTrendChart } from './StreakTrendChart';
import { StreakHistoryChart } from './StreakHistoryChart';
import { ShareStreakModal } from './ShareStreakModal';
import { DailyGoalTracker } from './DailyGoalTracker';
import { WeeklyStreakSummary } from './WeeklyStreakSummary';
import { StreakLeaderboardModal } from './StreakLeaderboardModal';
import { Share2 } from 'lucide-react';

interface HistoryItem {
  id: string;
  title: string;
  points: number;
  timeAgo: string;
  category: 'quiz' | 'video' | 'wheel' | 'streak' | 'scratch';
  icon: string;
}

interface PersonalDashboardModalProps {
  onClose: () => void;
  currentPoints: number;
  userName: string;
  userAvatar: string;
  userEmail?: string;
  seniorMode: boolean;
  completedActivitiesCount: number; // 0 to 5
  streakDays: number;
  hasAdFree: boolean;
  onOpenLearn: () => void;
  onOpenWatch: () => void;
  onOpenSpin: () => void;
  onOpenScratch: () => void;
  onOpenWallet: () => void;
  onTriggerConfetti: () => void;
  onClaimMilestone?: (milestoneId: string, points: number, title: string) => void;
  claimedMilestoneIds?: string[];
  onUpdateUserName?: (newName: string) => void;
}

export const PersonalDashboardModal: React.FC<PersonalDashboardModalProps> = ({
  onClose,
  currentPoints,
  userName,
  userAvatar,
  userEmail,
  seniorMode,
  completedActivitiesCount,
  streakDays,
  hasAdFree,
  onOpenLearn,
  onOpenWatch,
  onOpenSpin,
  onOpenScratch,
  onOpenWallet,
  onTriggerConfetti,
  onClaimMilestone,
  claimedMilestoneIds = [],
  onUpdateUserName
}) => {
  const { light, success } = useHaptics();
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'breakdown' | 'history'>('overview');

  // Inline username editing
  const [isEditingName, setIsEditingName] = useState(false);
  const [trendChartType, setTrendChartType] = useState<'weekly' | 'streak30'>('streak30');
  const [showStreakFlame, setShowStreakFlame] = useState(false);
  const [showShareStreakModal, setShowShareStreakModal] = useState(false);
  const [showStreakLeaderboard, setShowStreakLeaderboard] = useState(false);
  const [streakFlameMetrics, setStreakFlameMetrics] = useState<{ daysHit: number; totalDays: number; hitRate: number } | null>(null);

  const handleStreakChartRenderComplete = (metrics: { daysHit: number; totalDays: number; hitRate: number }) => {
    setStreakFlameMetrics(metrics);
    setShowStreakFlame(true);
    soundService.playStreakFlame();
    success();
  };
  const [editedName, setEditedName] = useState(userName);

  const handleSaveName = () => {
    if (editedName.trim()) {
      onUpdateUserName?.(editedName.trim());
      setIsEditingName(false);
      success();
    }
  };

  // User Tier Calculation
  const getUserTier = (pts: number) => {
    if (pts >= 10000) return { name: 'Master Learner', badge: '👑', color: 'text-amber-400', nextAt: 25000 };
    if (pts >= 5000) return { name: 'Diamond Achiever', badge: '💎', color: 'text-cyan-400', nextAt: 10000 };
    if (pts >= 2500) return { name: 'Gold Scholar', badge: '🥇', color: 'text-yellow-400', nextAt: 5000 };
    if (pts >= 1000) return { name: 'Silver Explorer', badge: '🥈', color: 'text-slate-300', nextAt: 2500 };
    return { name: 'Bronze Pioneer', badge: '🥉', color: 'text-amber-600', nextAt: 1000 };
  };

  const currentTier = getUserTier(currentPoints);

  // Daily goal progress (target: 5 activities)
  const dailyGoalTarget = 5;
  const progressPercent = Math.min(100, Math.round((completedActivitiesCount / dailyGoalTarget) * 100));

  // Recent earning records
  const recentHistory: HistoryItem[] = [
    {
      id: 'h1',
      title: 'Daily Goal Perfection (5/5 Activities)',
      points: 100,
      timeAgo: 'Just now',
      category: 'streak',
      icon: '🎯'
    },
    {
      id: 'h2',
      title: 'Science & World Trivia Champion Quiz',
      points: 40,
      timeAgo: '12m ago',
      category: 'quiz',
      icon: '🧠'
    },
    {
      id: 'h3',
      title: 'Educational Video: Space Exploration',
      points: 25,
      timeAgo: '45m ago',
      category: 'video',
      icon: '🎬'
    },
    {
      id: 'h4',
      title: 'Lucky Wheel Daily Spin Bonus',
      points: 50,
      timeAgo: '2h ago',
      category: 'wheel',
      icon: '🎡'
    },
    {
      id: 'h5',
      title: `Daily Learning Streak Bonus (Day ${streakDays})`,
      points: 75,
      timeAgo: '5h ago',
      category: 'streak',
      icon: '🔥'
    },
    {
      id: 'h6',
      title: 'Golden Mystery Scratch Card',
      points: 30,
      timeAgo: '1d ago',
      category: 'scratch',
      icon: '✨'
    }
  ];

  const handleCelebrate = () => {
    soundService.playFanfare();
    success();
    onTriggerConfetti();
  };

  // Next streak milestone info
  const nextMilestone = STREAK_MILESTONES.find((m) => m.streakDaysRequired > streakDays);
  const unlockedMilestonesCount = STREAK_MILESTONES.filter((m) => streakDays >= m.streakDaysRequired).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-emerald-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 p-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
              📊
            </div>
            <div>
              <h2 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-xl' : 'text-base sm:text-lg'}`}>
                {seniorMode ? 'صارف کی سرگرمی اور کمائی کا ڈیش بورڈ' : "User's Activity & Earnings Dashboard"}
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                {seniorMode ? 'آپ کی تمام انعامی سرگرمیوں اور اسٹریک سنگ میل کا خلاصہ' : 'Track your educational progress, milestones & earned points'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold tap-bounce shadow-xs"
            title="Close Dashboard"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50 text-xs font-black">
          <button
            onClick={() => {
              soundService.playClick();
              light();
              setActiveTab('overview');
            }}
            className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'جائزہ' : 'Overview'}</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              light();
              setActiveTab('milestones');
            }}
            className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'milestones'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>{seniorMode ? 'سنگ میل' : 'Milestones'}</span>
            <span className="text-[9px] bg-amber-400 text-slate-950 px-1 rounded-full font-black">
              {unlockedMilestonesCount}
            </span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              light();
              setActiveTab('breakdown');
            }}
            className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'breakdown'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'بریک ڈاؤن' : 'Breakdown'}</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              light();
              setActiveTab('history');
            }}
            className={`flex-1 py-2.5 text-center transition-all flex items-center justify-center gap-1 border-b-2 ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 bg-white font-black'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{seniorMode ? 'تاریخچہ' : 'History'}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <>
              {/* User Standing & Balance Hero Card */}
              <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 text-white rounded-3xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <span className="text-3xl p-1.5 bg-white/20 rounded-2xl shadow-inner backdrop-blur-xs">
                      {userAvatar || '🎓'}
                    </span>
                    <div>
                      {isEditingName ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            className="bg-white text-gray-900 px-2 py-0.5 rounded-lg text-xs font-bold w-28 focus:outline-none"
                            placeholder="Your Name"
                            maxLength={20}
                            autoFocus
                          />
                          <button
                            onClick={handleSaveName}
                            className="p-1 bg-amber-400 text-slate-900 rounded-lg text-xs font-black tap-bounce"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-sm sm:text-base leading-tight">
                            {userName || 'JoyEarn Learner'}
                          </h3>
                          <button
                            onClick={() => {
                              setEditedName(userName);
                              setIsEditingName(true);
                            }}
                            className="p-1 text-emerald-200 hover:text-white tap-bounce"
                            title="Edit User Name"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] text-emerald-100 flex items-center gap-1 font-medium">
                        <span>{currentTier.badge}</span>
                        <span>{currentTier.name}</span>
                        {userEmail && <span className="opacity-75">• {userEmail}</span>}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-xl text-xs font-black shadow-xs">
                    <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>{streakDays} {seniorMode ? 'دن اسٹریک' : 'Day Streak'}</span>
                  </div>
                </div>

                {/* Point Balance */}
                <div className="bg-white/15 backdrop-blur-xs rounded-2xl p-3 border border-white/25 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-emerald-100 font-bold uppercase tracking-wider block">
                      {seniorMode ? 'کل حاصل کردہ جوائے پوائنٹس' : 'Total Earned JoyPoints'}
                    </span>
                    <div className="text-2xl sm:text-3xl font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
                      <Star className="w-6 h-6 fill-amber-300 text-amber-300 shrink-0" />
                      <span>{currentPoints.toLocaleString()}</span>
                      <span className="text-xs font-bold text-white opacity-90">Pts</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundService.playClick();
                      onOpenWallet();
                    }}
                    className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-md tap-bounce flex items-center gap-1"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>{seniorMode ? 'اسٹور' : 'Perks & Store'}</span>
                  </button>
                </div>

                {/* Rewards & Wallet Notice */}
                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-emerald-100/90 leading-tight">
                  <ShieldCheck className="w-3 h-3 text-emerald-200 shrink-0" />
                  <span>Ad-funded real rewards. Redeem your earned JoyPoints for payouts in your Wallet.</span>
                </div>
              </div>

              {/* STREAK LEADERBOARD TRIGGER BUTTON */}
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setShowStreakLeaderboard(true);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-black rounded-2xl text-xs shadow-md tap-bounce flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                    🔥
                  </div>
                  <div className="text-left">
                    <span className="block font-black text-xs text-white">
                      {seniorMode ? 'عالمی اسٹریک لیڈر بورڈ' : 'Global Streak Leaderboard'}
                    </span>
                    <span className="text-[10px] text-amber-100 font-semibold">
                      Compare your {streakDays}-day streak with Top Learners
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-white/25 px-2.5 py-1 rounded-xl text-xs font-black">
                  <span>View Standings</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>

              {/* DailyGoalTracker: 7-Day Streak Calendar & 5-Activity Daily Goal */}
              <DailyGoalTracker
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
                onOpenLearn={onOpenLearn}
                onOpenWatch={onOpenWatch}
                onTriggerConfetti={onTriggerConfetti}
              />

              {/* Weekly Streak Summary (Visual 7-Day 5-Activity Consistency) */}
              <WeeklyStreakSummary
                todayActivitiesCount={completedActivitiesCount}
                dailyGoalTarget={dailyGoalTarget}
                streakDays={streakDays}
                seniorMode={seniorMode}
              />

              {/* ACTIVITY & STREAK ANALYTICS TOGGLE */}
              <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl text-xs font-black shadow-inner">
                <button
                  onClick={() => {
                    soundService.playClick();
                    light();
                    setTrendChartType('streak30');
                  }}
                  className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    trendChartType === 'streak30'
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{seniorMode ? '30 روزہ اسٹریک ٹرینڈ' : '30-Day Streak Trend'}</span>
                </button>
                <button
                  onClick={() => {
                    soundService.playClick();
                    light();
                    setTrendChartType('weekly');
                  }}
                  className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    trendChartType === 'weekly'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{seniorMode ? '7 روزہ تسلسل' : '7-Day Consistency'}</span>
                </button>
              </div>

              {/* UNIQUE STREAK-FLAME ANIMATION BANNER */}
              {showStreakFlame && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white p-3.5 rounded-2xl shadow-lg border-2 border-amber-300 animate-in fade-in zoom-in-95 duration-500">
                  <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-white/20 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner shrink-0 animate-bounce">
                        🔥
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm">
                          <span>{seniorMode ? 'اسٹریک شعلہ چمک رہا ہے!' : 'Streak Flame Blazing!'}</span>
                          <span className="px-2 py-0.5 bg-white text-orange-700 text-[10px] font-black rounded-full shadow-xs">
                            {streakFlameMetrics?.hitRate || 83}% Hit Rate
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-100 font-medium leading-snug mt-0.5">
                          {seniorMode
                            ? "شاندار تسلسل! آپ نے گزشتہ 30 دنوں میں سے زیادہ تر دن 5 سرگرمیوں کا ہدف کامیابی سے حاصل کیا ہے۔"
                            : `Outstanding consistency! You hit your 5-activity daily target on ${streakFlameMetrics?.daysHit ?? 25} of the past ${streakFlameMetrics?.totalDays ?? 30} days.`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          soundService.playClick();
                          light();
                          setShowShareStreakModal(true);
                        }}
                        className="px-3 py-1.5 bg-white text-orange-900 hover:bg-amber-100 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{seniorMode ? 'شیئر کریں' : 'Share'}</span>
                      </button>
                      <button
                        onClick={() => setShowStreakFlame(false)}
                        className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-xs font-bold text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {trendChartType === 'streak30' ? (
                <StreakTrendChart
                  seniorMode={seniorMode}
                  currentStreakDays={streakDays}
                  todayActivitiesCount={completedActivitiesCount}
                  onRenderComplete={handleStreakChartRenderComplete}
                />
              ) : (
                <WeeklyProgressTracker
                  seniorMode={seniorMode}
                  todayActivitiesCount={completedActivitiesCount}
                  streakDays={streakDays}
                />
              )}

              {/* RECHARTS WEEKLY ACTIVITY CONSISTENCY (DAYS ACTIVE VS DAYS MISSED) */}
              <StreakHistoryChart
                seniorMode={seniorMode}
                streakDays={streakDays}
              />

              {/* WEEKLY CONSISTENCY BADGE CARD (Unlocks when user hits 5-activity goal for 7 consecutive days) */}
              <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-2 border-indigo-400/80 rounded-2xl p-4 space-y-3 shadow-md relative overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-md shrink-0">
                      🎖️
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-sm text-slate-900 dark:text-white">
                          {seniorMode ? 'ہفتہ وار مستقل مزاجی بیج' : 'Weekly Consistency Badge'}
                        </h4>
                        <span
                          className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                            streakDays >= 7
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                          }`}
                        >
                          {streakDays >= 7 ? 'Unlocked 🎉' : `${Math.min(streakDays, 7)}/7 Days`}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5">
                        {seniorMode
                          ? 'مسلسل 7 دن تک روزانہ 5 سرگرمیوں کا ہدف مکمل کرنے پر انلاک ہوتا ہے۔'
                          : 'Unlocks when you hit the 5-activity daily goal for 7 consecutive days.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 7-Day Consistency Stepper Indicator */}
                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => {
                    const isDayReached = streakDays >= dayNum;
                    return (
                      <div
                        key={dayNum}
                        className={`py-1.5 px-0.5 rounded-xl text-center border transition-all ${
                          isDayReached
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs font-black'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 font-bold'
                        }`}
                      >
                        <div className="text-[9px] uppercase tracking-tighter opacity-80">Day</div>
                        <div className="text-xs font-black leading-tight">{dayNum}</div>
                        <div className="text-[10px] leading-none mt-0.5">
                          {isDayReached ? '✓' : '○'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Progress Bar & Status */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700 dark:text-slate-200">
                      {seniorMode ? '7 روزہ تسلسل کی پیشرفت:' : '7-Day Consecutive Progress:'}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">
                      {Math.min(streakDays, 7)} / 7 Days ({Math.round(Math.min(streakDays / 7, 1) * 100)}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, Math.round((streakDays / 7) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Claim Button / Unlocked Status */}
                {streakDays >= 7 && (
                  <div className="pt-1 flex items-center justify-between bg-white dark:bg-slate-850 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <div className="text-xs">
                      <span className="font-black text-slate-900 dark:text-white block">
                        {claimedMilestoneIds?.includes('weekly_consistency')
                          ? 'Badge Claimed ✓'
                          : 'Badge Ready to Claim! 🎁'}
                      </span>
                      <span className="text-[10px] text-amber-600 font-bold">
                        +500 JoyPoints Consistency Award
                      </span>
                    </div>

                    {!claimedMilestoneIds?.includes('weekly_consistency') ? (
                      <button
                        onClick={() => {
                          soundService.playFanfare();
                          onTriggerConfetti?.();
                          onClaimMilestone?.('weekly_consistency', 500, 'Weekly Consistency');
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-black text-xs rounded-xl shadow-md tap-bounce animate-pulse"
                      >
                        Claim 500 Pts
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs rounded-lg border border-emerald-300">
                        Achieved 🎖️
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* VISUAL STREAK MILESTONES PREVIEW CARD */}
              <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-rose-500/10 border-2 border-amber-300 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-xs">
                      🔥
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-slate-900 flex items-center gap-1">
                        <span>{seniorMode ? 'اسٹریک سنگ میل اور بیجز' : 'Streak Milestones & Badges'}</span>
                        <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.2 rounded-full">
                          {streakDays}d
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-600 font-medium">
                        {nextMilestone
                          ? `${nextMilestone.streakDaysRequired - streakDays} days until ${nextMilestone.title}`
                          : 'All top streak badges unlocked!'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      soundService.playClick();
                      light();
                      setActiveTab('milestones');
                    }}
                    className="text-[11px] font-black text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-xl tap-bounce flex items-center gap-1 border border-amber-200"
                  >
                    <span>{seniorMode ? 'تمام بیجز' : 'View All'}</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                {/* 3 Quick Badges Showcase */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {STREAK_MILESTONES.slice(0, 3).map((item) => {
                    const isUnlocked = streakDays >= item.streakDaysRequired;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          soundService.playClick();
                          setActiveTab('milestones');
                        }}
                        className={`cursor-pointer p-2 rounded-xl border text-center transition-all ${
                          isUnlocked
                            ? 'bg-white border-amber-300 shadow-2xs'
                            : 'bg-slate-100 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="text-xl">{item.icon}</div>
                        <div className="text-[10px] font-black text-gray-900 truncate mt-0.5">
                          {item.streakDaysRequired}d Streak
                        </div>
                        <div className="text-[9px] font-extrabold text-amber-600">
                          {isUnlocked ? 'Unlocked' : 'Locked 🔒'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Learning Shortcuts */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenLearn();
                  }}
                  className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl text-left tap-bounce hover:border-indigo-400 transition-all flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-indigo-950">Quiz Zone</div>
                    <div className="text-[10px] text-indigo-700 font-medium truncate">+20-120 Pts Each</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenWatch();
                  }}
                  className="p-3 bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-2xl text-left tap-bounce hover:border-rose-400 transition-all flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-rose-950">Video Hub</div>
                    <div className="text-[10px] text-rose-700 font-medium truncate">+25 Pts per video</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenSpin();
                  }}
                  className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl text-left tap-bounce hover:border-amber-400 transition-all flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0">
                    🎡
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-amber-950">Lucky Wheel</div>
                    <div className="text-[10px] text-amber-800 font-medium truncate">Win 100 Pts Jackpot</div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    soundService.playClick();
                    onOpenScratch();
                  }}
                  className="p-3 bg-gradient-to-br from-purple-50 to-fuchsia-50 border border-purple-200 rounded-2xl text-left tap-bounce hover:border-purple-400 transition-all flex items-center gap-2.5 shadow-2xs"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    ✨
                  </div>
                  <div className="min-w-0">
                    <div className="font-black text-xs text-purple-950">Scratch Card</div>
                    <div className="text-[10px] text-purple-700 font-medium truncate">Instant Surprise</div>
                  </div>
                </button>
              </div>

              {/* Subscriptions & Real Purchases Status */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    🛡️
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 block">Ad-Free Learning Status</span>
                    <span className="text-[10px] text-slate-500">
                      {hasAdFree ? 'Active (Lifetime Clean Experience)' : 'Inactive ($1.99 USD in Store)'}
                    </span>
                  </div>
                </div>

                {!hasAdFree && (
                  <button
                    onClick={() => {
                      soundService.playClick();
                      onOpenWallet();
                    }}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] rounded-lg shadow-xs tap-bounce"
                  >
                    $1.99 USD
                  </button>
                )}
              </div>
            </>
          )}

          {/* TAB 2: MILESTONES (STREAK BADGES & LOCKED ITEMS) */}
          {activeTab === 'milestones' && (
            <MilestoneComponent
              currentStreakDays={streakDays}
              completedActivitiesCount={completedActivitiesCount}
              seniorMode={seniorMode}
              onClaimMilestone={(id, pts, title) => {
                onClaimMilestone?.(id, pts, title);
              }}
              claimedMilestoneIds={claimedMilestoneIds}
              onTriggerConfetti={onTriggerConfetti}
            />
          )}

          {/* TAB 3: BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div className="space-y-4">
              {/* 30-Day Streak Trend Chart */}
              <StreakTrendChart
                seniorMode={seniorMode}
                currentStreakDays={streakDays}
                todayActivitiesCount={completedActivitiesCount}
              />

              {/* Weekly Progress Bar Chart */}
              <WeeklyProgressTracker
                seniorMode={seniorMode}
                todayActivitiesCount={completedActivitiesCount}
                streakDays={streakDays}
              />

              {/* Recharts Weekly Consistency Visualization */}
              <StreakHistoryChart
                seniorMode={seniorMode}
                streakDays={streakDays}
              />
              <div className="text-xs font-bold text-slate-600 px-1">
                Your Cumulative JoyPoints Earned Distribution:
              </div>

              {/* Activity breakdown bars */}
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-indigo-900">
                      <Brain className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Quizzes & Trivia Challenges</span>
                    </span>
                    <span className="text-indigo-700 font-black">45% (~{(currentPoints * 0.45).toFixed(0)} Pts)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: '45%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-rose-900">
                      <Video className="w-3.5 h-3.5 text-rose-600" />
                      <span>Educational Videos</span>
                    </span>
                    <span className="text-rose-700 font-black">25% (~{(currentPoints * 0.25).toFixed(0)} Pts)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-amber-900">
                      <span>🎡</span>
                      <span>Lucky Wheel & Scratch Cards</span>
                    </span>
                    <span className="text-amber-800 font-black">15% (~{(currentPoints * 0.15).toFixed(0)} Pts)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1.5 text-emerald-900">
                      <Flame className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Daily Streak & Check-in Bonus</span>
                    </span>
                    <span className="text-emerald-700 font-black">15% (~{(currentPoints * 0.15).toFixed(0)} Pts)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
              </div>

              {/* Stats highlights */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl">
                  <div className="text-xl font-black text-indigo-900">94.8%</div>
                  <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Quiz Accuracy</div>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <div className="text-xl font-black text-emerald-900">{streakDays} Days</div>
                  <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Active Streak</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              <div className="text-xs font-bold text-slate-600 px-1">
                Recent Reward Records:
              </div>

              <div className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                {recentHistory.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-2.5 hover:bg-slate-50/80 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-base shrink-0">
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="font-black text-xs text-slate-900 truncate">{item.title}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{item.timeAgo}</div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shrink-0">
                      +{item.points} Pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[10px] text-slate-500 font-medium">
            100% Google Play & Families Policy Compliant
          </span>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold rounded-xl tap-bounce"
          >
            Close
          </button>
        </div>
        {/* Share Streak Modal */}
        <ShareStreakModal
          isOpen={showShareStreakModal}
          onClose={() => setShowShareStreakModal(false)}
          streakDays={streakDays}
          completedActivitiesCount={completedActivitiesCount}
          currentPoints={currentPoints}
          seniorMode={seniorMode}
        />

        {/* Global Streak Leaderboard Modal */}
        <StreakLeaderboardModal
          isOpen={showStreakLeaderboard}
          onClose={() => setShowStreakLeaderboard(false)}
          userStreak={streakDays}
          userName={userName}
          userPoints={currentPoints}
          seniorMode={seniorMode}
        />
      </div>
    </div>
  );
};
