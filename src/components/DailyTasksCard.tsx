import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Flame,
  Trophy,
  PieChart,
  HelpCircle
} from 'lucide-react';
import {
  MIN_ACTIVE_DAYS,
  setMinActiveDays,
  REWARDS_DISCLAIMER_NOTICE,
  DAILY_TASKS_GOAL_LINE,
  MONTHLY_PRIZE_POOL_POINTS,
  MANDATORY_DAILY_TASKS,
  MandatoryTaskId
} from '../utils/dailyTasksConfig';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import {
  recordTaskCompletionInFirestore,
  recordDailySummaryInFirestore,
  loadUserMonthlySummaries
} from '../services/firestoreService';

interface DailyTasksCardProps {
  completedTaskIds: MandatoryTaskId[];
  onTaskAction: (actionKey: string) => void;
  streakDays: number;
  todayPoints: number;
  seniorMode: boolean;
  userId?: string;
  onCheckInCompleted?: () => void;
}

export const DailyTasksCard: React.FC<DailyTasksCardProps> = ({
  completedTaskIds,
  onTaskAction,
  streakDays,
  todayPoints,
  seniorMode,
  userId,
  onCheckInCompleted,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [minDays, setMinDays] = useState<number>(MIN_ACTIVE_DAYS);
  const { light, success } = useHaptics();

  const handleAdjustMinDays = (delta: number) => {
    soundService.playClick();
    light();
    const updated = setMinActiveDays(minDays + delta);
    setMinDays(updated);
  };

  const now = new Date();
  const todayDateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentMonthStr = now.toISOString().slice(0, 7); // YYYY-MM
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0-based
  const currentDayNum = now.getDate();
  const totalDaysInCurrentMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Load qualifying days from Firestore / local mirror
  const [qualifyingDates, setQualifyingDates] = useState<string[]>([]);
  const [qualifyingPoints, setQualifyingPoints] = useState<number>(0);
  const [totalCommunityPoints, setTotalCommunityPoints] = useState<number>(18500);

  const completedCount = completedTaskIds.length;
  const percentage = Math.round((completedCount / 5) * 100);
  const is100PercentToday = completedCount >= 5;

  // Refresh monthly pool data
  useEffect(() => {
    let active = true;
    const fetchMonthlyData = async () => {
      const data = await loadUserMonthlySummaries(userId || 'guest', currentMonthStr);
      if (active) {
        let dates = [...data.qualifyingDates];
        let points = data.qualifyingPoints;
        if (is100PercentToday && !dates.includes(todayDateStr)) {
          dates.push(todayDateStr);
          points += todayPoints;
        }
        setQualifyingDates(dates);
        setQualifyingPoints(points);
        setTotalCommunityPoints(Math.max(points, data.totalCommunityPoints));
      }
    };

    fetchMonthlyData();
    return () => {
      active = false;
    };
  }, [userId, currentMonthStr, is100PercentToday, todayPoints, todayDateStr]);

  // When all 5 tasks are completed today, record daily 100% summary to Firestore
  useEffect(() => {
    if (is100PercentToday) {
      recordDailySummaryInFirestore(
        userId || 'guest',
        todayDateStr,
        completedTaskIds,
        true,
        todayPoints
      );
    }
  }, [is100PercentToday, completedTaskIds, todayDateStr, userId, todayPoints]);

  const handleTaskClick = async (task: typeof MANDATORY_DAILY_TASKS[0]) => {
    soundService.playClick();
    light();

    if (task.actionKey === 'checkin') {
      if (!completedTaskIds.includes('daily_checkin')) {
        success();
        await recordTaskCompletionInFirestore(userId || 'guest', 'daily_checkin', todayDateStr);
        onCheckInCompleted?.();
      }
      return;
    }

    onTaskAction(task.actionKey);
  };

  // Monthly Pool Calculations
  const qualifyingDaysCount = qualifyingDates.length;
  const isEligibleForMonthlyPayout = qualifyingDaysCount >= minDays;
  const userPoolSharePoints = totalCommunityPoints > 0
    ? Math.round((qualifyingPoints / totalCommunityPoints) * MONTHLY_PRIZE_POOL_POINTS)
    : 0;
  const userPoolShareDollars = (userPoolSharePoints / 1000).toFixed(2);
  const userPoolSharePercent = totalCommunityPoints > 0
    ? ((qualifyingPoints / totalCommunityPoints) * 100).toFixed(2)
    : '0.00';

  return (
    <section className="px-4 py-2">
      <div className="bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-600/70 rounded-3xl p-4 shadow-xl space-y-3.5 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-8 -right-8 w-28 h-28 bg-gradient-to-br from-indigo-500/15 to-purple-500/15 rounded-full blur-xl pointer-events-none" />

        {/* Header: Title, Reset Notice & Streak */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center text-lg shadow-md shrink-0">
              📋
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className={`font-black text-slate-900 dark:text-white ${seniorMode ? 'text-lg' : 'text-sm'}`}>
                  {seniorMode ? 'روزانہ 5 لازمی ٹاسکس' : 'Daily Tasks'}
                </h3>
                <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  Resets at Midnight
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {seniorMode
                  ? 'مہینے کے انعام کے لیے تمام 5 ٹاسکس مکمل کریں'
                  : 'Exactly 5 mandatory tasks reset daily'}
              </p>
            </div>
          </div>

          {/* Current Streak Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-black shrink-0">
            <Flame className="w-3.5 h-3.5 fill-orange-500 text-orange-500" />
            <span>{streakDays}d</span>
          </div>
        </div>

        {/* Progress Bar (0% to 100%) */}
        <div className="space-y-1.5 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs font-black">
            <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <span>{seniorMode ? 'آج کی پیشرفت:' : "Today's Task Progress:"}</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {completedCount}/5 {seniorMode ? 'مکمل' : 'Done'}
              </span>
            </span>
            <span
              className={`text-xs font-extrabold ${
                is100PercentToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {percentage}% {is100PercentToday && '🎉 100% Completed!'}
            </span>
          </div>

          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                is100PercentToday
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : completedCount >= 3
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Clear Line of Text required by Prompt */}
          <p className="text-[11px] font-black text-indigo-950 dark:text-indigo-200 leading-snug pt-0.5">
            📌 {DAILY_TASKS_GOAL_LINE}
          </p>
        </div>

        {/* Exactly 5 Mandatory Tasks List */}
        <div className="space-y-2">
          {MANDATORY_DAILY_TASKS.map((task) => {
            const isDone = completedTaskIds.includes(task.id);

            return (
              <div
                key={task.id}
                onClick={() => handleTaskClick(task)}
                className={`p-2.5 rounded-2xl border-2 flex items-center justify-between gap-2.5 transition-all cursor-pointer tap-bounce ${
                  isDone
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0 shadow-2xs">
                    {task.icon}
                  </div>
                  <div className="min-w-0">
                    <h4
                      className={`font-black text-xs truncate ${
                        isDone
                          ? 'text-emerald-900 dark:text-emerald-200 line-through opacity-85'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {task.number}. {seniorMode ? task.urduTitle : task.title}
                    </h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {seniorMode ? task.urduDescription : task.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {isDone ? (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 text-xs font-black border border-emerald-300 dark:border-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
                      <span>{seniorMode ? 'مکمل' : 'Done'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-600 text-white text-xs font-black shadow-xs hover:bg-indigo-700">
                      <span>{seniorMode ? 'شروع' : 'Go'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Monthly Calendar & Pool Share Summary Toggle */}
        <div className="pt-1">
          <button
            onClick={() => {
              soundService.playClick();
              setShowCalendar(!showCalendar);
            }}
            className="w-full py-2 px-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between text-xs font-black text-indigo-950 dark:text-indigo-200 tap-bounce"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>
                {seniorMode
                  ? `ماہانہ کیلنڈر اور پرائز پول (${qualifyingDaysCount}/${minDays} دن) • سٹریک: ${streakDays} دن`
                  : `Monthly Calendar & Prize Pool (${qualifyingDaysCount}/${minDays} Active Days) • Streak: ${streakDays}d`}
              </span>
            </div>
            {showCalendar ? (
              <ChevronUp className="w-4 h-4 text-indigo-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-600" />
            )}
          </button>

          {/* Collapsible Monthly Calendar & Pool Metrics Section */}
          {showCalendar && (
            <div className="mt-2.5 p-3.5 bg-slate-50 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-black text-xs text-slate-900 dark:text-white">
                      {monthName} Calendar
                    </h4>
                    <span className="flex items-center gap-1 text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-950/80 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-800">
                      <Flame className="w-3 h-3 fill-orange-500" />
                      Current Streak: {streakDays} days
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Green = 100% completed day • Grey = Missed or upcoming
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Editable MIN_ACTIVE_DAYS Stepper */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-0.5 shadow-2xs text-[10px]">
                    <span className="text-slate-500 dark:text-slate-400 font-bold" title="Editable MIN_ACTIVE_DAYS threshold">Min Days:</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustMinDays(-1)}
                      className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center leading-none"
                      title="Decrease MIN_ACTIVE_DAYS"
                    >
                      -
                    </button>
                    <span className="font-black text-indigo-600 dark:text-indigo-400 px-0.5">{minDays}</span>
                    <button
                      type="button"
                      onClick={() => handleAdjustMinDays(1)}
                      className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center leading-none"
                      title="Increase MIN_ACTIVE_DAYS"
                    >
                      +
                    </button>
                  </div>

                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      isEligibleForMonthlyPayout
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                    }`}
                  >
                    {isEligibleForMonthlyPayout
                      ? 'Eligible for Payout ✅'
                      : `Need ${Math.max(0, minDays - qualifyingDaysCount)} more days`}
                  </span>
                </div>
              </div>

              {/* Monthly Calendar Days Grid (Green for completed, Grey for missed) */}
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayInitial, idx) => (
                  <span
                    key={idx}
                    className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500"
                  >
                    {dayInitial}
                  </span>
                ))}

                {Array.from({ length: totalDaysInCurrentMonth }, (_, i) => {
                  const dayNum = i + 1;
                  const dayString = `${currentMonthStr}-${String(dayNum).padStart(2, '0')}`;
                  const isCompleted100 = qualifyingDates.includes(dayString);
                  const isToday = dayNum === currentDayNum;
                  const isPast = dayNum < currentDayNum;

                  let bgClass = 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'; // Default grey for missed/future
                  if (isCompleted100) {
                    bgClass = 'bg-emerald-500 text-white font-black shadow-xs'; // Green for completed
                  } else if (isToday) {
                    bgClass = 'bg-white dark:bg-slate-800 text-indigo-700 font-black border-2 border-indigo-500';
                  } else if (isPast) {
                    bgClass = 'bg-slate-200/90 text-slate-400 dark:bg-slate-750 dark:text-slate-500 line-through opacity-80'; // Grey missed
                  }

                  return (
                    <div
                      key={dayNum}
                      className={`h-7 rounded-lg flex items-center justify-center text-[10px] relative transition-transform ${bgClass}`}
                      title={`${dayString}: ${isCompleted100 ? '100% Completed Day' : isPast ? 'Missed Day' : 'Day ' + dayNum}`}
                    >
                      <span>{dayNum}</span>
                      {isCompleted100 && (
                        <span className="absolute -top-1 -right-1 text-[8px] leading-none">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Monthly Pool Share Calculation Breakdown */}
              <div className="bg-white dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-black text-slate-800 dark:text-white">
                  <span className="flex items-center gap-1">
                    <PieChart className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Estimated Monthly Pool Share:</span>
                  </span>
                  <span className="text-emerald-600 font-extrabold">
                    ~${userPoolShareDollars} USD ({userPoolSharePercent}%)
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span>Your Points from 100% Days:</span>
                    <strong className="text-indigo-600">{qualifyingPoints.toLocaleString()} Pts</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Community Qualifying Points:</span>
                    <span>{totalCommunityPoints.toLocaleString()} Pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Month Prize Pool:</span>
                    <span className="font-bold text-amber-600">
                      {MONTHLY_PRIZE_POOL_POINTS.toLocaleString()} Pts (${(MONTHLY_PRIZE_POOL_POINTS / 1000).toFixed(2)})
                    </span>
                  </div>
                </div>

                <div className="text-[10px] bg-slate-50 dark:bg-slate-800 p-2 rounded-lg text-slate-500 leading-relaxed font-medium">
                  <strong>Calculation Formula:</strong> (Your Points from 100% Completed Days ÷ All Users’ Qualifying Points) × Monthly Ad-Funded Pool. Minimum {minDays} active 100% days required.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mandatory Rewards Disclaimer Notice in Card */}
        <div className="bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-2xl border border-amber-200 dark:border-amber-800/80 flex items-start gap-2 text-[10.5px] text-amber-900 dark:text-amber-200 leading-snug">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="font-bold">
            {REWARDS_DISCLAIMER_NOTICE}
          </p>
        </div>
      </div>
    </section>
  );
};
