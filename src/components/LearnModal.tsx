import {
  getDailyQuizForToday,
  isDailyQuizCompletedToday,
  markDailyQuizCompletedToday,
  getTimeUntilMidnight,
  ShuffledQuizItem
} from '../services/dailyQuizService';
import { adMobManager } from '../services/adMobService';
import { AdMobInterstitialModal } from './AdMobInterstitialModal';
import { AdMobRewardedModal } from './AdMobRewardedModal';
import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle,
  XCircle,
  Award,
  Sparkles,
  HelpCircle,
  Zap,
  TrendingUp,
  Brain,
  RefreshCw,
  Flame,
  ShieldCheck,
  Star,
  Clock,
  Timer,
  AlertCircle,
  Trophy,
  Medal,
  Crown,
  Target,
  Gauge,
  Flag
} from 'lucide-react';
import { QuizItem, QuizLeaderboardPlayer } from '../types';
import { QUIZ_LEADERBOARD_MOCK } from '../data/mockData';
import { hapticService } from '../services/haptics';
import { soundService } from '../services/soundService';
import { StreakFireCelebration } from './StreakFireCelebration';
import { RotatingSponsorAdCard } from './SponsorAdCard';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

interface DifficultyConfig {
  id: DifficultyLevel;
  label: string;
  urduLabel: string;
  multiplier: number;
  multiplierBadge: string;
  urduMultiplier: string;
  ptsRange: string;
  emoji: string;
  color: string;
  activeBg: string;
  badgeBg: string;
  border: string;
  description: string;
}

interface LearnModalProps {
  quizzes: QuizItem[];
  onEarnPoints: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  completedQuizIds?: string[];
  onCompleteQuiz?: (quizId: string) => void;
  onDailyQuizCompleted?: () => void;
  streakDays?: number;
}

export const DIFFICULTY_CONFIGS: DifficultyConfig[] = [
  {
    id: 'Beginner',
    label: 'Beginner',
    urduLabel: 'آسان',
    multiplier: 1.0,
    multiplierBadge: '1.0x Standard',
    urduMultiplier: '1.0x انعام',
    ptsRange: '15 - 20 Pts',
    emoji: '🌱',
    color: 'text-emerald-700',
    activeBg: 'bg-emerald-500 text-white',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    border: 'border-emerald-300',
    description: 'Foundational general knowledge & daily facts',
  },
  {
    id: 'Intermediate',
    label: 'Intermediate',
    urduLabel: 'درمیانہ',
    multiplier: 1.5,
    multiplierBadge: '1.5x Boost (+50%)',
    urduMultiplier: '1.5x ڈیڑھ گنا',
    ptsRange: '45 - 53 Pts',
    emoji: '⚡',
    color: 'text-amber-700',
    activeBg: 'bg-amber-500 text-white',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
    border: 'border-amber-300',
    description: 'Science concepts, English-Urdu vocabulary & logic',
  },
  {
    id: 'Advanced',
    label: 'Advanced',
    urduLabel: 'مشکل',
    multiplier: 2.0,
    multiplierBadge: '2.0x Double Reward (2x)',
    urduMultiplier: '2.0x دوگنا انعام',
    ptsRange: '100 - 120 Pts',
    emoji: '🔥',
    color: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white',
    badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
    border: 'border-rose-300',
    description: 'Literature, physics, genetics & advanced riddles',
  },
];

