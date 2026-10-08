import React, { useState, useEffect } from 'react';
import {
  Target,
  Trophy,
  Crown,
  Award,
  Sparkles,
  Flame,
  CheckCircle2,
  Lock,
  ChevronRight,
  Star,
  Zap,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface DailyMilestoneSectionProps {
  completedActivitiesCount: number; // 0 to 5
  streakDays: number;
  seniorMode?: boolean;
  onClaimMilestone?: (milestoneId: string, points: number, title: string) => void;
  claimedMilestoneIds?: string[];
  onTriggerConfetti?: () => void;
}

const STORAGE_KEY = 'joyearn_5of5_daily_goal_stats';

interface Daily5GoalStats {
  totalGoalsReached: number;
  historyDates: string[];
  longestStreak: number;
}

export const DailyMilestoneSection: React.FC<DailyMilestoneSectionProps> = ({
  completedActivitiesCount,
  streakDays,
  seniorMode = false,
  onClaimMilestone,
  claimedMilestoneIds = [],
  onTriggerConfetti,
}) => {
  const { light, success } = useHaptics();

  // Load and sync total count of 5/5 daily activity goal completions
  const [stats, setStats] = useState<Daily5GoalStats>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const minGoals = Math.max(streakDays, parsed.historyDates?.length || 0, parsed.totalGoalsReached || 0);
        return {
          totalGoalsReached: minGoals,
          historyDates: parsed.historyDates || [],
          longestStreak: Math.max(parsed.longestStreak || 0, streakDays),
        };
      }
    } catch {}

    const seed = Math.max(streakDays, 0);
    return {
      totalGoalsReached: seed,
      historyDates: [],
      longestStreak: seed,
    };
  });

  // Check if today has reached 5/5
  const isGoalReachedToday = completedActivitiesCount >= 5;
  const todayDateStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    try {
      const currentStored = localStorage.getItem(STORAGE_KEY);
      let historyDates: string[] = [];
      let totalGoals = Math.max(streakDays, stats.totalGoalsReached);
      let longest = Math.max(stats.longestStreak, streakDays);

      if (currentStored) {
        const parsed = JSON.parse(currentStored);
        historyDates = parsed.historyDates || [];
        totalGoals = Math.max(totalGoals, parsed.totalGoalsReached || 0);
        longest = Math.max(longest, parsed.longestStreak || 0);
      }

      let changed = false;
      if (isGoalReachedToday && !historyDates.includes(todayDateStr)) {
        historyDates.push(todayDateStr);
        totalGoals = Math.max(totalGoals, historyDates.length, streakDays);
        changed = true;
      }

      if (streakDays > totalGoals) {
        totalGoals = streakDays;
        changed = true;
      }

      const updated: Daily5GoalStats = {
        totalGoalsReached: totalGoals,
        historyDates,
        longestStreak: Math.max(longest, streakDays),
      };

      if (changed || !currentStored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
      setStats(updated);
    } catch {}
  }, [isGoalReachedToday, todayDateStr, streakDays]);

  const is30DayStreakAchieved = streakDays >= 30;
  const is30DayBadgeClaimed = claimedMilestoneIds.includes('daily_5goal_30');

  const handleClaim30DayBadge = () => {
    soundService.playFanfare();
    soundService.playStreakFlame();
    success();
    onTriggerConfetti?.();
    if (onClaimMilestone) {
      onClaimMilestone('daily_5goal_30', 2500, '30-Day 5/5 Goal Perfection');
    }
  };

  const progressPercent = Math.min(100, Math.round((streakDays / 30) * 100));

  return (
    <section className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-600/80 rounded-3xl p-4 shadow-md space-y-3.5 relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header: Daily Milestone */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center text-xl shadow-xs shrink-0">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white">
                {seniorMode ? 'روزانہ کے سنگ میل (Daily Milestone)' : 'Daily Milestone'}
              </h4>
              <span className="text-[10px] font-black px-2 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                5/5 Goal Tracker
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {seniorMode
                ? '5/5 روزانہ اہداف کی تکمیل اور 30 روزہ اسٹریک بیج کی ٹریکنگ'
                : 'Tracks total times 5/5 daily goal is completed & 30-day streak badge'}
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-[9.5px] uppercase font-black text-slate-400 block tracking-wider">
            All-Time
          </span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
            {stats.totalGoalsReached}x
          </span>
        </div>
      </div>

      {/* Metric Cards Row: Times 5/5 Reached & Current Streak */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        {/* Card 1: Number of times 5/5 daily activity goal was reached */}
        <div className="p-3 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-slate-850 dark:to-slate-800 border border-amber-200 dark:border-amber-700/60 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              <span>5/5 Goals Met</span>
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200">
              Total Count
            </span>
          </div>

          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
            <span>{stats.totalGoalsReached}</span>
            <span className="text-xs font-bold text-slate-500">times</span>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 font-medium leading-tight">
            {isGoalReachedToday ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                <span>Today's 5/5 completed! ✓</span>
              </span>
            ) : (
              <span>{completedActivitiesCount}/5 completed today</span>
            )}
          </div>
        </div>

        {/* Card 2: Current Streak & 30-Day Milestone Status */}
        <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-850 dark:to-slate-800 border border-indigo-200 dark:border-indigo-700/60 rounded-2xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>Streak Toward 30d</span>
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
              30-Day Target
            </span>
          </div>

          <div className="text-2xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
            <span>{streakDays}</span>
            <span className="text-xs font-bold text-slate-500">/ 30 days</span>
          </div>

          <div className="text-[10px] text-slate-500 dark:text-slate-400 pt-0.5 font-medium leading-tight">
            {is30DayStreakAchieved ? (
              <span className="text-amber-600 dark:text-amber-400 font-black">
                👑 30-Day Master Achieved!
              </span>
            ) : (
              <span>{30 - streakDays} more consecutive days needed</span>
            )}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 👑 UNIQUE BADGE DISPLAY FOR 30-DAY STREAK OF HITTING 5/5 GOAL       */}
      {/* ==================================================================== */}
      <div
        className={`rounded-2xl p-3.5 border-2 transition-all relative overflow-hidden ${
          is30DayStreakAchieved
            ? 'bg-gradient-to-br from-amber-500/15 via-yellow-400/20 to-orange-500/15 border-amber-400 dark:border-amber-500 ring-2 ring-amber-300/50 shadow-md shadow-amber-500/10'
            : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
        }`}
      >
        {/* Shimmering Aura on Unlocked */}
        {is30DayStreakAchieved && (
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-tr from-amber-400 to-yellow-300 rounded-full blur-2xl opacity-40 pointer-events-none" />
        )}

        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            {/* Unique Badge Emblem */}
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md shrink-0 relative transition-transform ${
                is30DayStreakAchieved
                  ? 'bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-600 border-2 border-yellow-200 text-slate-950 scale-105 animate-pulse-subtle'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 border border-slate-300 dark:border-slate-600'
              }`}
            >
              {is30DayStreakAchieved ? '👑' : '🔒'}
              {is30DayStreakAchieved && (
                <span className="absolute -bottom-1 -right-1 text-sm">✨</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h5 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-1">
                  <span>30-Day 5/5 Goal Perfection Titan</span>
                </h5>
                <span
                  className={`text-[9.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                    is30DayStreakAchieved
                      ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs font-black'
                      : 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
                  }`}
                >
                  {is30DayStreakAchieved ? 'Unlocked Legendary 🎉' : `${streakDays}/30 Days`}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-snug">
                {seniorMode
                  ? 'مسلسل 30 دن تک روزانہ 5/5 سرگرمیوں کا ہدف مکمل کرنے کا منفرد شاہی بیج۔'
                  : 'Unique legendary badge awarded for achieving an unbroken 30-day streak of completing all 5 daily learning activities.'}
              </p>

              <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-700 dark:text-amber-400 font-bold">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>+2,500 JoyPoints Reward</span>
                </span>
                <span>•</span>
                <span>VIP Crown Emblem</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar Toward 30-Day Goal */}
        <div className="space-y-1 pt-3">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              {is30DayStreakAchieved ? '30-Day Milestone Completed!' : '30-Day Streak Progress:'}
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-black font-mono">
              {streakDays} / 30 Days ({progressPercent}%)
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                is30DayStreakAchieved
                  ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-sm'
                  : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Stepper milestones along 30-day journey */}
          <div className="flex justify-between text-[9px] text-slate-400 font-black pt-0.5 px-0.5">
            <span>Day 1 🌱</span>
            <span className={streakDays >= 7 ? 'text-emerald-600 dark:text-emerald-400' : ''}>Day 7 🎖️</span>
            <span className={streakDays >= 14 ? 'text-indigo-600 dark:text-indigo-400' : ''}>Day 14 💎</span>
            <span className={streakDays >= 21 ? 'text-purple-600 dark:text-purple-400' : ''}>Day 21 🔥</span>
            <span className={is30DayStreakAchieved ? 'text-amber-500 font-black' : ''}>Day 30 👑</span>
          </div>
        </div>

        {/* Claim Reward Button or Achieved Banner */}
        {is30DayStreakAchieved && (
          <div className="mt-3 pt-2.5 border-t border-amber-300/60 dark:border-amber-700/60 flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-black text-xs text-slate-900 dark:text-white block">
                {is30DayBadgeClaimed ? 'Badge & Bonus Claimed ✓' : 'Unique 30-Day Badge Ready to Claim! 🎁'}
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                Permanent badge on your profile and leaderboards
              </span>
            </div>

            {!is30DayBadgeClaimed ? (
              <button
                type="button"
                onClick={handleClaim30DayBadge}
                className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:brightness-110 text-slate-950 font-black text-xs rounded-xl shadow-md tap-bounce flex items-center gap-1.5 animate-pulse"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Claim 2,500 Pts & Badge</span>
              </button>
            ) : (
              <div className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-black text-xs rounded-xl border border-emerald-300 dark:border-emerald-700 flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active Titan Badge 👑</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5/5 Goals Frequency Milestones Roadmap */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Cumulative 5/5 Daily Goal Milestones</span>
          </span>
          <span className="text-[10px] font-bold text-slate-500">
            {stats.totalGoalsReached} Completed
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-center">
          {[
            { count: 5, label: '5x Goals', icon: '🌱', title: 'Starter' },
            { count: 15, label: '15x Goals', icon: '⚡', title: 'Consistent' },
            { count: 30, label: '30x Goals', icon: '👑', title: 'Titan' },
            { count: 50, label: '50x Goals', icon: '🏆', title: 'Legend' },
          ].map((milestone) => {
            const isReached = stats.totalGoalsReached >= milestone.count;
            return (
              <div
                key={milestone.count}
                className={`p-2 rounded-xl border text-center transition-all ${
                  isReached
                    ? 'bg-white dark:bg-slate-800 border-amber-300 dark:border-amber-600 shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-60'
                }`}
              >
                <div className="text-base">{milestone.icon}</div>
                <div className="text-[10px] font-black text-slate-900 dark:text-white mt-0.5">
                  {milestone.label}
                </div>
                <div className="text-[8.5px] font-extrabold">
                  {isReached ? (
                    <span className="text-emerald-600 dark:text-emerald-400">✓ Done</span>
                  ) : (
                    <span className="text-slate-400">
                      {stats.totalGoalsReached}/{milestone.count}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
