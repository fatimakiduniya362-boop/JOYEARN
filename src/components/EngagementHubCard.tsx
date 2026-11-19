import React from 'react';
import {
  Award,
  BookOpen,
  Calendar,
  ChevronRight,
  Shield,
  Sparkles,
  Trophy,
  Layers,
} from 'lucide-react';
import {
  getCosmeticBadges,
  getLevelForPoints,
  getLocalWeeklyPoints,
  getTodayTheme,
  KNOWLEDGE_CARDS,
  loadFinishedCategories,
  loadStreakShieldState,
  loadUnlockedCardIds,
} from '../services/engagementService';
import { soundService } from '../services/soundService';

export type EngagementModalTab = 'levels' | 'album' | 'courses' | 'weekly' | 'events' | null;

interface EngagementHubCardProps {
  uid: string;
  totalPoints: number;
  streakDays: number;
  quizzesCompletedCount: number;
  seniorMode: boolean;
  onOpenModal: (tab: EngagementModalTab) => void;
  onOpenLearn: () => void;
}

export const EngagementHubCard: React.FC<EngagementHubCardProps> = ({
  uid,
  totalPoints,
  streakDays,
  quizzesCompletedCount,
  seniorMode,
  onOpenModal,
  onOpenLearn,
}) => {
  const todayTheme = getTodayTheme();
  const levelInfo = getLevelForPoints(totalPoints);
  const finishedCats = loadFinishedCategories(uid);
  const badges = getCosmeticBadges({
    streakDays,
    finishedCategoriesCount: finishedCats.length,
    quizzesCompletedCount,
  });
  const unlockedBadgesCount = badges.filter((b) => b.unlocked).length;
  const shieldState = loadStreakShieldState(uid);
  const unlockedCardsCount = loadUnlockedCardIds(uid).length;
  const weeklyPts = getLocalWeeklyPoints(uid);

  return (
    <section className="px-4 py-2 max-w-lg mx-auto w-full space-y-3">
      {/* 1. TODAY'S THEME CARD (Mon-Sun rotating theme + matching tip) */}
      <div
        className={`bg-gradient-to-r ${todayTheme.gradient} rounded-3xl p-4 text-white shadow-md relative overflow-hidden`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0 shadow-inner">
              {todayTheme.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  {seniorMode ? 'آج کا موضوع' : "Today's Theme"} • {todayTheme.dayName}
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base mt-1 leading-tight">
                {seniorMode ? todayTheme.urduTitle : todayTheme.title}
              </h3>
              <p className="text-xs text-white/90 mt-1 leading-relaxed">
                {seniorMode ? todayTheme.urduTip : todayTheme.tip}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between">
          <span className="text-[11px] font-bold text-white/85">
            {seniorMode ? 'آج کا مشورہ • سیکھنا جاری رکھیں' : 'Daily Tip • Explore matching quizzes'}
          </span>
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenLearn();
            }}
            className="px-3 py-1 bg-white text-slate-900 hover:bg-slate-100 rounded-xl text-[11px] font-black tap-bounce flex items-center gap-1 shadow-xs"
          >
            <span>{seniorMode ? 'کوئز کھولیں' : 'Explore'}</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. LEVELS, COSMETIC BADGES, STREAK SHIELD & LEARNING EXTRAS HUB */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200/90 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Level & Shield Top Row */}
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('levels');
            }}
            className="flex items-center gap-2.5 text-left tap-bounce min-w-0"
          >
            <div
              className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${levelInfo.current.colorClass} text-white flex items-center justify-center text-xl shadow-sm shrink-0`}
            >
              {levelInfo.current.emoji}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-slate-900 dark:text-white truncate">
                  {levelInfo.current.name}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                  {unlockedBadgesCount}/{badges.length} Badges
                </span>
              </div>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                {levelInfo.next
                  ? `${levelInfo.pointsToNext.toLocaleString()} pts to ${levelInfo.next.name} (cosmetic)`
                  : 'Top Master Rank reached (cosmetic)'}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('levels');
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-sky-50 dark:bg-sky-950/70 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200 text-[11px] font-black flex items-center gap-1 tap-bounce shrink-0"
            title="Streak Shield (Earned at 7-day streak, max 2 stored)"
          >
            <Shield className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{shieldState.shields}/2</span>
          </button>
        </div>

        {/* Cosmetic Level Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${levelInfo.current.colorClass} rounded-full transition-all duration-500`}
            style={{ width: `${Math.max(4, levelInfo.progressPercent)}%` }}
          />
        </div>

        {/* Quick Launch Grid for the 5 Engagement Features */}
        <div className="grid grid-cols-2 gap-2 pt-0.5">
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('album');
            }}
            className="p-2.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100/70 border border-emerald-200/80 dark:border-emerald-800/60 text-left tap-bounce flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                Knowledge Album
              </div>
              <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold">
                {unlockedCardsCount}/{KNOWLEDGE_CARDS.length} Cards
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('courses');
            }}
            className="p-2.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100/70 border border-amber-200/80 dark:border-amber-800/60 text-left tap-bounce flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                30-Day Courses
              </div>
              <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">
                3 Courses • Cert
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('weekly');
            }}
            className="p-2.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100/70 border border-indigo-200/80 dark:border-indigo-800/60 text-left tap-bounce flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                Weekly Challenge
              </div>
              <div className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold">
                {weeklyPts} Pts This Week
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              onOpenModal('events');
            }}
            className="p-2.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100/70 border border-rose-200/80 dark:border-rose-800/60 text-left tap-bounce flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                Event Quizzes
              </div>
              <div className="text-[10px] text-rose-700 dark:text-rose-300 font-bold">
                Ramadan, Eid & More
              </div>
            </div>
          </button>
        </div>

        {/* Levels & Badges Footer Button */}
        <button
          type="button"
          onClick={() => {
            soundService.playClick();
            onOpenModal('levels');
          }}
          className="w-full py-2 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-700 dark:text-slate-200 flex items-center justify-between tap-bounce"
        >
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-500" />
            <span>Levels, Cosmetic Badges & Streak Shield</span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        </button>
      </div>
    </section>
  );
};