export const LearnModal: React.FC<LearnModalProps> = ({
  quizzes,
  onEarnPoints,
  onClose,
  seniorMode,
  completedQuizIds: initialCompletedQuizIds = [],
  onCompleteQuiz,
  onDailyQuizCompleted,
  streakDays = 5,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Beginner');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [awardedBonus, setAwardedBonus] = useState(0);
  const [completedQuizIds, setCompletedQuizIds] = useState<string[]>(initialCompletedQuizIds);
  const [quizScore, setQuizScore] = useState(0);
  const [showFireCelebration, setShowFireCelebration] = useState(false);

  // Daily 5-Question Quiz State
  const [quizSubTab, setQuizSubTab] = useState<'daily' | 'practice'>('daily');
  const [dailyQuizzes, setDailyQuizzes] = useState<ShuffledQuizItem[]>(() => getDailyQuizForToday(quizzes));
  const [dailyIndex, setDailyIndex] = useState(0);
  const [dailySelectedOption, setDailySelectedOption] = useState<number | null>(null);
  const [isDailyAnswered, setIsDailyAnswered] = useState(false);
  const [dailyScore, setDailyScore] = useState(0);
  const [isDailyLocked, setIsDailyLocked] = useState(() => isDailyQuizCompletedToday());
  const [timeUntilMidnight, setTimeUntilMidnight] = useState(() => getTimeUntilMidnight().formatted);

  // AdMob Fullscreen State
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [showRewarded, setShowRewarded] = useState(false);

  // Live timer for midnight countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeUntilMidnight(getTimeUntilMidnight().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tab state: Quiz Challenge vs Quiz Leaderboard
  const [activeLearnTab, setActiveLearnTab] = useState<'quiz' | 'leaderboard'>('quiz');
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'accuracy' | 'speed'>('all');

  // Sorted leaderboard based on user selected criteria (Points, Accuracy, Speed)
  const sortedLeaderboard = useMemo(() => {
    const list = [...QUIZ_LEADERBOARD_MOCK];
    if (completedQuizIds && completedQuizIds.length > 0) {
      list.unshift({
        rank: 1,
        name: 'You',
        avatar: '🌸',
        country: 'Global Member',
        flag: '🌍',
        accuracy: 98.5,
        avgSpeedSeconds: 2.3,
        quizzesCompleted: completedQuizIds.length,
        totalPointsEarned: completedQuizIds.length * 30,
        favoriteCategory: 'Daily Quiz',
        speedRankBadge: 'Active Scholar ⚡',
        isCurrentUser: true,
      });
    }
    if (leaderboardFilter === 'accuracy') {
      return list.sort((a, b) => b.accuracy - a.accuracy);
    }
    if (leaderboardFilter === 'speed') {
      return list.sort((a, b) => a.avgSpeedSeconds - b.avgSpeedSeconds);
    }
    return list.sort((a, b) => b.totalPointsEarned - a.totalPointsEarned);
  }, [leaderboardFilter, completedQuizIds]);

  // Difficulty metadata
  const currentDiffMeta = useMemo(() => {
    return (
      DIFFICULTY_CONFIGS.find((d) => d.id === selectedDifficulty) || DIFFICULTY_CONFIGS[0]
    );
  }, [selectedDifficulty]);

  // Duration: Senior mode gives a relaxed 35 seconds, otherwise 25s (Beginner), 20s (Intermediate), 18s (Advanced)
  const totalDuration = useMemo(() => {
    if (seniorMode) return 35;
    if (selectedDifficulty === 'Beginner') return 25;
    if (selectedDifficulty === 'Intermediate') return 20;
    return 18;
  }, [seniorMode, selectedDifficulty]);

  const [timeLeft, setTimeLeft] = useState<number>(totalDuration);

  // Quiz count breakdown per difficulty
  const difficultyCounts = useMemo(() => {
    return {
      Beginner: quizzes.filter(
        (q) => (q.difficulty || 'Beginner').toLowerCase() === 'beginner'
      ).length,
      Intermediate: quizzes.filter(
        (q) => (q.difficulty || 'Beginner').toLowerCase() === 'intermediate'
      ).length,
      Advanced: quizzes.filter(
        (q) => (q.difficulty || 'Beginner').toLowerCase() === 'advanced'
      ).length,
    };
  }, [quizzes]);

  // Filter quizzes by selected difficulty and optional category
  const activeQuizzes = useMemo(() => {
    let list = quizzes.filter(
      (q) => (q.difficulty || 'Beginner').toLowerCase() === selectedDifficulty.toLowerCase()
    );
    if (selectedCategory !== 'All') {
      const filtered = list.filter((q) => q.category === selectedCategory);
      if (filtered.length > 0) list = filtered;
    }
    return list.length > 0 ? list : quizzes;
  }, [quizzes, selectedDifficulty, selectedCategory]);

  // Current quiz safely bound to index
  const safeIndex = Math.min(currentIndex, activeQuizzes.length - 1);
  const currentQuiz = activeQuizzes[safeIndex] || quizzes[0];

  // Base points and multiplier calculations
  const basePoints = currentQuiz ? currentQuiz.points : 20;
  const multiplier = currentDiffMeta.multiplier;
  const finalRewardPoints = Math.round(basePoints * multiplier);

  // Synchronize timer whenever the question or filters change
  useEffect(() => {
    setTimeLeft(totalDuration);
    setIsTimeExpired(false);
    setAwardedBonus(0);
  }, [currentIndex, selectedDifficulty, selectedCategory, totalDuration]);

  // Active countdown timer interval
  useEffect(() => {
    if (isAnswered) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimeExpired(true);
          setIsAnswered(true);
          hapticService.warning();
          soundService.playClick();
          return 0;
        }
        if (prev === 4) {
          hapticService.light();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAnswered, currentIndex, selectedDifficulty, selectedCategory]);

  const handleSelectDifficulty = (diff: DifficultyLevel) => {
    if (diff === selectedDifficulty) return;
    hapticService.selection();
    soundService.playClick();
    setSelectedDifficulty(diff);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeExpired(false);
    setAwardedBonus(0);
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQuiz.correctIndex;
    if (isCorrect) {
      // Calculate speed bonus based on percentage of time remaining
      const pct = timeLeft / totalDuration;
      let bonus = 2; // base swift bonus for beating the timer
      if (pct >= 0.70) {
        bonus = 15; // ⚡⚡ Lightning Fast (< 30% time taken)
      } else if (pct >= 0.45) {
        bonus = 10; // ⚡ Swift Mind
      } else if (pct >= 0.20) {
        bonus = 5;  // ⏱️ Good Reaction
      }

      setAwardedBonus(bonus);
      hapticService.success();
      soundService.playCoin();
      setQuizScore((s) => s + 1);

      const totalEarned = finalRewardPoints + bonus;
      if (!completedQuizIds.includes(currentQuiz.id)) {
        setCompletedQuizIds((prev) => [...prev, currentQuiz.id]);
        onCompleteQuiz?.(currentQuiz.id);
        onEarnPoints(
          totalEarned,
          `Quiz (${selectedDifficulty} • ${multiplier}x + ⚡${bonus} Speed Bonus): ${currentQuiz.category}`
        );
      }
    } else {
      hapticService.warning();
      soundService.playClick();
    }
  };

  const handleNext = () => {
    hapticService.light();
    soundService.playClick();
    if (currentIndex < activeQuizzes.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      // Loop or restart difficulty tier
      setCurrentIndex(0);
    }
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeExpired(false);
    setAwardedBonus(0);
  };

  const handleSelectDailyOption = (idx: number) => {
    if (isDailyAnswered || isDailyLocked) return;
    setDailySelectedOption(idx);
    setIsDailyAnswered(true);

    const currentDailyQ = dailyQuizzes[dailyIndex];
    if (!currentDailyQ) return;

    const correct = currentDailyQ.correctAnswer;
    const isCorrect = idx === correct;

    if (isCorrect) {
      soundService.playCoin();
      hapticService.success();
      setDailyScore((s) => s + 1);
      onEarnPoints(20, `Daily Quiz Q${dailyIndex + 1} Correct: ${currentDailyQ.category}`);
    } else {
      soundService.playClick();
      hapticService.warning();
    }
  };

  const handleNextDailyQuestion = () => {
    soundService.playClick();
    if (dailyIndex < 4) {
      setDailyIndex((i) => i + 1);
      setDailySelectedOption(null);
      setIsDailyAnswered(false);
    } else {
      // 5/5 Questions Completed - Lock for Today!
      soundService.playFanfare();
      const finalScore = dailyScore + (dailySelectedOption === dailyQuizzes[4]?.correctAnswer ? 1 : 0);
      markDailyQuizCompletedToday(finalScore);
      setIsDailyLocked(true);
      setShowFireCelebration(true);
      onDailyQuizCompleted?.();

      // Perfect score bonus
      if (finalScore === 5) {
        onEarnPoints(50, 'Perfect 5/5 Daily Quiz Bonus 🎉');
      }

      // Check AdMob Interstitial condition (every 3rd quiz and >2min cooldown)
      if (adMobManager.onQuizCompleted()) {
        setShowInterstitial(true);
      }
    }
  };

  const handleShuffleQuestion = () => {
    if (activeQuizzes.length <= 1) return;
    soundService.playClick();
    let nextIdx = Math.floor(Math.random() * activeQuizzes.length);
    if (nextIdx === currentIndex) {
      nextIdx = (currentIndex + 1) % activeQuizzes.length;
    }
    setCurrentIndex(nextIdx);
    setSelectedOption(null);
    setIsAnswered(false);
    setIsTimeExpired(false);
    setAwardedBonus(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border-4 border-indigo-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              📚
            </div>
            <div>
              <h2 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                {seniorMode ? 'تعلیمی کوئز اور معلومات' : 'Learn & Knowledge Zone'}
              </h2>
              <p className="text-xs text-indigo-100">
                Choose difficulty to adjust quiz questions & reward multipliers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold tap-bounce"
          >
            ✕
          </button>
        </div>

        {/* MODAL TABS SWITCHER: QUIZ CHALLENGE VS QUIZ LEADERBOARD */}
        <div className="flex border-b border-indigo-200/80 bg-white font-black text-xs shrink-0 shadow-2xs">
          <button
            onClick={() => {
              soundService.playClick();
              setActiveLearnTab('quiz');
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 tap-bounce ${
              activeLearnTab === 'quiz'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/60'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-600" />
            <span>Quiz Challenge</span>
          </button>
          <button
            onClick={() => {
              soundService.playClick();
              setActiveLearnTab('leaderboard');
            }}
            className={`flex-1 py-3 text-center border-b-2 transition-all flex items-center justify-center gap-1.5 tap-bounce ${
              activeLearnTab === 'leaderboard'
                ? 'border-amber-500 text-amber-800 bg-amber-50/70 shadow-inner'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>Quiz Leaderboard</span>
            <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded-full border border-amber-300 font-extrabold">
              Top 10
            </span>
          </button>
        </div>

        {/* TAB 1: QUIZ CHALLENGE */}
        {activeLearnTab === 'quiz' && (
          <>
            {/* SUB-TABS: DAILY 5-QUESTION QUIZ vs 450+ PRACTICE BANK */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mx-3 my-2 border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setQuizSubTab('daily');
                }}
                className={`flex-1 py-1.5 rounded-xl font-black text-xs tap-bounce flex items-center justify-center gap-1.5 transition-all ${
                  quizSubTab === 'daily'
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{seniorMode ? 'روزانہ 5 سوالات کا کوئز' : 'Daily 5-Question Quiz'}</span>
                {isDailyLocked && <span className="text-[9px] bg-emerald-600 text-white px-1.5 rounded-full">✓ Done</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  soundService.playClick();
                  setQuizSubTab('practice');
                }}
                className={`flex-1 py-1.5 rounded-xl font-black text-xs tap-bounce flex items-center justify-center gap-1.5 transition-all ${
                  quizSubTab === 'practice'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>{seniorMode ? '450+ سوالات کی مشق' : '450+ Practice Bank'}</span>
              </button>
            </div>

            {/* DAILY QUIZ VIEW */}
            {quizSubTab === 'daily' && (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isDailyLocked ? (
                  /* LOCKED FOR TODAY CARD */
                  <div className="bg-gradient-to-b from-amber-50 via-white to-pink-50 dark:from-slate-800 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-lg my-auto">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-500 text-white text-4xl flex items-center justify-center mx-auto shadow-md">
                      🎉
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Completed for Today!
                      </span>
                      <h3 className="font-black text-xl text-slate-900 dark:text-white">
                        {seniorMode ? 'آج کا روزانہ کوئز مکمل ہو چکا ہے!' : "You've Finished Today's Daily Quiz!"}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                        {seniorMode
                          ? 'کل رات 12 بجے 5 نئے اور دلچسپ سوالات کے لیے دوبارہ تشریف لائیں۔'
                          : 'Come back tomorrow for 5 fresh family-friendly questions. The daily challenge unlocks automatically at midnight.'}
                      </p>
                    </div>

                    {/* Midnight Countdown Box */}
                    <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-1 max-w-xs mx-auto shadow-inner border border-slate-700">
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center justify-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        <span>Next Daily Quiz Unlocks In:</span>
                      </div>
                      <div className="text-xl font-mono font-black text-amber-400 tracking-wider">
                        {timeUntilMidnight}
                      </div>
                    </div>

                    {/* Rewarded Video Bonus Option (AdMob) */}
                    <button
                      type="button"
                      onClick={() => setShowRewarded(true)}
                      className="w-full max-w-xs mx-auto py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black rounded-xl text-xs shadow-md tap-bounce flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 fill-slate-950" />
                      <span>{seniorMode ? 'ویڈیو دیکھ کر پوائنٹس ڈبل کریں (2x)' : 'Watch Video to Double Points (2x)'}</span>
                    </button>

                    {/* Practice button */}
                    <button
                      type="button"
                      onClick={() => setQuizSubTab('practice')}
                      className="w-full max-w-xs mx-auto py-2.5 bg-indigo-50 dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 font-extrabold rounded-xl text-xs tap-bounce flex items-center justify-center gap-1.5"
                    >
                      <Brain className="w-4 h-4" />
                      <span>{seniorMode ? '450+ سوالات کی مفت مشق جاری رکھیں' : 'Practice More in 450+ Bank'}</span>
                    </button>
                  </div>
                ) : (
                  /* ACTIVE DAILY 5-QUESTION FLOW */
                  <div className="space-y-4">
                    {/* Header Progress indicator */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="font-black text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Daily Question {dailyIndex + 1} of 5</span>
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        Category: <strong>{dailyQuizzes[dailyIndex]?.category}</strong>
                      </span>
                    </div>

                    {/* Progress Bar (5 segments) */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-2 rounded-full transition-all ${
                            step < dailyIndex
                              ? 'bg-emerald-500'
                              : step === dailyIndex
                              ? 'bg-amber-400 animate-pulse'
                              : 'bg-slate-200 dark:bg-slate-700'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Question Card */}
                    {dailyQuizzes[dailyIndex] && (
                      <div className="bg-gradient-to-b from-indigo-50/60 to-white dark:from-slate-800 dark:to-slate-850 p-4 rounded-3xl border-2 border-indigo-200 dark:border-slate-700 shadow-sm space-y-3">
                        <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white leading-snug">
                          {dailyQuizzes[dailyIndex].question}
                        </h3>
                        {seniorMode && dailyQuizzes[dailyIndex].urduQuestion && (
                          <p className="text-xs text-indigo-800 dark:text-indigo-300 font-serif font-bold">
                            {dailyQuizzes[dailyIndex].urduQuestion}
                          </p>
                        )}

                        {/* Options List (Shuffled) */}
                        <div className="space-y-2 pt-1">
                          {dailyQuizzes[dailyIndex].options.map((opt, oIdx) => {
                            const isChosen = dailySelectedOption === oIdx;
                            const isCorrectOpt = oIdx === dailyQuizzes[dailyIndex].correctAnswer;

                            let optStyle = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-800 dark:text-slate-100';
                            if (isDailyAnswered) {
                              if (isCorrectOpt) {
                                optStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                              } else if (isChosen) {
                                optStyle = 'bg-red-50 dark:bg-red-950/60 border-red-500 text-red-800 dark:text-red-200';
                              } else {
                                optStyle = 'opacity-60 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={isDailyAnswered}
                                onClick={() => handleSelectDailyOption(oIdx)}
                                className={`w-full p-3 rounded-2xl border-2 text-left font-semibold text-xs transition-all flex items-center justify-between tap-bounce ${optStyle}`}
                              >
                                <span className="flex-1 pr-2">{opt}</span>
                                {isDailyAnswered && isCorrectOpt && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {isDailyAnswered && isChosen && !isCorrectOpt && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation Box */}
                        {isDailyAnswered && (
                          <div className="p-3 bg-amber-50 dark:bg-slate-800/90 border border-amber-200 dark:border-amber-700/60 rounded-2xl text-xs space-y-1 animate-in fade-in">
                            <span className="font-black text-amber-900 dark:text-amber-400 text-[10px] uppercase">
                              Did you know?
                            </span>
                            <p className="text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
                              {dailyQuizzes[dailyIndex].explanation}
                            </p>
                          </div>
                        )}

                        {/* Sponsor Ad Between Quiz Questions */}
                        {isDailyAnswered && (
                          <div className="pt-1">
                            <RotatingSponsorAdCard variant="compact" />
                          </div>
                        )}

                        {/* Next Question / Finish Daily Quiz Button */}
                        {isDailyAnswered && (
                          <button
                            type="button"
                            onClick={handleNextDailyQuestion}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black rounded-2xl text-xs shadow-md tap-bounce flex items-center justify-center gap-2"
                          >
                            <span>
                              {dailyIndex === 4
                                ? seniorMode
                                  ? 'آج کا کوئز مکمل کریں 🎉'
                                  : "Complete Today's Daily Quiz 🎉"
                                : seniorMode
                                ? 'اگلا سوال'
                                : 'Next Question'}
                            </span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PRACTICE MODE (Shown only when quizSubTab === 'practice') */}
            {quizSubTab === 'practice' && (
              <>
            {/* DIFFICULTY SELECTOR BAR WITH MULTIPLIERS */}
        <div className="bg-indigo-50/90 p-3 border-b border-indigo-100 space-y-2">
          <div className="flex items-center justify-between text-[11px] px-1 font-bold text-indigo-950">
            <span className="flex items-center gap-1">
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Difficulty Tier:</span>
            </span>
            <span className="text-[10px] text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
              Active Multiplier: <strong>{multiplier}x</strong>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTY_CONFIGS.map((diff) => {
              const isSelected = selectedDifficulty === diff.id;
              const count = difficultyCounts[diff.id] || 0;

              return (
                <button
                  key={diff.id}
                  onClick={() => handleSelectDifficulty(diff.id)}
                  className={`py-2 px-2 rounded-2xl text-center transition-all tap-bounce border-2 flex flex-col items-center justify-between relative overflow-hidden ${
                    isSelected
                      ? `${diff.activeBg} shadow-md scale-[1.02] border-white`
                      : 'bg-white hover:bg-indigo-50/70 text-gray-700 border-gray-200'
                  }`}
                >
                  {/* Top Level + Emoji */}
                  <div className="flex items-center gap-1">
                    <span className="text-sm">{diff.emoji}</span>
                    <span className="font-extrabold text-[11px]">{diff.label}</span>
                  </div>

                  {/* Multiplier Tag */}
                  <span
                    className={`text-[9px] font-black mt-1 px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-black/25 text-white' : 'bg-indigo-100 text-indigo-900 font-extrabold'
                    }`}
                  >
                    {diff.multiplier}x Multiplier
                  </span>

                  {/* Points Range or Urdu Label */}
                  <div className="mt-1 flex flex-col items-center text-[9px] font-semibold opacity-90">
                    <span>{diff.ptsRange}</span>
                    {seniorMode && (
                      <span className="font-serif mt-0.5">({diff.urduLabel} • {diff.urduMultiplier})</span>
                    )}
                  </div>

                  {/* Quiz Count Pill */}
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.2 rounded-full mt-1 ${
                      isSelected ? 'bg-white/30 text-white' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count} Quizzes
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Multiplier Info Callout Banner */}
        <div className="bg-gradient-to-r from-amber-50 via-indigo-50 to-purple-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-sm">{currentDiffMeta.emoji}</span>
            <div>
              <span className="font-extrabold text-gray-900 text-[11px]">
                {selectedDifficulty} Mode:
              </span>
              <span className="text-[10px] text-gray-600 ml-1">
                {currentDiffMeta.description}
              </span>
            </div>
          </div>

          <span className="bg-amber-100 border border-amber-300 text-amber-900 font-black px-2 py-0.5 rounded-full text-[10px] shadow-2xs shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-600" />
            <span>{multiplier}x Reward</span>
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="bg-slate-50 px-3 py-1.5 border-b border-indigo-100 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
          {[
            { id: 'All', label: 'All Subjects', emoji: '📚' },
            { id: 'Geography', label: 'Geography', emoji: '🌍' },
            { id: 'Science', label: 'Science', emoji: '🔬' },
            { id: 'Math', label: 'Math', emoji: '🔢' },
            { id: 'History', label: 'History', emoji: '🏛️' },
            { id: 'General Knowledge', label: 'General', emoji: '💡' },
          ].map((cat) => {
            const isCatSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  hapticService.selection();
                  soundService.playClick();
                  setSelectedCategory(cat.id);
                  setCurrentIndex(0);
                  setSelectedOption(null);
                  setIsAnswered(false);
                  setIsTimeExpired(false);
                  setAwardedBonus(0);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 flex items-center gap-1 transition-all tap-bounce ${
                  isCatSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-indigo-50 border border-slate-200'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Progress Bar & Subheader */}
        <div className="bg-white px-4 py-2 border-b border-gray-100 flex items-center justify-between text-xs text-gray-700 font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">
              Q {safeIndex + 1} of {activeQuizzes.length}
            </span>
            <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
              {currentQuiz.category}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShuffleQuestion}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 p-1 rounded-lg hover:bg-indigo-50 tap-bounce"
              title="Shuffle another question in this level"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Shuffle</span>
            </button>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-gray-400 line-through">
                {basePoints}
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full text-xs shadow-xs border border-emerald-300">
                +{finalRewardPoints} Pts
              </span>
            </div>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Question Card */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/60 p-4 rounded-3xl border-2 border-indigo-100 space-y-2.5 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                {selectedDifficulty} Challenge
              </span>
              <span className="text-[10px] text-amber-700 font-black bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Reward: +{finalRewardPoints} JoyPoints
              </span>
            </div>

            {/* Live Countdown Timer & Speed Reflex Bar */}
            <div className="bg-white/90 backdrop-blur-xs rounded-2xl p-2.5 border border-indigo-200/80 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-lg transition-colors ${
                      isTimeExpired
                        ? 'bg-rose-100 text-rose-600'
                        : timeLeft <= 5
                        ? 'bg-rose-100 text-rose-600 animate-pulse'
                        : 'bg-indigo-100 text-indigo-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={`font-black tracking-tight ${
                      isTimeExpired
                        ? 'text-rose-600'
                        : timeLeft <= 5
                        ? 'text-rose-600 animate-pulse'
                        : 'text-slate-800'
                    }`}
                  >
                    {isTimeExpired
                      ? "Time's Up!"
                      : isAnswered
                      ? `Completed (${timeLeft}s remaining)`
                      : `${timeLeft}s Remaining`}
                  </span>
                  {seniorMode && (
                    <span className="text-[9px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
                      +15s Relaxed
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Zap className={`w-3.5 h-3.5 ${awardedBonus > 0 ? 'text-amber-500 fill-amber-500' : 'text-amber-400'}`} />
                  <span className="text-[11px] font-extrabold text-amber-800">
                    {isAnswered && awardedBonus > 0
                      ? `+${awardedBonus} Speed Bonus!`
                      : `Speed Bonus: Up to +15 Pts`}
                  </span>
                </div>
              </div>

              {/* Smooth dynamic timer progress bar */}
              <div className="w-full h-2 bg-indigo-50/80 rounded-full overflow-hidden p-0.5 border border-indigo-100/80">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    timeLeft / totalDuration > 0.5
                      ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                      : timeLeft / totalDuration > 0.25
                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                      : 'bg-gradient-to-r from-rose-500 to-red-600'
                  }`}
                  style={{
                    width: `${Math.max(0, Math.min(100, (timeLeft / totalDuration) * 100))}%`,
                  }}
                />
              </div>
            </div>

            {/* Formula Breakdown Badge */}
            <div className="flex items-center gap-1.5 text-[10px] text-gray-600 bg-white/70 rounded-xl px-2.5 py-1 border border-indigo-100">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>
                Calculation: <strong>{basePoints} Base Pts</strong> × <strong>{multiplier}x Multiplier</strong> ={' '}
                <strong className="text-emerald-700">+{finalRewardPoints} Pts</strong>
              </span>
            </div>

            <h3 className={`font-black text-gray-900 leading-snug ${seniorMode ? 'text-xl' : 'text-base'}`}>
              {currentQuiz.question}
            </h3>

            {currentQuiz.urduTranslation && (
              <p className="text-xs text-indigo-950 font-semibold font-serif bg-white/90 p-2.5 rounded-2xl border border-indigo-100 leading-relaxed">
                {currentQuiz.urduTranslation}
              </p>
            )}
          </div>

          {/* Options List with explicit A, B, C, D indicators */}
          <div className="space-y-2.5">
            {currentQuiz.options.map((opt, idx) => {
              const letter = ['A', 'B', 'C', 'D'][idx] || `${idx + 1}`;
              const isSelected = selectedOption === idx;
              const isCorrect = idx === currentQuiz.correctIndex;

              let btnClass = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-indigo-300';
              let letterBadge = 'bg-indigo-50 border-indigo-200 text-indigo-700';

              if (isAnswered) {
                if (isCorrect) {
                  btnClass = 'bg-emerald-50 border-2 border-emerald-500 text-emerald-950 font-black shadow-sm';
                  letterBadge = 'bg-emerald-500 border-emerald-600 text-white';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-rose-50 border-2 border-rose-400 text-rose-900 line-through';
                  letterBadge = 'bg-rose-500 border-rose-600 text-white';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full p-3 rounded-2xl text-left text-xs font-bold flex items-center justify-between transition-all tap-bounce ${btnClass}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-xl border flex items-center justify-center text-[11px] font-black shrink-0 transition-colors shadow-2xs ${letterBadge}`}
                    >
                      {letter}
                    </span>
                    <span className="leading-snug flex-1">{opt}</span>
                  </div>
                  {isAnswered && isCorrect && (
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-1.5" />
                  )}
                  {isAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-4 h-4 text-rose-500 shrink-0 ml-1.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation / Fact & Multiplier Reward Claim Banner */}
          {isAnswered && (
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl space-y-2.5 text-xs animate-bounce-subtle">
              {/* Correct Bonus Banner */}
              {selectedOption === currentQuiz.correctIndex && (
                <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white rounded-2xl p-3 shadow-md space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎉</span>
                      <div>
                        <p className="font-black text-xs sm:text-sm">
                          Correct Answer! +{finalRewardPoints + awardedBonus} JoyPoints Credited
                        </p>
                        <p className="text-[10px] text-emerald-100 font-medium">
                          Base: {basePoints} × {multiplier}x = {finalRewardPoints} Pts
                          {awardedBonus > 0 && ` + ⚡ Speed Bonus: +${awardedBonus} Pts (${timeLeft}s remaining)`}
                        </p>
                      </div>
                    </div>
                    <span className="bg-white/25 border border-white/30 text-white font-black px-2.5 py-1 rounded-xl text-xs shadow-inner">
                      +{finalRewardPoints + awardedBonus} Pts
                    </span>
                  </div>

                  {awardedBonus > 0 && (
                    <div className="bg-emerald-800/40 rounded-xl px-2.5 py-1 flex items-center justify-between text-[11px] font-bold">
                      <span className="flex items-center gap-1 text-amber-200">
                        <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Fast Reaction Bonus:</span>
                      </span>
                      <span className="text-amber-300 font-black">+{awardedBonus} JoyPoints</span>
                    </div>
                  )}
                </div>
              )}

              {/* Time Expired Notice */}
              {isTimeExpired && (
                <div className="bg-gradient-to-r from-rose-500 to-amber-600 text-white rounded-2xl p-3 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏱️</span>
                    <div>
                      <p className="font-black text-xs sm:text-sm">
                        Time's Up! (0s remaining)
                      </p>
                      <p className="text-[10px] text-rose-100">
                        The correct answer is highlighted in green. Check the knowledge fact below!
                      </p>
                    </div>
                  </div>
                  <span className="bg-white/20 text-white font-black px-2.5 py-1 rounded-xl text-xs">
                    0 Pts
                  </span>
                </div>
              )}

              <div className="font-extrabold text-blue-950 flex items-center gap-1.5 pt-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Knowledge Fact & Explanation</span>
              </div>
              <p className="text-gray-700 leading-relaxed font-medium">{currentQuiz.fact}</p>

              {/* Sponsor Card Between Questions */}
              <div className="pt-1">
                <RotatingSponsorAdCard variant="compact" />
              </div>

              <div className="flex gap-2 pt-2">
                {isTimeExpired && (
                  <button
                    onClick={() => {
                      soundService.playClick();
                      setSelectedOption(null);
                      setIsAnswered(false);
                      setIsTimeExpired(false);
                      setTimeLeft(totalDuration);
                    }}
                    className="py-3 px-3 bg-white border-2 border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-extrabold rounded-2xl tap-bounce text-xs flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Try Again</span>
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-extrabold rounded-2xl tap-bounce text-xs shadow-md flex items-center justify-center gap-1.5"
                >
                  <span>{safeIndex < activeQuizzes.length - 1 ? 'Next Question →' : 'Restart Level Series ↻'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-gray-400" />
            <span>Fair learning reward • Instant point credit upon correct answer</span>
          </div>
        </div>
              </>
            )}
          </>
        )}

    {/* TAB 2: QUIZ LEADERBOARD VIEW (TOP 10 ACCURACY & SPEED) */}
    {activeLearnTab === 'leaderboard' && (
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/60">
        {/* Header / Intro Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl p-3 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-100 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-200" />
              Accuracy & Speed Reflex Standings
            </span>
            <h3 className="text-sm font-black text-white mt-0.5">
              Top 10 Global Quiz Masters
            </h3>
            <p className="text-[10px] text-amber-100 font-medium">
              Ranked by answer precision & lightning reaction speeds
            </p>
          </div>
          <div className="text-3xl animate-bounce-subtle shrink-0">
            🏆
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-gray-200 shadow-2xs text-[11px] font-bold">
          {[
            { id: 'all', label: '⭐ All Top Scorers' },
            { id: 'accuracy', label: '🎯 Accuracy %' },
            { id: 'speed', label: '⚡ Fastest Reflex' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                soundService.playClick();
                setLeaderboardFilter(f.id as any);
              }}
              className={`flex-1 py-1.5 rounded-xl transition-all tap-bounce ${
                leaderboardFilter === f.id
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {sortedLeaderboard.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
              🏆
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm text-slate-800">No Leaderboard Records Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Complete daily quizzes with high accuracy and reflex speed to appear on the leaderboard!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            <div className="grid grid-cols-3 gap-2 pt-1 items-end">
          {/* #2 Rank */}
          {sortedLeaderboard[1] && (
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-col items-center text-center relative">
              <span className="absolute -top-2.5 bg-slate-200 text-slate-800 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-300 shadow-2xs">
                #2 🥈
              </span>
              <div className="text-2xl mt-1">{sortedLeaderboard[1].avatar}</div>
              <span className="font-black text-xs text-slate-900 truncate w-full mt-0.5">
                {sortedLeaderboard[1].name}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5">
                <span>{sortedLeaderboard[1].flag}</span>
                <span className="truncate">{sortedLeaderboard[1].country}</span>
              </span>
              <div className="mt-1.5 w-full bg-indigo-50 rounded-xl p-1 text-[10px] space-y-0.5">
                <span className="font-black text-indigo-700 block">
                  {sortedLeaderboard[1].accuracy}% Acc
                </span>
                <span className="font-extrabold text-amber-700 block">
                  ⚡ {sortedLeaderboard[1].avgSpeedSeconds}s
                </span>
              </div>
            </div>
          )}

          {/* #1 Rank (Crown Champion) */}
          {sortedLeaderboard[0] && (
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-2xl p-3 border-2 border-amber-400 shadow-md flex flex-col items-center text-center relative scale-105 z-10">
              <div className="absolute -top-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Crown className="w-3 h-3" />
                <span>#1 👑</span>
              </div>
              <div className="text-3xl mt-1">{sortedLeaderboard[0].avatar}</div>
              <span className="font-black text-xs text-slate-900 truncate w-full mt-0.5">
                {sortedLeaderboard[0].name}
              </span>
              <span className="text-[10px] text-amber-800 font-semibold flex items-center gap-0.5">
                <span>{sortedLeaderboard[0].flag}</span>
                <span className="truncate">{sortedLeaderboard[0].country}</span>
              </span>
              <div className="mt-1.5 w-full bg-amber-100/80 rounded-xl p-1 text-[10px] space-y-0.5">
                <span className="font-black text-emerald-800 block">
                  {sortedLeaderboard[0].accuracy}% Acc
                </span>
                <span className="font-black text-amber-900 block">
                  ⚡ {sortedLeaderboard[0].avgSpeedSeconds}s avg
                </span>
              </div>
            </div>
          )}

          {/* #3 Rank */}
          {sortedLeaderboard[2] && (
            <div className="bg-white rounded-2xl p-2.5 border border-slate-200 shadow-xs flex flex-col items-center text-center relative">
              <span className="absolute -top-2.5 bg-amber-700 text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-600 shadow-2xs">
                #3 🥉
              </span>
              <div className="text-2xl mt-1">{sortedLeaderboard[2].avatar}</div>
              <span className="font-black text-xs text-slate-900 truncate w-full mt-0.5">
                {sortedLeaderboard[2].name}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-0.5">
                <span>{sortedLeaderboard[2].flag}</span>
                <span className="truncate">{sortedLeaderboard[2].country}</span>
              </span>
              <div className="mt-1.5 w-full bg-indigo-50 rounded-xl p-1 text-[10px] space-y-0.5">
                <span className="font-black text-indigo-700 block">
                  {sortedLeaderboard[2].accuracy}% Acc
                </span>
                <span className="font-extrabold text-amber-700 block">
                  ⚡ {sortedLeaderboard[2].avgSpeedSeconds}s
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Complete Top 4 - 10 Ranked List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xs divide-y divide-gray-100 overflow-hidden">
          <div className="bg-slate-50 px-3 py-1.5 flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-wider">
            <span>Rank & Player</span>
            <span className="text-right">Accuracy • Speed Reflex</span>
          </div>

          {sortedLeaderboard.slice(3).map((player, idx) => {
            const rankNum = idx + 4;
            const isSelf = player.isCurrentUser;

            return (
              <div
                key={player.name + rankNum}
                className={`flex items-center justify-between p-2.5 text-xs transition-colors ${
                  isSelf ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">
                    {rankNum}
                  </span>
                  <span className="text-base shrink-0">{player.avatar}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-black text-slate-900 truncate">
                        {player.name} {isSelf && '(You)'}
                      </span>
                      <span className="text-xs">{player.flag}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 flex items-center gap-1.5 font-medium">
                      <span>{player.favoriteCategory}</span>
                      <span>•</span>
                      <span className="text-amber-700 font-bold">{player.quizzesCompleted} Solved</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="font-black text-emerald-700 text-xs">
                    {player.accuracy}% Acc
                  </div>
                  <div className="text-[10px] font-bold text-amber-700 flex items-center justify-end gap-0.5">
                    <Zap className="w-3 h-3 fill-amber-500 text-amber-500" />
                    <span>{player.avgSpeedSeconds}s avg</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* User Standing Summary Card */}
        <div className="p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              Your Live Quiz Standing: Rank #10
            </span>
            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              Top 10 Member
            </span>
          </div>
          <p className="text-[11px] text-indigo-800 font-medium">
            Answer quizzes faster with high accuracy to climb to Rank #1!
          </p>
        </div>
        </>
        )}
      </div>
    )}
      {/* AdMob Interstitial Modal (After completed quizzes only, respecting 2-min rate limit) */}
      <AdMobInterstitialModal
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
        seniorMode={seniorMode}
      />

      {/* AdMob Rewarded Video Modal */}
      <AdMobRewardedModal
        isOpen={showRewarded}
        onClose={() => setShowRewarded(false)}
        onRewardEarned={(bonus) => onEarnPoints(bonus, 'Watched Sponsored Video: Doubled Quiz Points 🪙')}
        baseRewardPoints={50}
        seniorMode={seniorMode}
      />

      {/* Streak Fire Celebration Animation */}
      <StreakFireCelebration
        streakDays={streakDays ?? 5}
        isOpen={showFireCelebration}
        onClose={() => setShowFireCelebration(false)}
        seniorMode={seniorMode}
      />
    </div>
  </div>
);
};