import React, { useState, useMemo } from 'react';
import { Flame, Trophy, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import {
  LearningStreakState,
  LEARNING_STREAK_MILESTONES,
  getLocalDateKey,
  getNextStreakMilestone,
} from '../services/learningStreakService';

interface LearningStreakCardProps {
  streak: LearningStreakState;
  seniorMode?: boolean;
  recentMilestoneNotice?: string | null;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const LearningStreakCard: React.FC<LearningStreakCardProps> = ({
  streak,
  seniorMode = false,
  recentMilestoneNotice = null,
}) => {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getLocalDateKey(today), [today]);

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [showCalendar, setShowCalendar] = useState(true);

  const completedSet = useMemo(() => new Set(streak.completedDates), [streak.completedDates]);

  const monthMeta = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const label = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const cells: Array<{ day: number | null; dateKey: string | null }> = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: null, dateKey: null });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      cells.push({ day, dateKey: `${viewYear}-${mStr}-${dStr}` });
    }
    return { label, cells };
  }, [viewYear, viewMonth]);

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (isCurrentMonth) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const nextMilestone = getNextStreakMilestone(streak.currentStreak, streak.claimedMilestones);
  const progressPct = nextMilestone
    ? Math.min(100, Math.round((streak.currentStreak / nextMilestone.days) * 100))
    : 100;

  return (
    <section
      aria-label="Daily Learning Streak"
      className="bg-white rounded-3xl p-4 border border-rose-200/80 shadow-xs space-y-3"
    >
      {/* Top Row: Title + Current & Best Streak */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
            <Flame className="w-5 h-5 text-rose-500 fill-rose-500/20" />
          </div>
          <div className="min-w-0">
            <h2 className={`font-black text-slate-900 leading-tight truncate ${seniorMode ? 'text-base' : 'text-sm'}`}>
              {seniorMode ? 'روزانہ سیکھنے کا سلسلہ' : 'Daily Learning Streak'}
            </h2>
            <p className="text-[11px] font-medium text-slate-500 truncate">
              {streak.completedToday
                ? seniorMode
                  ? 'آج کا سبق مکمل ہو گیا ✓'
                  : 'Completed today ✓ Come back tomorrow'
                : seniorMode
                  ? 'آج کوئی بھی سبق یا کوئز مکمل کریں'
                  : 'Complete any lesson or quiz today'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCalendar((v) => !v)}
          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>{showCalendar ? 'Hide' : 'Calendar'}</span>
        </button>
      </div>

      {/* Milestone celebration toast inline */}
      {recentMilestoneNotice && (
        <div className="px-3 py-2 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{recentMilestoneNotice}</span>
        </div>
      )}

      {/* Compact Stats Row */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl bg-rose-50/70 border border-rose-100 px-3 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
              {seniorMode ? 'موجودہ سلسلہ' : 'Current Streak'}
            </span>
            <span className="text-lg font-black text-slate-900 leading-none">
              {streak.currentStreak}{' '}
              <span className="text-xs font-bold text-slate-500">
                {streak.currentStreak === 1 ? 'day' : 'days'}
              </span>
            </span>
          </div>
          <Flame
            className={`w-5 h-5 ${
              streak.completedToday ? 'text-rose-500 fill-rose-500' : 'text-rose-300'
            }`}
          />
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/80 px-3 py-2.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              {seniorMode ? 'بہترین سلسلہ' : 'Best Streak'}
            </span>
            <span className="text-lg font-black text-slate-900 leading-none">
              {streak.bestStreak}{' '}
              <span className="text-xs font-bold text-slate-500">
                {streak.bestStreak === 1 ? 'day' : 'days'}
              </span>
            </span>
          </div>
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
      </div>

      {/* Fair Learning Milestone Progress (free in-app points, no cash promise) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-slate-700">
            {nextMilestone
              ? `Next milestone: ${nextMilestone.days} days (+${nextMilestone.points} in-app pts)`
              : 'All 30-day learning milestones unlocked!'}
          </span>
          <span className="font-extrabold text-rose-600">
            {nextMilestone ? `${Math.min(streak.currentStreak, nextMilestone.days)}/${nextMilestone.days}` : '100%'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-rose-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span>Free learning milestones: {LEARNING_STREAK_MILESTONES.map((m) => `${m.days}d`).join(' · ')}</span>
          {streak.completedToday && (
            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
              <CheckCircle2 className="w-3 h-3" />
              Today saved
            </span>
          )}
        </div>
      </div>

      {/* Compact Monthly Calendar */}
      {showCalendar && (
        <div className="pt-2.5 border-t border-rose-100/80 space-y-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="p-1 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-extrabold text-slate-800">{monthMeta.label}</span>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className={`p-1 rounded-lg transition-colors ${
                isCurrentMonth
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((wd, idx) => (
              <span key={idx} className="text-[10px] font-bold text-slate-400 py-0.5">
                {wd}
              </span>
            ))}

            {monthMeta.cells.map((cell, idx) => {
              if (!cell.day || !cell.dateKey) {
                return <div key={`empty-${idx}`} className="h-7" />;
              }

              const isDone = completedSet.has(cell.dateKey);
              const isToday = cell.dateKey === todayKey;

              return (
                <div
                  key={cell.dateKey}
                  title={isDone ? `${cell.dateKey}: Learning completed` : cell.dateKey}
                  className={`h-7 rounded-lg flex items-center justify-center text-[11px] font-bold transition-colors ${
                    isDone
                      ? 'bg-rose-500 text-white shadow-2xs'
                      : isToday
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-400'
                        : 'text-slate-600'
                  }`}
                >
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
