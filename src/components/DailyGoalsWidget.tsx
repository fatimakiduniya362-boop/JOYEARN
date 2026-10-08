import React from 'react';
import {
  Target,
  Sparkles,
  Gift,
  Calendar,
  ChevronRight,
  Flame,
  CheckCircle2
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface DailyGoalsWidgetProps {
  completedActivitiesCount: number; // 0 to 5
  streakDays: number;
  seniorMode?: boolean;
  onOpenCalendarModal?: () => void;
  onRewardsReadyClick?: () => void;
}

export const DailyGoalsWidget: React.FC<DailyGoalsWidgetProps> = ({
  completedActivitiesCount,
  streakDays,
  seniorMode = false,
  onOpenCalendarModal,
  onRewardsReadyClick,
}) => {
  const { light, success } = useHaptics();

  const count = Math.min(5, Math.max(0, completedActivitiesCount));
  const percentage = Math.round((count / 5) * 100);
  const isRewardsReady = count >= 5;

  const handleWidgetClick = () => {
    soundService.playClick();
    light();
    if (isRewardsReady && onRewardsReadyClick) {
      onRewardsReadyClick();
    } else if (onOpenCalendarModal) {
      onOpenCalendarModal();
    }
  };

  return (
    <section className="px-4 py-1.5">
      <div
        className={`bg-white dark:bg-slate-900 border-2 rounded-3xl p-3.5 shadow-md transition-all relative overflow-hidden ${
          isRewardsReady
            ? 'border-emerald-400 dark:border-emerald-500/80 ring-2 ring-emerald-300/40 shadow-emerald-500/10'
            : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        {/* Subtle Ambient Background Glow */}
        {isRewardsReady && (
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-400/15 rounded-full blur-xl pointer-events-none" />
        )}

        {/* Top Header Row: Title & Threshold & Calendar Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-xs shrink-0 transition-colors ${
                isRewardsReady
                  ? 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white animate-bounce-subtle'
                  : 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400'
              }`}
            >
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className={`font-black text-slate-900 dark:text-white ${seniorMode ? 'text-base' : 'text-xs sm:text-sm'}`}>
                  {seniorMode ? 'روزانہ اہداف' : 'Daily Goals'}
                </h4>
                <span className="text-[10px] font-extrabold px-2 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {count}/5 Threshold
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                {seniorMode
                  ? '5 روزانہ تعلیمی سرگرمیوں کی تکمیل'
                  : 'Complete 5 learning activities to unlock today’s rewards'}
              </p>
            </div>
          </div>

          {/* 7-Day Calendar Modal Trigger Button */}
          {onOpenCalendarModal && (
            <button
              type="button"
              onClick={() => {
                soundService.playClick();
                light();
                onOpenCalendarModal();
              }}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-[10.5px] font-black border border-slate-200 dark:border-slate-700 flex items-center gap-1 tap-bounce shrink-0"
              title="View 7-day circular checkmarks calendar"
            >
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>{seniorMode ? '7 دن کا ریکارڈ' : '7-Day View'}</span>
            </button>
          )}
        </div>

        {/* Clean Horizontal Progress Bar */}
        <div className="space-y-1 pt-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-600 dark:text-slate-300">
              {isRewardsReady ? 'Goal Completed 🎉' : `Progress: ${count} of 5 Completed`}
            </span>
            <span className={`font-black ${isRewardsReady ? 'text-emerald-600 font-extrabold' : 'text-indigo-600 dark:text-indigo-400'}`}>
              {percentage}%
            </span>
          </div>

          <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/70 dark:border-slate-750">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isRewardsReady
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 shadow-sm animate-pulse-subtle'
                  : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Rewards Ready Indicator Banner when 5/5 activities are finished */}
        {isRewardsReady ? (
          <div
            onClick={handleWidgetClick}
            className="mt-2.5 p-2.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-2xl flex items-center justify-between gap-2 shadow-md cursor-pointer hover:brightness-105 tap-bounce animate-in fade-in"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-white/25 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-white tracking-wide uppercase">
                    🎁 Rewards Ready!
                  </span>
                  <span className="text-[9px] bg-white/30 text-white font-extrabold px-1.5 py-0.2 rounded-full">
                    5/5 Done
                  </span>
                </div>
                <p className="text-[10px] text-emerald-100 font-medium truncate">
                  {seniorMode
                    ? 'تمام 5 اہداف مکمل! انعامات وصول کریں'
                    : '5-activity threshold reached • Tap to claim bonus JoyPoints'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white text-emerald-900 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-xs shrink-0">
              <span>Claim</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>{5 - count} more activity needed for today's Rewards Ready status</span>
            </span>
            <span className="font-bold text-slate-600 dark:text-slate-300">
              Streak: {streakDays}d 🔥
            </span>
          </div>
        )}
      </div>
    </section>
  );
};
