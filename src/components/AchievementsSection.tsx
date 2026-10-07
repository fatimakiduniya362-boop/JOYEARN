import React, { useState } from 'react';
import {
  Award,
  Lock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  X,
  Info,
  Trophy,
  Star,
  Share2,
  Download,
  Loader2,
  Check
} from 'lucide-react';
import { AchievementBadge } from '../types';
import { StreakChart } from './StreakChart';
import { shareMilestoneBadge } from '../services/shareImageService';
import { soundService } from '../services/soundService';

interface AchievementsSectionProps {
  completedTasksCount: number;
  completedQuizzesCount: number;
  watchedVideosCount: number;
  activeReferralsCount: number;
  streakDays: number;
  gamesCompletedCount: number;
  seniorMode: boolean;
  userName?: string;
  totalPoints?: number;
}

export const AchievementsSection: React.FC<AchievementsSectionProps> = ({
  completedTasksCount,
  completedQuizzesCount,
  watchedVideosCount,
  activeReferralsCount,
  streakDays,
  gamesCompletedCount,
  seniorMode,
  userName = 'JoyEarn Scholar',
  totalPoints = 0,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<AchievementBadge | null>(null);
  const [showAllModal, setShowAllModal] = useState(false);
  const [isSharing, setIsSharing] = useState<string | null>(null);
  const [shareNotice, setShareNotice] = useState<string | null>(null);

  const totalActivities =
    completedTasksCount + completedQuizzesCount + watchedVideosCount + gamesCompletedCount;

  const handleShareBadge = async (badge: AchievementBadge) => {
    soundService.playClick();
    setIsSharing(badge.id);
    setShareNotice(null);

    const res = await shareMilestoneBadge(badge, {
      userName,
      streakDays,
      totalPoints,
    });

    setIsSharing(null);
    if (res.message && res.message !== 'Share cancelled') {
      setShareNotice(res.message);
      setTimeout(() => setShareNotice(null), 4000);
    }
  };

  // Real thresholds calculated directly from legitimate earned user progress
  const badges: AchievementBadge[] = [
    {
      id: 'first_activity',
      title: 'First Activity',
      urduTitle: 'پہلی سرگرمی',
      emoji: '🌟',
      description: 'Completed your very first learning, quiz, or task on JoyEarn.',
      thresholdDescription: 'Complete 1 eligible activity',
      category: 'general',
      isUnlocked: totalActivities >= 1,
      currentValue: Math.min(1, totalActivities),
      targetValue: 1,
      unlockedDate: totalActivities >= 1 ? 'Unlocked' : undefined,
    },
    {
      id: 'learning_star',
      title: 'Learning Star',
      urduTitle: 'علم کا ستارہ',
      emoji: '📚',
      description: 'Engaged with educational knowledge and wholesome family videos.',
      thresholdDescription: 'Complete 2 quizzes or videos',
      category: 'learning',
      isUnlocked: completedQuizzesCount + watchedVideosCount >= 2,
      currentValue: Math.min(2, completedQuizzesCount + watchedVideosCount),
      targetValue: 2,
      unlockedDate: completedQuizzesCount + watchedVideosCount >= 2 ? 'Unlocked' : undefined,
    },
    {
      id: 'quiz_master',
      title: 'Quiz Master',
      urduTitle: 'کوئز ماسٹر',
      emoji: '🧠',
      description: 'Demonstrated superior knowledge across World Geography, Science, and Math quizzes.',
      thresholdDescription: 'Solve 3 educational quizzes',
      category: 'learning',
      isUnlocked: completedQuizzesCount >= 3,
      currentValue: Math.min(3, completedQuizzesCount),
      targetValue: 3,
      unlockedDate: completedQuizzesCount >= 3 ? 'Unlocked' : undefined,
    },
    {
      id: 'task_finisher',
      title: 'Task Finisher',
      urduTitle: 'ٹاسک فاتح',
      emoji: '🎯',
      description: 'Completed approved community surveys and safety pledges honestly.',
      thresholdDescription: 'Finish 2 sponsored tasks',
      category: 'tasks',
      isUnlocked: completedTasksCount >= 2,
      currentValue: Math.min(2, completedTasksCount),
      targetValue: 2,
      unlockedDate: completedTasksCount >= 2 ? 'Unlocked' : undefined,
    },
    {
      id: 'referral_friend',
      title: 'Referral Friend',
      urduTitle: 'مخلص دوست',
      emoji: '🎁',
      description: 'Invited genuine friends and family who actively learned on JoyEarn.',
      thresholdDescription: '1 verified active referral',
      category: 'social',
      isUnlocked: activeReferralsCount >= 1,
      currentValue: Math.min(1, activeReferralsCount),
      targetValue: 1,
      unlockedDate: activeReferralsCount >= 1 ? 'Unlocked' : undefined,
    },
    {
      id: 'garden_starter',
      title: 'Garden Starter',
      urduTitle: 'باغبان',
      emoji: '🌱',
      description: 'Started a relaxing virtual flowerbed with daily seeds and fresh water.',
      thresholdDescription: 'Water or plant in your virtual garden',
      category: 'general',
      isUnlocked: true, // initial state has flowers already planted
      currentValue: 1,
      targetValue: 1,
      unlockedDate: 'Unlocked',
    },
    {
      id: 'weekly_achiever',
      title: 'Weekly Achiever',
      urduTitle: 'ہفتہ وار ہیرو',
      emoji: '🏆',
      description: 'Demonstrated loyalty with a consistent 4+ day streak on JoyEarn!',
      thresholdDescription: 'Reach a 4-day daily streak',
      category: 'streak',
      isUnlocked: streakDays >= 4,
      currentValue: Math.min(4, streakDays),
      targetValue: 4,
      unlockedDate: streakDays >= 4 ? `Day ${streakDays} Streak` : undefined,
    },
  ];

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const progressPercent = Math.round((unlockedCount / badges.length) * 100);

  return (
    <section className="px-4 py-2 space-y-2.5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-sm shadow-xs">
            🏆
          </div>
          <div>
            <h2 className={`font-black text-gray-900 ${seniorMode ? 'text-lg' : 'text-sm'}`}>
              {seniorMode ? 'کامیابیاں اور بیجز (Achievements)' : 'Achievements & Badges'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAllModal(true)}
            className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-0.5 tap-bounce"
          >
            <span>{unlockedCount}/{badges.length}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress pill indicator */}
      <div className="bg-white/90 border border-amber-200/80 rounded-2xl p-2.5 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-gray-700 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Honors Progress</span>
          </span>
          <span className="font-extrabold text-amber-600 text-xs">
            {unlockedCount} of {badges.length} Badges Earned ({progressPercent}%)
          </span>
        </div>
        <div className="w-full h-2 bg-amber-100/60 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 30-DAY RECHARTS STREAK & ACTIVITY VISUALIZATION */}
      <StreakChart
        streakDays={streakDays}
        seniorMode={seniorMode}
        totalActivitiesCount={totalActivities}
      />

      {/* Badges Horizontal Carousel / Grid */}
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-1">
        {badges.map((badge) => {
          return (
            <div
              key={badge.id}
              onClick={() => setSelectedBadge(badge)}
              className={`p-3 rounded-2xl border-2 cursor-pointer tap-bounce shrink-0 w-28 text-center flex flex-col items-center justify-between transition-all select-none relative overflow-hidden ${
                badge.isUnlocked
                  ? 'bg-gradient-to-b from-amber-50/90 to-white border-amber-300 shadow-sm hover:border-amber-400'
                  : 'bg-gray-50/90 border-gray-200 opacity-65 hover:opacity-80'
              }`}
            >
              {/* Unlock badge glow or locked icon */}
              <div className="relative my-1">
                <span className={`text-3xl block transition-transform ${badge.isUnlocked ? 'animate-bounce-subtle' : 'grayscale opacity-75'}`}>
                  {badge.emoji}
                </span>
                {!badge.isUnlocked && (
                  <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center text-[9px]">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
                {badge.isUnlocked && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                    ✓
                  </span>
                )}
                {badge.isUnlocked && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareBadge(badge);
                    }}
                    title="Share Milestone Card"
                    className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center shadow-xs tap-bounce z-10"
                  >
                    <Share2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Title */}
              <div className="mt-1 w-full">
                <h4 className="font-extrabold text-[11px] text-gray-900 truncate">
                  {seniorMode && badge.urduTitle ? badge.urduTitle : badge.title}
                </h4>
                <p className="text-[9px] font-semibold text-gray-500 mt-0.5 truncate">
                  {badge.isUnlocked ? (
                    <span className="text-emerald-700 font-bold">Unlocked! ⭐</span>
                  ) : (
                    <span>{badge.currentValue}/{badge.targetValue}</span>
                  )}
                </p>
              </div>

              {/* Mini progress bar for locked badges */}
              {!badge.isUnlocked && (
                <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{
                      width: `${Math.round((badge.currentValue / badge.targetValue) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BADGE DETAIL POPUP MODAL */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl border-4 border-amber-300 text-center space-y-3 relative animate-bounce-subtle">
            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold"
            >
              ✕
            </button>

            {/* Big Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-pink-100 border-2 border-amber-200 flex items-center justify-center text-5xl mx-auto shadow-inner">
              {selectedBadge.emoji}
            </div>

            <div>
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="font-extrabold text-base text-gray-900">
                  {selectedBadge.title}
                </h3>
                {selectedBadge.isUnlocked ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Unlocked
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-800 font-bold mt-0.5">
                {selectedBadge.urduTitle}
              </p>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed px-1">
              {selectedBadge.description}
            </p>

            {/* Threshold Box */}
            <div className="bg-amber-50 p-2.5 rounded-2xl border border-amber-200 text-xs space-y-1">
              <span className="text-[10px] uppercase font-black text-amber-900 block">
                Requirement
              </span>
              <p className="font-bold text-gray-800">{selectedBadge.thresholdDescription}</p>
              <div className="flex justify-between items-center text-[11px] text-gray-500 pt-1 border-t border-amber-200/60">
                <span>Current Progress:</span>
                <strong className={selectedBadge.isUnlocked ? 'text-emerald-700' : 'text-amber-800'}>
                  {selectedBadge.currentValue} / {selectedBadge.targetValue}{' '}
                  {selectedBadge.isUnlocked ? '✓' : ''}
                </strong>
              </div>
            </div>

            {/* Safety Disclaimer */}
            <p className="text-[10px] text-gray-400 leading-tight">
              Honorary badge for encouragement and learning progress. Badges do not represent real cash money.
            </p>

            {/* Social Sharing Button with Canvas Graphic Generation */}
            {selectedBadge.isUnlocked && (
              <button
                type="button"
                onClick={() => handleShareBadge(selectedBadge)}
                disabled={isSharing === selectedBadge.id}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white rounded-xl text-xs font-black tap-bounce shadow-md flex items-center justify-center gap-2"
              >
                {isSharing === selectedBadge.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Milestone Card...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>{seniorMode ? 'سنگ میل کی تصویر شیئر کریں 🌟' : 'Share Milestone Image 🌟'}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => setSelectedBadge(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold tap-bounce"
            >
              {seniorMode ? 'بند کریں' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* Share Toast Notification */}
      {shareNotice && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-60 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{shareNotice}</span>
        </div>
      )}

      {/* ALL ACHIEVEMENTS LIST MODAL */}
      {showAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-4 border-amber-300">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <h3 className="font-extrabold text-base">All Community Badges</h3>
                  <p className="text-xs text-amber-100">
                    {unlockedCount} of {badges.length} Unlocked
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllModal(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Badge list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  onClick={() => {
                    setShowAllModal(false);
                    setSelectedBadge(badge);
                  }}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-3 cursor-pointer tap-bounce ${
                    badge.isUnlocked
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-gray-50 border-gray-200 opacity-75'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-white border border-amber-200 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                    {badge.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs text-gray-900 truncate">
                        {badge.title} ({badge.urduTitle})
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          badge.isUnlocked
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {badge.isUnlocked ? 'Unlocked ⭐' : `${badge.currentValue}/${badge.targetValue}`}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                      {badge.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
