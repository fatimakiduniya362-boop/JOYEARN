import React from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Flame,
  Award,
  Sparkles,
  X,
  Target,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface DailyGoalsCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  streakDays: number;
  todayActivitiesCount: number; // 0 to 5
  seniorMode?: boolean;
}

export const DailyGoalsCalendarModal: React.FC<DailyGoalsCalendarModalProps> = ({
  isOpen,
  onClose,
  streakDays,
  todayActivitiesCount,
  seniorMode = false,
}) => {
  const { light } = useHaptics();

  if (!isOpen) return null;

  // Generate the past 7 days ending with today
  const days = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const isToday = i === 0;
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = d.getDate();

    // Determine completion status:
    // For today: depends on todayActivitiesCount >= 5
    // For past days: uses streakDays or stored completions
    let isCompleted = false;
    if (isToday) {
      isCompleted = todayActivitiesCount >= 5;
    } else {
      // If i days ago falls within the unbroken streak
      isCompleted = streakDays > i;
    }

    days.push({
      dateStr,
      dayName,
      dayNumber,
      isToday,
      isCompleted,
      activitiesCompleted: isToday ? todayActivitiesCount : (isCompleted ? 5 : Math.max(0, 5 - i * 2)),
    });
  }

  const completedCount = days.filter((d) => d.isCompleted).length;

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border-2 border-emerald-400 dark:border-emerald-600 rounded-3xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner">
              📅
            </div>
            <div>
              <h3 className={`font-black text-white ${seniorMode ? 'text-lg' : 'text-base'}`}>
                {seniorMode ? '7 روزہ سرگرمیوں کا کیلنڈر' : '7-Day Goals Calendar'}
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium">
                {seniorMode ? 'گزشتہ 7 دنوں کا 5 سرگرمیوں کا ریکارڈ' : 'Past week 5-activity daily threshold view'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold tap-bounce shadow-xs"
            title="Close Calendar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Streak & Consistency Summary */}
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/80 text-orange-600 flex items-center justify-center text-base border border-orange-200 dark:border-orange-800">
              <Flame className="w-4 h-4 fill-orange-500 text-orange-500" />
            </div>
            <div>
              <span className="font-black text-slate-900 dark:text-white block text-xs">
                {seniorMode ? `${streakDays} دن کا مسلسل اسٹریک` : `${streakDays}-Day Unbroken Streak`}
              </span>
              <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                {completedCount} of 7 days completed (5/5 goals)
              </span>
            </div>
          </div>

          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white shadow-2xs">
            {completedCount === 7 ? 'Perfect Week ⭐' : `${Math.round((completedCount / 7) * 100)}% Consistency`}
          </span>
        </div>

        {/* 7-Day Simple Grid of Circular Checkmarks */}
        <div className="p-4 space-y-4">
          <div className="text-center space-y-0.5">
            <h4 className="font-black text-xs text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Weekly Activity Goal Checkmarks
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Each circle turns green with a checkmark when 5/5 activities are finished
            </p>
          </div>

          {/* 7 Circular Checkmarks Grid */}
          <div className="grid grid-cols-7 gap-2 text-center">
            {days.map((day) => (
              <div
                key={day.dateStr}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                  day.isToday
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-300 dark:ring-emerald-700 shadow-xs'
                    : day.isCompleted
                    ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                    : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-80'
                }`}
              >
                {/* Day Initial / Name */}
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                  {day.dayName}
                </span>

                {/* Circular Checkmark Badge */}
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform ${
                    day.isCompleted
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                      : day.isToday
                      ? 'bg-white dark:bg-slate-800 border-2 border-dashed border-emerald-400 text-emerald-600'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
                  }`}
                  title={`${day.dateStr}: ${day.isCompleted ? '5/5 Completed' : `${day.activitiesCompleted}/5 activities`}`}
                >
                  {day.isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-600 text-white" />
                  ) : day.isToday ? (
                    <span className="text-[10px] font-black">{day.activitiesCompleted}/5</span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400">○</span>
                  )}
                </div>

                {/* Day Date Number */}
                <span
                  className={`text-[10px] font-bold ${
                    day.isToday
                      ? 'text-emerald-700 dark:text-emerald-300 font-black'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {day.dayNumber}
                  {day.isToday && <span className="block text-[8px] font-black uppercase text-emerald-600">Today</span>}
                </span>
              </div>
            ))}
          </div>

          {/* Today's Live Status Box */}
          <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-bold">
              <span className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-emerald-600" />
                <span>Today's Progress:</span>
              </span>
              <span className={`font-black ${todayActivitiesCount >= 5 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {todayActivitiesCount}/5 Activities
              </span>
            </div>

            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, (todayActivitiesCount / 5) * 100)}%` }}
              />
            </div>

            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 pt-0.5">
              {todayActivitiesCount >= 5
                ? '🎉 Congratulations! You have completed all 5 activities today.'
                : `Complete ${5 - todayActivitiesCount} more activity to earn today's circular checkmark!`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center">
          <button
            onClick={() => {
              soundService.playClick();
              onClose();
            }}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs tap-bounce"
          >
            {seniorMode ? 'سمجھ آ گیا' : 'Got It'}
          </button>
        </div>
      </div>
    </div>
  );
};
