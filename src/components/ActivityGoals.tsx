import React, { useState, useEffect } from 'react';
import {
  Trophy,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Gift,
  HelpCircle,
  PlayCircle,
  RotateCw,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Flame,
  ShieldCheck
} from 'lucide-react';
import { soundService } from '../services/soundService';
import { hapticService } from '../services/haptics';

export interface ActivityGoalsProps {
  completedActivitiesCount: number;
  target?: number;
  quizCompleted: boolean;
  videoWatched: boolean;
  wheelSpun: boolean;
  chestClaimed: boolean;
  taskCompleted: boolean;
  onOpenQuiz: () => void;
  onOpenVideos: () => void;
  onOpenWheel: () => void;
  onOpenChest: () => void;
  onOpenTasks: () => void;
  onClaimGoalReward: (points: number) => void;
  seniorMode: boolean;
  currentPoints?: number;
}

export const ActivityGoals: React.FC<ActivityGoalsProps> = ({
  completedActivitiesCount,
  target = 5,
  quizCompleted,
  videoWatched,
  wheelSpun,
  chestClaimed,
  taskCompleted,
  onOpenQuiz,
  onOpenVideos,
  onOpenWheel,
  onOpenChest,
  onOpenTasks,
  onClaimGoalReward,
  seniorMode,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const todayDateStr = new Date().toISOString().slice(0, 10);
  
  // Check if today's reward has already been claimed
  const [rewardClaimed, setRewardClaimed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(`joyearn_goal_reward_claimed_${todayDateStr}`) === 'true';
    } catch {
      return false;
    }
  });

  const [claimSuccessAnim, setClaimSuccessAnim] = useState(false);
  const [justCompletedGoalAnim, setJustCompletedGoalAnim] = useState(false);

  // Sync state if date changes
  useEffect(() => {
    try {
      const isClaimed = localStorage.getItem(`joyearn_goal_reward_claimed_${todayDateStr}`) === 'true';
      setRewardClaimed(isClaimed);
    } catch {}
  }, [todayDateStr]);

  const count = Math.min(target, Math.max(0, completedActivitiesCount));
  const percentage = Math.round((count / target) * 100);
  const isTargetMet = count >= target;
  const remaining = Math.max(0, target - count);

  // Detect transition to target (5th activity completed) to trigger satisfying celebration animation
  const prevCountRef = React.useRef(count);
  useEffect(() => {
    if (count >= target && prevCountRef.current < target) {
      setJustCompletedGoalAnim(true);
      soundService.playDailyGoalCheer();
      hapticService.success();
      const t = setTimeout(() => setJustCompletedGoalAnim(false), 3500);
      return () => clearTimeout(t);
    }
    prevCountRef.current = count;
  }, [count, target]);

  // Claim Reward Handler
  const handleClaimReward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isTargetMet || rewardClaimed) return;

    soundService.playFanfare();
    soundService.playDailyGoalCheer();
    soundService.playStreakFlame();
    hapticService.success();

    const bonusAmount = 100;
    try {
      localStorage.setItem(`joyearn_goal_reward_claimed_${todayDateStr}`, 'true');
    } catch {}

    setRewardClaimed(true);
    setClaimSuccessAnim(true);
    onClaimGoalReward(bonusAmount);

    setTimeout(() => {
      setClaimSuccessAnim(false);
    }, 4000);
  };

  const activities = [
    {
      id: 'quiz',
      name: seniorMode ? 'روزانہ 5 سوالات کا کوئز' : 'Daily 5-Question Quiz',
      icon: HelpCircle,
      isDone: quizCompleted,
      action: onOpenQuiz,
      rewardText: '+30 Pts',
      ctaText: seniorMode ? 'کوئز کھیلیں' : 'Take Quiz'
    },
    {
      id: 'video',
      name: seniorMode ? 'تعلیمی ویڈیو دیکھیں' : 'Watch Educational Video',
      icon: PlayCircle,
      isDone: videoWatched,
      action: onOpenVideos,
      rewardText: '+20 Pts',
      ctaText: seniorMode ? 'ویڈیو دیکھیں' : 'Watch Video'
    },
    {
      id: 'wheel',
      name: seniorMode ? 'روزانہ لکی وہیل گھمائیں' : 'Lucky Wheel Daily Spin',
      icon: RotateCw,
      isDone: wheelSpun,
      action: onOpenWheel,
      rewardText: '+10-50 Pts',
      ctaText: seniorMode ? 'اسپن کریں' : 'Spin Wheel'
    },
    {
      id: 'chest',
      name: seniorMode ? 'روزانہ اسٹریک چیسٹ باکس' : 'Daily Streak Reward Chest',
      icon: Gift,
      isDone: chestClaimed,
      action: onOpenChest,
      rewardText: '+25 Pts',
      ctaText: seniorMode ? 'چیسٹ کھولیں' : 'Open Chest'
    },
    {
      id: 'task',
      name: seniorMode ? 'کمیونٹی ٹاسک یا ریفرل' : 'Community Task or Referral',
      icon: ClipboardList,
      isDone: taskCompleted,
      action: onOpenTasks,
      rewardText: '+50 Pts',
      ctaText: seniorMode ? 'ٹاسک دیکھیں' : 'View Tasks'
    }
  ];

  return (
    <div className="w-full bg-white dark:bg-slate-900 border-2 border-amber-300/80 dark:border-amber-500/40 rounded-3xl p-4 shadow-lg transition-all space-y-3 relative overflow-hidden">
      {/* Background ambient badge visual */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-xl pointer-events-none" />

      {/* Main Row: Progress Ring & Header Summary */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Circular SVG Progress Ring with Smooth Stroke-Dasharray Transition */}
          <div className={`relative w-13 h-13 shrink-0 flex items-center justify-center transition-transform duration-500 ${
            justCompletedGoalAnim ? 'scale-115' : ''
          }`}>
            {isTargetMet && (
              <div className={`absolute inset-0 rounded-full bg-emerald-500/25 blur-md pointer-events-none ${
                justCompletedGoalAnim ? 'animate-ping duration-1000 bg-emerald-400/40' : 'animate-pulse'
              }`} />
            )}
            {justCompletedGoalAnim && (
              <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 animate-ping opacity-75 pointer-events-none" />
            )}
            <svg className="w-13 h-13 -rotate-90 transform" viewBox="0 0 44 44">
              {/* Background Track Circle */}
              <circle
                className="text-slate-100 dark:text-slate-800"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                r="18"
                cx="22"
                cy="22"
              />
              {/* Animated Foreground Progress Circle with smooth stroke-dasharray transition */}
              <circle
                className={
                  isTargetMet
                    ? 'text-emerald-500'
                    : count >= 3
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }
                strokeWidth={isTargetMet ? 5 : 4}
                strokeDasharray="113.1"
                strokeDashoffset={113.1 - (113.1 * percentage) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                r="18"
                cx="22"
                cy="22"
                style={{
                  strokeDasharray: isTargetMet ? '113.1 0' : `${Math.max(4, (113.1 * percentage) / 100)} 113.1`,
                  strokeDashoffset: isTargetMet ? 0 : 113.1 - (113.1 * percentage) / 100,
                  transition: 'stroke-dasharray 1.25s cubic-bezier(0.34, 1.56, 0.64, 1), stroke-dashoffset 0.95s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.6s ease',
                  filter: isTargetMet
                    ? justCompletedGoalAnim
                      ? 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.95)) drop-shadow(0 0 12px rgba(52, 211, 153, 0.8))'
                      : 'drop-shadow(0 0 5px rgba(16, 185, 129, 0.75))'
                    : undefined,
                }}
              />
            </svg>

            {/* Ring Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {isTargetMet ? (
                <div className="flex flex-col items-center justify-center">
                  <span className={`text-xl ${justCompletedGoalAnim ? 'animate-bounce text-2xl' : 'animate-bounce-subtle'}`}>🏆</span>
                </div>
              ) : (
                <div className="text-center leading-none">
                  <span className="font-black text-xs text-slate-900 dark:text-white">
                    {count}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold block">
                    /{target}
                  </span>
                </div>
              )}
            </div>

            {isTargetMet && (
              <span className="absolute -top-1 -right-1 text-xs animate-spin-slow pointer-events-none">✨</span>
            )}
            {justCompletedGoalAnim && (
              <span className="absolute -bottom-1 -left-1 text-xs animate-bounce pointer-events-none">🎉</span>
            )}
          </div>

          {/* Text Title & Subtitle */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-sm text-slate-900 dark:text-white truncate flex items-center gap-1">
                <span>{seniorMode ? 'روزانہ سرگرمیوں کا ہدف' : 'Daily Activity Goals'}</span>
              </h3>
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${
                  isTargetMet
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                    : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700'
                }`}
              >
                {isTargetMet
                  ? seniorMode
                    ? 'ہدف مکمل! 5/5'
                    : 'Goal Met (5/5) 🎉'
                  : `${percentage}% • ${count}/${target}`}
              </span>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mt-0.5">
              {isTargetMet
                ? seniorMode
                  ? 'مبارک ہو! تمام 5 سرگرمیاں مکمل ہو گئیں۔ اپنا انعام کلیم کریں!'
                  : 'All 5 daily activities completed! Claim your target bonus below.'
                : seniorMode
                ? `بونس حاصل کرنے کے لیے مزید ${remaining} سرگرمیاں مکمل کریں`
                : `Complete ${remaining} more ${remaining === 1 ? 'activity' : 'activities'} to unlock +100 JoyPoints`}
            </p>
          </div>
        </div>

        {/* Claim Button / Toggle Drawer Button */}
        <div className="shrink-0 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setIsExpanded((prev) => !prev);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 tap-bounce"
            aria-label="Toggle Activity Goals breakdown"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* CLAIM REWARD INTERACTION (Target Met) */}
      {isTargetMet && (
        <div className="pt-1">
          {!rewardClaimed ? (
            <button
              type="button"
              onClick={handleClaimReward}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-500 hover:from-amber-600 hover:to-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-amber-500/30 text-xs sm:text-sm tap-bounce flex items-center justify-between gap-2 border-2 border-white/40 animate-pulse hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-base">
                  🎁
                </div>
                <div className="text-left">
                  <div className="leading-tight">
                    {seniorMode ? 'ہدف کا انعام کلیم کریں (+100 پوائنٹس) 🎉' : 'Claim Daily Goal Reward 🎉'}
                  </div>
                  <div className="text-[10px] text-amber-100 font-bold">
                    {seniorMode ? 'تمام 5 سرگرمیاں مکمل کرنے پر خصوصی بونس' : '5/5 activities milestone achieved!'}
                  </div>
                </div>
              </div>
              <div className="bg-white text-slate-900 font-black px-2.5 py-1 rounded-xl text-xs shadow-xs shrink-0 flex items-center gap-1">
                <span>+100 Pts</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </button>
          ) : (
            <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-black text-emerald-900 dark:text-emerald-200 block">
                    {seniorMode ? 'آج کا ہدف بونس کلیم ہو چکا ہے (+100 Pts)' : 'Daily Target Reward Claimed! (+100 Pts Earned)'}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300">
                    {seniorMode ? 'اگلا بونس رات 12:00 بجے ری سیٹ ہوگا' : 'Next goal reward resets tonight at midnight (12:00 AM)'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-emerald-300">
                Claimed ✓
              </span>
            </div>
          )}
        </div>
      )}

      {/* Interactive 5-Activity Checklist Breakdown (Shown when expanded or when not yet completed) */}
      <div className={`space-y-2 transition-all ${isExpanded ? 'block pt-1' : 'hidden'}`}>
        <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <span>{seniorMode ? 'سرگرمیوں کی فہرست (5 روزانہ)' : '5 Daily Goal Activities'}</span>
          <span>{count} / 5 Done</span>
        </div>

        <div className="grid grid-cols-1 gap-1.5">
          {activities.map((act) => {
            const Icon = act.icon;
            return (
              <div
                key={act.id}
                onClick={() => {
                  if (!act.isDone) {
                    soundService.playClick();
                    act.action();
                  }
                }}
                className={`p-2 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                  act.isDone
                    ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-80 cursor-default'
                    : 'bg-white dark:bg-slate-800/90 border-slate-200 dark:border-slate-700 hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer tap-bounce shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                      act.isDone
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                      {act.name}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">
                      {act.rewardText}
                    </span>
                  </div>
                </div>

                <div className="shrink-0">
                  {act.isDone ? (
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{seniorMode ? 'مکمل' : 'Done'}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        soundService.playClick();
                        act.action();
                      }}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] rounded-xl tap-bounce flex items-center gap-1 shadow-xs"
                    >
                      <span>{act.ctaText}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info Badge */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
        <span className="flex items-center gap-1">
          <Flame className="w-3 h-3 text-orange-500" />
          <span>Resets every midnight • Streak protected</span>
        </span>
        <button
          type="button"
          onClick={() => {
            soundService.playClick();
            setIsExpanded((prev) => !prev);
          }}
          className="text-amber-600 dark:text-amber-400 font-extrabold hover:underline"
        >
          {isExpanded ? (seniorMode ? 'چھپائیں' : 'Show Less') : (seniorMode ? 'تفصیلات دیکھیں' : 'View Checklist')}
        </button>
      </div>
    </div>
  );
};
