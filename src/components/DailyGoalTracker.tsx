import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Flame,
  PartyPopper,
  Sparkles,
  Trophy,
  Star,
  ChevronRight,
  Target,
  ArrowRight,
  Clock
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

export interface DayGoalStatus {
  dayName: string;
  dayShort: string;
  dateStr: string;
  activitiesCount: number;
  goalMet: boolean;
  isToday: boolean;
  isFuture: boolean;
}

interface DailyGoalTrackerProps {
  todayActivitiesCount: number;
  dailyGoalTarget?: number;
  streakDays: number;
  seniorMode?: boolean;
  onOpenLearn?: () => void;
  onOpenWatch?: () => void;
  onTriggerConfetti?: () => void;
}

export const DailyGoalTracker: React.FC<DailyGoalTrackerProps> = ({
  todayActivitiesCount,
  dailyGoalTarget = 5,
  streakDays,
  seniorMode = false,
  onOpenLearn,
  onOpenWatch,
  onTriggerConfetti,
}) => {
  const [weekDays, setWeekDays] = useState<DayGoalStatus[]>([]);
  const [hasCelebratedToday, setHasCelebratedToday] = useState(false);

  // Load or generate 7-day rolling calendar history
  useEffect(() => {
    try {
      const STORAGE_KEY = 'joyearn_7day_goal_history';
      const stored = localStorage.getItem(STORAGE_KEY);
      let historyMap: Record<string, number> = {};

      if (stored) {
        historyMap = JSON.parse(stored);
      }

      // Ensure today's count is synced
      const now = new Date();
      const todayISO = now.toISOString().split('T')[0];
      historyMap[todayISO] = Math.max(todayActivitiesCount, historyMap[todayISO] || 0);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(historyMap));

      // Build rolling 7 days: [today - 6, ..., today]
      const daysOfWeekShort = seniorMode
        ? ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const daysOfWeekFull = seniorMode
        ? ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ']
        : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      const generated: DayGoalStatus[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const dayIdx = d.getDay();

        let count = historyMap[iso];
        // If no prior record for past days in a streak, seed based on active streak
        if (count === undefined) {
          if (i === 0) {
            count = todayActivitiesCount;
          } else if (i <= streakDays) {
            // Part of the active streak, so goal was met
            count = 5 + ((d.getDate() * 3) % 4);
          } else {
            count = (d.getDate() % 4);
          }
          historyMap[iso] = count;
        }

        if (i === 0) {
          count = Math.max(count, todayActivitiesCount);
        }

        generated.push({
          dayName: daysOfWeekFull[dayIdx],
          dayShort: daysOfWeekShort[dayIdx],
          dateStr: `${d.getMonth() + 1}/${d.getDate()}`,
          activitiesCount: count,
          goalMet: count >= dailyGoalTarget,
          isToday: i === 0,
          isFuture: false,
        });
      }

      setWeekDays(generated);
    } catch {
      // Fallback if storage fails
      const fallback: DayGoalStatus[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((short, idx) => ({
        dayName: short,
        dayShort: short,
        dateStr: `D${idx + 1}`,
        activitiesCount: idx === 6 ? todayActivitiesCount : 5,
        goalMet: idx === 6 ? todayActivitiesCount >= dailyGoalTarget : true,
        isToday: idx === 6,
        isFuture: false,
      }));
      setWeekDays(fallback);
    }
  }, [todayActivitiesCount, dailyGoalTarget, streakDays, seniorMode]);

  const goalReachedToday = todayActivitiesCount >= dailyGoalTarget;
  const progressPercent = Math.min(100, Math.round((todayActivitiesCount / dailyGoalTarget) * 100));
  const daysGoalHitCount = weekDays.filter((d) => d.goalMet).length;

  const handleCelebrate = () => {
    soundService.playFanfare();
    hapticService.success();
    setHasCelebratedToday(true);
    onTriggerConfetti?.();
  };

  return (
    <div className="bg-white rounded-3xl border-2 border-emerald-200 p-4 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className={`font-black text-slate-900 ${seniorMode ? 'text-lg' : 'text-sm'}`}>
              {seniorMode ? '7 روزہ اسٹریک اور روزانہ ہدف کیلنڈر' : '7-Day Streak & Daily Goal Tracker'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {seniorMode
                ? 'روزانہ 5 تعلیمی سرگرمیاں مکمل کر کے اسٹریک برقرار رکھیں'
                : 'Hit your 5-activity learning goal daily to fuel your streak'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl">
          <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          <span className="text-xs font-black text-orange-700">
            {streakDays} {seniorMode ? 'دن' : 'Days'}
          </span>
        </div>
      </div>

      {/* 7-DAY STREAK CALENDAR GRID */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 px-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>{seniorMode ? 'گزشتہ 7 دن کی کارکردگی:' : 'Past 7 Days Consistency:'}</span>
          </span>
          <span className="text-emerald-700 font-extrabold">
            {daysGoalHitCount} / 7 {seniorMode ? 'ہدف مکمل' : 'Goals Met'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {weekDays.map((day, idx) => {
            const isHit = day.goalMet;
            const isToday = day.isToday;

            return (
              <div
                key={idx}
                className={`relative rounded-2xl p-2 flex flex-col items-center justify-between text-center transition-all ${
                  isToday
                    ? 'bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-md ring-2 ring-emerald-300 ring-offset-1'
                    : isHit
                    ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                    : 'bg-slate-50 border border-slate-200 text-slate-500'
                }`}
              >
                {/* Day of Week */}
                <span
                  className={`text-[10px] font-black uppercase tracking-tight ${
                    isToday ? 'text-emerald-100' : isHit ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {day.dayShort}
                </span>

                {/* Status Icon */}
                <div className="my-1.5">
                  {isHit ? (
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shadow-2xs ${
                        isToday ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'
                      }`}
                    >
                      <Star className="w-3.5 h-3.5 fill-current" />
                    </div>
                  ) : isToday ? (
                    <div className="w-6 h-6 rounded-full bg-white/20 text-white flex items-center justify-center font-black text-[10px]">
                      {day.activitiesCount}/5
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center font-bold text-[9px]">
                      {day.activitiesCount}/5
                    </div>
                  )}
                </div>

                {/* Date / Count Label */}
                <span
                  className={`text-[9px] font-black ${
                    isToday ? 'text-white' : isHit ? 'text-emerald-800' : 'text-slate-500'
                  }`}
                >
                  {isToday ? (seniorMode ? 'آج' : 'Today') : day.dateStr}
                </span>

                {/* Gold Crown / Star indicator for completed goal */}
                {isHit && (
                  <span className="absolute -top-1 -right-1 text-[10px]">
                    ⭐
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* TODAY'S PROGRESS BAR & STATUS */}
      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>🎯</span>
            <span>{seniorMode ? 'آج کی تعلیمی سرگرمیاں' : "Today's Activities"}</span>
          </span>
          <span
            className={`font-black px-2 py-0.5 rounded-lg border text-xs ${
              goalReachedToday
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}
          >
            {todayActivitiesCount} / {dailyGoalTarget}{' '}
            {seniorMode ? 'مکمل' : 'Completed'}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              goalReachedToday
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                : 'bg-gradient-to-r from-amber-500 to-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Status Callout / Quick Action */}
        {goalReachedToday ? (
          <div className="bg-gradient-to-r from-emerald-100/80 via-teal-50 to-emerald-100/80 border border-emerald-300 rounded-xl p-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-black text-emerald-900">
              <PartyPopper className="w-4 h-4 text-emerald-600" />
              <span>
                {seniorMode
                  ? 'شاباش! آج کا 5 سرگرمیوں کا ہدف مکمل ہو گیا۔'
                  : 'Awesome! 5-Activity Goal Hit for Today! ⭐'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCelebrate}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black rounded-lg shadow-xs tap-bounce flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Confetti</span>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-slate-600 font-semibold">
              {dailyGoalTarget - todayActivitiesCount}{' '}
              {seniorMode
                ? 'مزید سرگرمیاں درکار ہیں'
                : 'more activities needed to lock today\'s star!'}
            </span>
            <div className="flex items-center gap-1.5">
              {onOpenLearn && (
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onOpenLearn();
                  }}
                  className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-lg tap-bounce flex items-center gap-1"
                >
                  <span>Quiz</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
              {onOpenWatch && (
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onOpenWatch();
                  }}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg tap-bounce flex items-center gap-1"
                >
                  <span>Video</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 7-DAY MILESTONE REWARD CARD */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-2.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
            🏆
          </div>
          <div>
            <div className="font-black text-amber-950 text-xs">
              {seniorMode ? '7 روزہ مستقل مزاجی بونس' : '7-Day Consistency Reward'}
            </div>
            <div className="text-[10px] text-amber-800 font-medium">
              {daysGoalHitCount >= 7
                ? seniorMode
                  ? 'تمام 7 دن مکمل! +150 جوائے پوائنٹس کا دعویٰ کریں۔'
                  : 'All 7 days completed! +150 JoyPoints unlocked.'
                : seniorMode
                ? `7 دن مکمل کرنے پر +150 بونس پوائنٹس ملیں گے (${daysGoalHitCount}/7)`
                : `Hit 5 goals for 7 consecutive days for +150 Bonus (${daysGoalHitCount}/7)`}
            </div>
          </div>
        </div>

        <span className="text-[11px] font-black text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-lg border border-amber-300 shrink-0">
          +150 Pts
        </span>
      </div>
    </div>
  );
};
