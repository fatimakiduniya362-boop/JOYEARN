import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Flame,
  Award,
  Search,
  BookOpen,
  Filter,
  ArrowLeft,
  X,
  Play,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Share2,
  Bell,
  Trophy,
  Brain,
  ChevronRight,
  User,
  Lightbulb
} from 'lucide-react';
import {
  getLevelForPoints,
  recordWeeklyChallengeActivity,
  shareQuizResultCard,
  unlockKnowledgeCardForCategory,
} from '../services/engagementService';
import { AppUser, QuizItem, DifficultyLevel } from '../types';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import {
  getDailyQuizForToday,
  isDailyQuizCompletedToday,
  markDailyQuizCompletedToday,
  getTodayDailyQuizScore,
  getTimeUntilMidnight,
  normalizeQuizDifficulty,
  getCorrectOptionIndex
} from '../services/dailyQuizService';
import { AlphabetLearningModule } from './AlphabetLearningModule';
import { NumbersLearningModule } from './NumbersLearningModule';
import { BioscienceExplorer } from './BioscienceExplorer';
import { adMobManager } from '../services/adMobService';
import { AdMobRewardedModal } from './AdMobRewardedModal';
import { LearningStreakCard } from './LearningStreakCard';
import { OfflineLearningPanel } from './OfflineLearningPanel';
import {
  getLocalLearningStreak,
  loadLearningStreak,
  recordDailyLearningActivity,
  LearningStreakState,
} from '../services/learningStreakService';

interface LearnPageProps {
  quizzes: QuizItem[];
  onEarnPoints: (points: number, reason: string) => void;
  seniorMode: boolean;
  completedQuizIds?: string[];
  onCompleteQuiz?: (quizId: string) => void;
  onDailyQuizCompleted?: () => void;
  streakDays?: number;
  onBackToHome?: () => void;
  initialSection?: 'alphabet' | 'numbers' | 'bioscience' | 'daily_quiz' | 'quizzes';
  initialView?: 'browse' | 'daily_quiz' | 'lesson_quiz';
  navigationTrigger?: number;
  userName?: string;
  userUid?: string;
  totalPoints?: number;
  onTriggerConfetti?: () => void;
  currentUser?: AppUser | null;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  unreadNotificationCount?: number;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  quizzes,
  onEarnPoints,
  seniorMode,
  completedQuizIds = [],
  onCompleteQuiz,
  onDailyQuizCompleted,
  streakDays = 0,
  onBackToHome,
  initialSection,
  initialView,
  navigationTrigger = 0,
  userName = 'Learner',
  userUid = 'local',
  totalPoints = 0,
  onTriggerConfetti,
  currentUser = null,
  onOpenNotifications,
  onOpenProfile,
  unreadNotificationCount = 0,
}) => {
  const { success, warning, selection } = useHaptics();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false);
  const activeModuleRef = React.useRef<HTMLDivElement | null>(null);
  const progressSectionRef = React.useRef<HTMLDivElement | null>(null);

  // Daily Learning Streak state (local-first + Firestore account sync)
  const [learningStreak, setLearningStreak] = useState<LearningStreakState>(() =>
    getLocalLearningStreak(userUid)
  );
  const [recentMilestoneNotice, setRecentMilestoneNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLearningStreak(getLocalLearningStreak(userUid));
    loadLearningStreak(userUid).then((synced) => {
      if (!cancelled) {
        setLearningStreak(synced);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userUid]);

  const recordLearningStreakProgress = async (activityLabel: string) => {
    const res = await recordDailyLearningActivity(userUid, activityLabel);
    setLearningStreak(res.state);
    if (res.unlockedMilestone) {
      const m = res.unlockedMilestone;
      onEarnPoints(m.points, `Learning Streak Milestone: ${m.days} Days (${m.label})`);
      setRecentMilestoneNotice(
        `${m.days}-day learning streak reached! +${m.points} in-app learning points added.`
      );
      onTriggerConfetti?.();
      setTimeout(() => setRecentMilestoneNotice(null), 6000);
    }
  };

  const handleModuleEarnPoints = (points: number, reason: string) => {
    onEarnPoints(points, reason);
    void recordLearningStreakProgress(reason);
  };

  // Active view: 'browse' (main educational curriculum) | 'daily_quiz' | 'lesson_quiz'
  const [activeView, setActiveView] = useState<'browse' | 'daily_quiz' | 'lesson_quiz'>(
    initialView || (initialSection === 'daily_quiz' ? 'daily_quiz' : 'browse')
  );

  // Active curriculum section tab
  const [curriculumSection, setCurriculumSection] = useState<'alphabet' | 'numbers' | 'bioscience' | 'daily_quiz' | 'quizzes'>(
    initialSection || 'alphabet'
  );

  useEffect(() => {
    if (initialSection) {
      setCurriculumSection(initialSection);
    }
    if (initialView) {
      setActiveView(initialView);
      if (initialView === 'daily_quiz') {
        const done = isDailyQuizCompletedToday();
        setDailyCompleted(done);
        if (!done) {
          setDailyIndex(0);
          setDailyScore(0);
          setDailyOptionSelected(null);
          setDailyAnswered(false);
          setEliminatedOptionIndex(null);
        }
      }
    } else if (initialSection === 'daily_quiz') {
      setActiveView('daily_quiz');
    } else if (initialSection) {
      setActiveView('browse');
    }
  }, [initialView, initialSection, navigationTrigger]);

  // Active single quiz state
  const [currentQuiz, setCurrentQuiz] = useState<QuizItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Beginner');

  // Daily Quiz state
  const todayQuizzes = useMemo(() => getDailyQuizForToday(quizzes), [quizzes]);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [dailyScore, setDailyScore] = useState(() => getTodayDailyQuizScore() ?? 0);
  const [dailyCompleted, setDailyCompleted] = useState(() => isDailyQuizCompletedToday());
  const [dailyOptionSelected, setDailyOptionSelected] = useState<number | null>(null);
  const [dailyAnswered, setDailyAnswered] = useState(false);
  const [timeUntilMidnight, setTimeUntilMidnight] = useState(() => getTimeUntilMidnight().formatted);

  useEffect(() => {
    if (!dailyCompleted) return;
    const timer = setInterval(() => {
      setTimeUntilMidnight(getTimeUntilMidnight().formatted);
    }, 1000);
    return () => clearInterval(timer);
  }, [dailyCompleted]);

  // Daily hints and rewarded state
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const [hintCountToday, setHintCountToday] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('joyearn_quiz_hints_today');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.date === todayDateStr) return parsed.count;
      }
    } catch {}
    return 0;
  });
  const [eliminatedOptionIndex, setEliminatedOptionIndex] = useState<number | null>(null);
  const [showHintRewarded, setShowHintRewarded] = useState(false);
  const [showRewardedDouble, setShowRewardedDouble] = useState(false);
  const [hasDoubledDailyPoints, setHasDoubledDailyPoints] = useState(false);

  // Categories extracted from quizzes
  const categories = useMemo(() => {
    const set = new Set<string>();
    quizzes.forEach((q) => {
      if (q.category) set.add(q.category);
    });
    return ['All', ...Array.from(set)];
  }, [quizzes]);

  // Filtered quizzes across all 4 quiz banks (handles Beginner/Intermediate/Advanced and easy/medium/hard)
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (selectedCategory !== 'All' && q.category !== selectedCategory) return false;
      if (selectedDifficulty) {
        if (normalizeQuizDifficulty(q.difficulty) !== selectedDifficulty) return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        return (
          q.question.toLowerCase().includes(query) ||
          (q.category && q.category.toLowerCase().includes(query)) ||
          (q.urduQuestion && q.urduQuestion.includes(query))
        );
      }
      return true;
    });
  }, [quizzes, selectedCategory, selectedDifficulty, searchQuery]);

  // Timer for active single lesson quiz
  useEffect(() => {
    if (activeView !== 'lesson_quiz' || isAnswered || !currentQuiz) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsAnswered(true);
          warning();
          soundService.playWrong();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [activeView, isAnswered, currentQuiz, warning]);

  // Start single lesson quiz
  const handleStartQuiz = (quiz: QuizItem) => {
    soundService.playClick();
    selection();
    setCurrentQuiz(quiz);
    setSelectedOption(null);
    setIsAnswered(false);
    setTimeLeft(15);
    setActiveView('lesson_quiz');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Start Daily Quiz
  const handleStartDailyQuiz = () => {
    soundService.playClick();
    selection();
    const alreadyDone = isDailyQuizCompletedToday();
    setDailyCompleted(alreadyDone);
    if (!alreadyDone) {
      setDailyIndex(0);
      setDailyScore(0);
      setDailyOptionSelected(null);
      setDailyAnswered(false);
      setEliminatedOptionIndex(null);
    }
    setActiveView('daily_quiz');
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // Return back to Learn browse view
  const handleBackToLearn = () => {
    soundService.playClick();
    setActiveView('browse');
    setCurrentQuiz(null);
    setSelectedOption(null);
    setIsAnswered(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const lessonMultiplier = selectedDifficulty === 'Advanced' ? 2.0 : selectedDifficulty === 'Intermediate' ? 1.5 : 1.0;

  // Submit answer for single quiz
  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQuiz) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === getCorrectOptionIndex(currentQuiz);
    if (isCorrect) {
      soundService.playCorrect();
      success();
      const pts = Math.round(currentQuiz.points * lessonMultiplier);
      onCompleteQuiz?.(currentQuiz.id);
      onEarnPoints(pts, `Completed Lesson Quiz: ${currentQuiz.category}`);
      recordWeeklyChallengeActivity(userUid, userName, Math.min(20, pts), `lesson_${currentQuiz.id}`);
      const unlocked = unlockKnowledgeCardForCategory(userUid, currentQuiz.category || 'general');
      if (unlocked.completedSet) {
        onTriggerConfetti?.();
      }
      void recordLearningStreakProgress(`Lesson Quiz: ${currentQuiz.category}`);
    } else {
      soundService.playWrong();
      warning();
    }
  };

  // Daily quiz option select
  const handleDailyOptionSelect = (index: number) => {
    if (dailyAnswered || dailyCompleted) return;
    const currentQ = todayQuizzes[dailyIndex];
    if (!currentQ) return;

    setDailyOptionSelected(index);
    setDailyAnswered(true);

    const isCorrect = index === getCorrectOptionIndex(currentQ);
    if (isCorrect) {
      soundService.playCorrect();
      success();
      setDailyScore((s) => s + 1);
      onEarnPoints(20, `Daily Quiz Q${dailyIndex + 1} Correct`);
    } else {
      soundService.playWrong();
      warning();
    }
  };

  const handleNextDailyQuestion = () => {
    soundService.playClick();
    setEliminatedOptionIndex(null);
    if (dailyIndex < todayQuizzes.length - 1) {
      setDailyIndex((i) => i + 1);
      setDailyOptionSelected(null);
      setDailyAnswered(false);
    } else {
      setDailyCompleted(true);
      markDailyQuizCompletedToday(dailyScore);
      onDailyQuizCompleted?.();
      soundService.playFanfare();
      if (dailyScore === todayQuizzes.length) {
        onEarnPoints(50, 'Perfect 5/5 Daily Educational Quiz Bonus 🎉');
      }
      const dailyPts = Math.min(25, dailyScore * 5);
      if (dailyPts > 0) {
        recordWeeklyChallengeActivity(userUid, userName, dailyPts, `daily_quiz_${todayDateStr}`);
      }
      const unlocked = unlockKnowledgeCardForCategory(userUid, todayQuizzes[0]?.category || 'science');
      if (unlocked.completedSet) {
        onTriggerConfetti?.();
      }
      void recordLearningStreakProgress('Daily Educational Quiz');
    }
  };

  const handleShareQuizResult = async (title: string, score: number, total: number) => {
    soundService.playClick();
    setIsSharingResult(true);
    setShareStatus(null);
    const lvl = getLevelForPoints(totalPoints).current.name;
    const res = await shareQuizResultCard({
      quizTitle: title,
      score,
      total,
      userName,
      streakDays,
      levelName: lvl,
    });
    setIsSharingResult(false);
    setShareStatus(res.message);
    setTimeout(() => setShareStatus(null), 3500);
  };

  // Real learning progress computed strictly from actual user completions (never hardcoded)
  const practicedLettersCount = useMemo(() => {
    try {
      const saved = localStorage.getItem('joyearn_practiced_letters');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return Math.min(26, parsed.length);
      }
    } catch {}
    return 0;
  }, [curriculumSection, completedQuizIds.length]);

  const actualLearningProgressPct = useMemo(() => {
    const alphabetRatio = Math.min(1, practicedLettersCount / 26);
    const totalQuizzes = Math.max(1, quizzes.length);
    const quizRatio = Math.min(1, completedQuizIds.length / Math.min(totalQuizzes, 20));
    const dailyBonus = dailyCompleted ? 0.15 : 0;
    const streakRatio = Math.min(1, (learningStreak.currentStreak || 0) / 7) * 0.2;
    const combined = Math.min(1, alphabetRatio * 0.35 + quizRatio * 0.3 + dailyBonus + streakRatio);
    return Math.round(combined * 100);
  }, [practicedLettersCount, quizzes.length, completedQuizIds.length, dailyCompleted, learningStreak.currentStreak]);

  const scrollToActiveModule = () => {
    requestAnimationFrame(() => {
      activeModuleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  return (
    <div className="w-full flex flex-col bg-white min-h-screen pb-28 max-w-lg mx-auto">
      {/* =========================================================================
          VIEW A: DEDICATED LESSON QUIZ PLAYER
         ========================================================================= */}
      {activeView === 'lesson_quiz' && currentQuiz ? (
        <div className="flex flex-col w-full p-4 space-y-4 animate-fadeIn">
          {/* Header with Back button */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLearn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-100 tap-bounce"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{seniorMode ? 'تعلیمی اسباق پر واپس' : 'Back to Learn'}</span>
            </button>

            <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              +{Math.round(currentQuiz.points * lessonMultiplier)} Pts Reward
            </span>
          </div>

          {/* Quiz Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-600 uppercase tracking-wider">
                {currentQuiz.category} • {normalizeQuizDifficulty(currentQuiz.difficulty)}
              </span>
              <div className="flex items-center gap-1 font-black text-slate-500">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span className={timeLeft <= 5 ? 'text-rose-600 font-extrabold' : ''}>{timeLeft}s</span>
              </div>
            </div>

            <h2 className="text-base font-extrabold text-slate-900 leading-snug">
              {seniorMode && currentQuiz.urduQuestion ? currentQuiz.urduQuestion : currentQuiz.question}
            </h2>

            {/* Answer Options */}
            <div className="space-y-2.5 pt-2">
              {currentQuiz.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isCorrect = idx === getCorrectOptionIndex(currentQuiz);

                let btnStyle = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-black shadow-xs';
                  } else if (isSelected) {
                    btnStyle = 'bg-rose-100 border-rose-400 text-rose-900 font-bold';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all tap-bounce flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {isAnswered && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                    {isAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Answer Result Banner */}
            {isAnswered && (
              <div className="pt-3 border-t border-slate-100 space-y-3 animate-fadeIn">
                <div
                  className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                    selectedOption === getCorrectOptionIndex(currentQuiz)
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span className="text-base">
                    {selectedOption === getCorrectOptionIndex(currentQuiz) ? '🎉' : '💡'}
                  </span>
                  <span>
                    {selectedOption === getCorrectOptionIndex(currentQuiz)
                      ? `Correct! You earned +${Math.round(currentQuiz.points * lessonMultiplier)} JoyPoints.`
                      : 'Good try! Keep learning to boost your score.'}
                  </span>
                </div>

                {(currentQuiz.fact || currentQuiz.explanation) && (
                  <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-slate-700 leading-relaxed">
                    <span className="font-black text-indigo-900 block mb-0.5">Knowledge Fact:</span>
                    {currentQuiz.fact || currentQuiz.explanation}
                  </div>
                )}

                <button
                  type="button"
                  disabled={isSharingResult}
                  onClick={() =>
                    handleShareQuizResult(
                      `${currentQuiz.category} Quiz`,
                      selectedOption === getCorrectOptionIndex(currentQuiz) ? 1 : 0,
                      1
                    )
                  }
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs tap-bounce shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isSharingResult ? 'Creating Result Card...' : 'Share My Result'}</span>
                </button>
                {shareStatus && (
                  <p className="text-[11px] font-bold text-center text-emerald-700">{shareStatus}</p>
                )}

                <button
                  onClick={handleBackToLearn}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs tap-bounce shadow-md"
                >
                  Continue Learning More Topics
                </button>
              </div>
            )}
          </div>
        </div>
      ) : activeView === 'daily_quiz' ? (
        /* =========================================================================
            VIEW B: DEDICATED 5-QUESTION DAILY ROTATING QUIZ
           ========================================================================= */
        <div className="flex flex-col w-full p-4 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBackToLearn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs hover:bg-slate-100 tap-bounce"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{seniorMode ? 'واپس' : 'Back to Learn'}</span>
            </button>

            <span className="text-xs font-black text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {dailyCompleted ? '5 of 5 Complete ✓' : `Question ${dailyIndex + 1} of ${todayQuizzes.length}`}
            </span>
          </div>

          {dailyCompleted ? (
            /* Completed / Midnight Lock Screen */
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🏆
              </div>
              <h2 className="text-lg font-black text-slate-900">
                {seniorMode ? 'آج کا روزانہ کوئز مکمل ہو چکا ہے!' : 'Daily Quiz Complete!'}
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                You scored <strong className="text-emerald-600 font-black">{getTodayDailyQuizScore() ?? dailyScore}/{todayQuizzes.length}</strong> today. Next daily quiz unlocks automatically at midnight!
              </p>

              <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-1 max-w-xs mx-auto shadow-inner border border-slate-700">
                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Next Quiz Unlocks In:</span>
                </div>
                <div className="text-lg font-mono font-black text-amber-400 tracking-wider">
                  {timeUntilMidnight}
                </div>
              </div>

              {/* Rewarded Video Double Points Button (AdMob) */}
              {adMobManager.getConfig().adsEnabled && !hasDoubledDailyPoints && (
                <button
                  type="button"
                  onClick={() => setShowRewardedDouble(true)}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-slate-950 rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 fill-slate-950" />
                  <span>{seniorMode ? 'ویڈیو دیکھیں اور پوائنٹس ڈبل کریں (2x)' : 'Watch Video to Double Points (2x) 🪙'}</span>
                </button>
              )}

              <button
                type="button"
                disabled={isSharingResult}
                onClick={() =>
                  handleShareQuizResult(
                    'Daily Educational Quiz',
                    getTodayDailyQuizScore() ?? dailyScore,
                    todayQuizzes.length
                  )
                }
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>{isSharingResult ? 'Creating Result Card...' : 'Share My Result'}</span>
              </button>
              {shareStatus && (
                <p className="text-[11px] font-bold text-center text-emerald-700">{shareStatus}</p>
              )}

              <button
                onClick={handleBackToLearn}
                className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-xs tap-bounce shadow-md"
              >
                Return to Learning Hub
              </button>
            </div>
          ) : (
            /* Active Daily Question */
            todayQuizzes[dailyIndex] && (
              <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-amber-600 uppercase tracking-wider">
                    {todayQuizzes[dailyIndex].category}
                  </span>
                  <span className="font-extrabold text-slate-500">
                    Score: {dailyScore}/{dailyIndex + (dailyAnswered ? 1 : 0)}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                    {seniorMode && todayQuizzes[dailyIndex].urduQuestion
                      ? todayQuizzes[dailyIndex].urduQuestion
                      : todayQuizzes[dailyIndex].question}
                  </h3>
                </div>

                {/* Rewarded Video Hint Button (Max 2/day, hidden if ads disabled) */}
                {adMobManager.getConfig().adsEnabled && hintCountToday < 2 && !dailyAnswered && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowHintRewarded(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-full text-[10.5px] font-bold tap-bounce hover:bg-amber-200"
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{seniorMode ? `اشارہ حاصل کریں (${2 - hintCountToday} باقی)` : `Watch Video for Hint (${2 - hintCountToday} left) 💡`}</span>
                    </button>
                  </div>
                )}

                <div className="space-y-2.5 pt-2">
                  {todayQuizzes[dailyIndex].options.map((option, idx) => {
                    const isSelected = dailyOptionSelected === idx;
                    const isCorrect = idx === getCorrectOptionIndex(todayQuizzes[dailyIndex]);
                    const isEliminated = eliminatedOptionIndex === idx;

                    let btnStyle = 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800';
                    if (isEliminated) {
                      btnStyle = 'opacity-35 line-through bg-slate-100 border-dashed border-slate-300 text-slate-400 cursor-not-allowed';
                    } else if (dailyAnswered) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-black shadow-xs';
                      } else if (isSelected) {
                        btnStyle = 'bg-rose-100 border-rose-400 text-rose-900 font-bold';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={dailyAnswered || isEliminated}
                        onClick={() => handleDailyOptionSelect(idx)}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs font-bold transition-all tap-bounce flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{option}</span>
                        {dailyAnswered && isCorrect && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
                        {dailyAnswered && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                {dailyAnswered && (
                  <div className="pt-3 border-t border-slate-100 space-y-3">
                    {(todayQuizzes[dailyIndex].fact || todayQuizzes[dailyIndex].explanation) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-slate-700 leading-relaxed">
                        <span className="font-black text-amber-900 text-[10px] uppercase block mb-0.5">
                          Did you know?
                        </span>
                        {todayQuizzes[dailyIndex].fact || todayQuizzes[dailyIndex].explanation}
                      </div>
                    )}
                    <button
                      onClick={handleNextDailyQuestion}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-black text-xs tap-bounce shadow-md flex items-center justify-center gap-1.5"
                    >
                      <span>{dailyIndex < todayQuizzes.length - 1 ? 'Next Question →' : 'Finish Daily Quiz 🏁'}</span>
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : (
        /* =========================================================================
            VIEW C: MAIN LEARNING HUB & QUIZ CURRICULUM BROWSER (PINK & WHITE)
           ========================================================================= */
        <div className="flex flex-col w-full bg-white">
          {/* 1. STICKY PINK-AND-WHITE HEADER */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md">
            <div className="px-4 pt-3.5 pb-2.5 flex items-center justify-between">
              {/* Left: JoyEarn Logo */}
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#ff1b8d] to-[#d9006c] flex items-center justify-center shadow-sm">
                  <Play className="w-[18px] h-[18px] text-white fill-white ml-0.5" />
                </div>
                <span className="text-[22px] font-extrabold tracking-tight text-[#ec0078] leading-none">
                  JoyEarn
                </span>
              </div>

              {/* Right: Search, Notification Bell with Badge, Profile Avatar */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setHeaderSearchOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        setCurriculumSection('quizzes');
                      } else {
                        setSearchQuery('');
                      }
                      return next;
                    });
                  }}
                  aria-label="Search lessons and quizzes"
                  className={`p-1.5 rounded-full transition-colors tap-bounce ${
                    headerSearchOpen ? 'bg-pink-100 text-[#ec0078]' : 'text-slate-900 hover:bg-pink-50'
                  }`}
                >
                  <Search className="w-[22px] h-[22px]" strokeWidth={2.2} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onOpenNotifications?.();
                  }}
                  aria-label="Notifications"
                  className="relative p-1.5 rounded-full text-slate-900 hover:bg-pink-50 transition-colors tap-bounce"
                >
                  <Bell className="w-[22px] h-[22px]" strokeWidth={2.2} />
                  {unreadNotificationCount > 0 && (
                    <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black leading-none flex items-center justify-center border-2 border-white tabular-nums">
                      {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    onOpenProfile?.();
                  }}
                  aria-label="User profile and settings"
                  className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-pink-200 bg-gradient-to-br from-pink-100 to-rose-200 flex items-center justify-center shrink-0 tap-bounce"
                >
                  {currentUser?.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : currentUser?.displayName ? (
                    <span className="text-sm font-extrabold text-[#ec0078]">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <User className="w-5 h-5 text-[#ec0078]" />
                  )}
                </button>
              </div>
            </div>

            {/* Expandable Header Search Bar */}
            {headerSearchOpen && (
              <div className="px-4 pb-2.5">
                <div className="flex items-center gap-2 bg-pink-50/90 border border-pink-200 rounded-full px-3.5 py-2">
                  <Search className="w-4 h-4 text-[#ec0078] shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (curriculumSection !== 'quizzes' && curriculumSection !== 'daily_quiz') {
                        setCurriculumSection('quizzes');
                      }
                    }}
                    placeholder={seniorMode ? 'اسباق یا کوئز تلاش کریں...' : 'Search quizzes, science, math, lessons...'}
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-rose-400 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Clear search"
                      className="p-0.5 rounded-full text-rose-500 hover:bg-pink-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 2. FIVE CATEGORY FILTER PILLS (A-Z, 1-100, Quiz, Brain, Stories) */}
            <div className="px-4 pb-3 pt-0.5 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {[
                { id: 'alphabet' as const, label: 'A-Z' },
                { id: 'numbers' as const, label: '1-100' },
                { id: 'quizzes' as const, label: 'Quiz' },
                { id: 'daily_quiz' as const, label: 'Brain' },
                { id: 'bioscience' as const, label: 'Stories' },
              ].map((tab) => {
                const isActive = curriculumSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      soundService.playClick();
                      selection();
                      setCurriculumSection(tab.id);
                      scrollToActiveModule();
                    }}
                    className={`flex-1 min-w-[68px] px-4 py-2 rounded-full text-[13.5px] whitespace-nowrap transition-all tap-bounce text-center ${
                      isActive
                        ? 'bg-[#ec0078] text-white font-bold shadow-xs'
                        : 'bg-[#fce7f3] text-[#831843] font-semibold hover:bg-[#fbcfe8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </header>

          {/* MAIN CONTENT BODY */}
          <div className="px-4 space-y-4 pt-1">
            {/* 3. HERO BANNER ("Learn & Grow with JoyEarn — Study • Play • Earn") */}
            <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-5 py-4 text-white shadow-md shadow-pink-200/70 flex items-center justify-between gap-3">
              <div className="relative z-10 space-y-1">
                <h1 className="text-[22px] sm:text-[24px] font-black leading-[1.1] tracking-tight italic drop-shadow-xs">
                  <span className="block text-white">
                    {seniorMode ? 'سیکھیں اور آگے بڑھیں' : 'Learn & Grow'}
                  </span>
                  <span className="block">
                    <span className="text-white">{seniorMode ? '' : 'with '}</span>
                    <span className="text-[#fde047]">JoyEarn</span>
                  </span>
                </h1>
                <p className="text-[12.5px] font-bold text-white/95 tracking-wide pt-1">
                  {seniorMode ? 'پڑھیں • کھیلیں • کمائیں' : 'Study • Play • Earn'}
                </p>
              </div>

              {/* Decorative Study Books & Lightbulb Visual */}
              <div className="relative z-10 shrink-0 w-24 h-20 flex items-center justify-center">
                <div className="absolute -top-1 right-0 w-8 h-8 rounded-full bg-yellow-300/95 border-2 border-white shadow-sm flex items-center justify-center">
                  <Lightbulb className="w-4 h-4 text-amber-800" />
                </div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center shadow-inner">
                  <BookOpen className="w-9 h-9 text-white" />
                </div>
              </div>
            </div>

            {/* 4. TWO-COLUMN QUICK LAUNCH CARDS (Learn A-Z & Learn 1-100) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Card 1: Learn A-Z */}
              <div
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setCurriculumSection('alphabet');
                  scrollToActiveModule();
                }}
                className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-[24px] p-4 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center text-center gap-2"
              >
                <div className="flex items-center justify-center gap-0.5 text-[30px] font-black leading-none tracking-tight select-none pt-1">
                  <span className="text-[#ef4444] drop-shadow-xs">A</span>
                  <span className="text-[#f59e0b] drop-shadow-xs">B</span>
                  <span className="text-[#2563eb] drop-shadow-xs">C</span>
                </div>
                <div>
                  <h2 className="text-[15px] font-extrabold text-slate-900 leading-tight">
                    {seniorMode ? 'حروف A-Z' : 'Learn A-Z'}
                  </h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    {seniorMode ? 'مکمل ۲۶ حروف' : 'Complete 26 letters'}
                  </p>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#ec0078] text-white text-[11.5px] font-bold shadow-xs">
                  <span>{seniorMode ? 'شروع کریں' : 'Start Learning'}</span>
                  <Play className="w-3 h-3 fill-white" />
                </span>
              </div>

              {/* Card 2: Learn 1-100 */}
              <div
                onClick={() => {
                  soundService.playClick();
                  selection();
                  setCurriculumSection('numbers');
                  scrollToActiveModule();
                }}
                className="bg-[#fdf2f8] hover:bg-[#fce7f3] rounded-[24px] p-4 border border-pink-100 shadow-2xs transition-all cursor-pointer tap-bounce flex flex-col items-center text-center gap-2"
              >
                <div className="flex items-center justify-center gap-0.5 text-[30px] font-black leading-none tracking-tight select-none pt-1">
                  <span className="text-[#ec0078] drop-shadow-xs">1</span>
                  <span className="text-[#2563eb] drop-shadow-xs">2</span>
                  <span className="text-[#f59e0b] drop-shadow-xs">3</span>
                </div>
                <div>
                  <h2 className="text-[15px] font-extrabold text-slate-900 leading-tight">
                    {seniorMode ? 'گنتی 1-100' : 'Learn 1-100'}
                  </h2>
                  <p className="text-[11.5px] text-slate-600 mt-0.5">
                    {seniorMode ? '۱ سے ۱۰۰ تک گنتی' : 'Count from 1 to 100'}
                  </p>
                </div>
                <span className="mt-1 inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-[#ec0078] text-white text-[11.5px] font-bold shadow-xs">
                  <span>{seniorMode ? 'گنتی شروع' : 'Start Counting'}</span>
                  <Play className="w-3 h-3 fill-white" />
                </span>
              </div>
            </div>

            {/* 5. LEARNING PROGRESS CARD (REAL USER PROGRESS — ZERO FAKE NUMBERS) */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 rounded-full bg-[#ec0078]" />
                  <h2 className="font-extrabold text-slate-900 text-sm">
                    {seniorMode ? 'سیکھنے کی پیشرفت' : 'Learning Progress'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    progressSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="text-xs font-extrabold text-[#ec0078] hover:text-[#be0060] flex items-center gap-0.5 tap-bounce"
                >
                  <span>{seniorMode ? 'سب دیکھیں' : 'View All'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-[#fdf2f8] border border-pink-100 rounded-[24px] p-4 flex items-center gap-3.5 shadow-2xs">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center shadow-sm shrink-0">
                  <Trophy className="w-8 h-8 text-white drop-shadow-xs" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11.5px] font-bold text-slate-700 leading-none">
                        {seniorMode ? 'آپ کی پیشرفت' : 'Your Progress'}
                      </p>
                      <p className="text-2xl font-black text-[#ec0078] leading-tight tabular-nums mt-0.5">
                        {actualLearningProgressPct}%
                      </p>
                    </div>
                    <span className="text-[11.5px] font-extrabold text-slate-700 flex items-center gap-1 shrink-0">
                      <span>⭐</span>
                      <span>
                        {actualLearningProgressPct >= 50
                          ? seniorMode
                            ? 'شاندار!'
                            : 'Great Work!'
                          : seniorMode
                            ? 'جاری رکھیں!'
                            : 'Keep Going!'}
                      </span>
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-pink-200/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#ff2a8d] to-[#ec0078] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(actualLearningProgressPct, actualLearningProgressPct > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500 truncate">
                    {practicedLettersCount}/26 Letters • {completedQuizIds.length} Quizzes • {learningStreak.currentStreak}d Streak
                  </p>
                </div>
              </div>
            </section>

            {/* 6. BRAIN ACTIVITY BANNER (LAUNCHES DAILY 5-QUESTION QUIZ) */}
            <div
              onClick={handleStartDailyQuiz}
              className="rounded-[24px] bg-gradient-to-r from-[#d9006c] via-[#ec0078] to-[#f472b6] px-4 py-3.5 text-white shadow-md shadow-pink-200/70 cursor-pointer tap-bounce flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
                  <Brain className="w-7 h-7 text-pink-100" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-black leading-tight truncate">
                    {seniorMode ? 'دماغی سرگرمی' : 'Brain Activity'}
                  </h3>
                  <p className="text-[12px] font-extrabold italic text-[#fde047] truncate">
                    {seniorMode ? 'اپنی ذہنی طاقت بڑھائیں!' : 'Boost Your Brain Power!'}
                  </p>
                </div>
              </div>

              <span className="px-4 py-2 rounded-full bg-white text-[#9d174d] font-black text-xs inline-flex items-center gap-1 shrink-0 shadow-sm">
                <span>{dailyCompleted ? 'Done ✓' : seniorMode ? 'کھیلیں' : 'Play Now'}</span>
                {!dailyCompleted && <Play className="w-3 h-3 fill-[#ec0078] text-[#ec0078]" />}
              </span>
            </div>

            {/* 7. ACTIVE LEARNING MODULE (A-Z / 1-100 / STORIES / QUIZZES) */}
            <div ref={activeModuleRef} className="pt-1 space-y-4">
              {curriculumSection === 'alphabet' && (
                <AlphabetLearningModule
                  seniorMode={seniorMode}
                  onEarnPoints={handleModuleEarnPoints}
                />
              )}

              {curriculumSection === 'numbers' && (
                <NumbersLearningModule
                  seniorMode={seniorMode}
                  onEarnPoints={handleModuleEarnPoints}
                />
              )}

              {curriculumSection === 'bioscience' && (
                <BioscienceExplorer
                  seniorMode={seniorMode}
                  onEarnPoints={handleModuleEarnPoints}
                />
              )}

            {(curriculumSection === 'daily_quiz' || curriculumSection === 'quizzes') && (
              <div className="space-y-4">
                {/* Daily Quiz Highlight Card */}
                <div className="bg-white rounded-3xl p-4 border border-rose-200/80 shadow-xs flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">
                        Daily Challenge
                      </span>
                      <span className="text-xs font-extrabold text-slate-900">Today's 5-Question Quiz</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">
                      {dailyCompleted ? '✓ Completed today! Next quiz arrives at local midnight.' : 'Answer 5 questions to earn up to +150 JoyPoints and advance daily goal.'}
                    </p>
                  </div>

                  <button
                    onClick={handleStartDailyQuiz}
                    disabled={dailyCompleted}
                    className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 tap-bounce shadow ${
                      dailyCompleted
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                    }`}
                  >
                    {dailyCompleted ? 'Done ✓' : 'Play Quiz →'}
                  </button>
                </div>

                {/* Search Input for Question Bank */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={seniorMode ? 'کوئز تلاش کریں...' : 'Search science, biology, math, arts questions...'}
                    className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-white placeholder-slate-400 text-slate-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-200 border border-slate-200 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

          {/* Category Filter Pills */}
          <div className="px-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4">
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      soundService.playClick();
                      selection();
                      setSelectedCategory(cat);
                    }}
                    className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-extrabold transition-all tap-bounce ${
                      isSelected
                        ? 'bg-[#ec0078] text-white shadow-sm'
                        : 'bg-[#fce7f3] text-[#831843] hover:bg-[#fbcfe8]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Difficulty Level Selector */}
          <div className="px-4 flex items-center gap-2 text-xs">
            <span className="font-bold text-slate-500 text-[11px]">Level:</span>
            {(['Beginner', 'Intermediate', 'Advanced'] as DifficultyLevel[]).map((diff) => (
              <button
                key={diff}
                onClick={() => {
                  soundService.playClick();
                  setSelectedDifficulty(diff);
                }}
                className={`px-2.5 py-1 rounded-xl font-bold text-[11px] transition-all tap-bounce ${
                  selectedDifficulty === diff
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>

          {/* Quiz Lesson Cards List */}
          <div className="px-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>Lessons & Quizzes ({filteredQuizzes.length})</span>
              <span className="text-[11px] text-emerald-600 font-black">Tap to Start</span>
            </div>

            {filteredQuizzes.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 space-y-2">
                <div className="text-3xl">🔍</div>
                <h3 className="font-bold text-slate-700 text-sm">No quizzes found</h3>
                <p className="text-xs text-slate-500">
                  Try selecting "All" categories or clearing your search.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold tap-bounce"
                >
                  Reset Filter
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredQuizzes.map((quiz) => {
                  const completed = completedQuizIds.includes(quiz.id);

                  return (
                    <div
                      key={quiz.id}
                      onClick={() => handleStartQuiz(quiz)}
                      className="p-3.5 bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-300 transition-all cursor-pointer tap-bounce shadow-2xs hover:shadow flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            {quiz.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {normalizeQuizDifficulty(quiz.difficulty)}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2">
                          {seniorMode && quiz.urduQuestion ? quiz.urduQuestion : quiz.question}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          +{Math.round(quiz.points * lessonMultiplier)} Pts
                        </span>
                        {completed ? (
                          <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </span>
                        ) : (
                          <span className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center text-slate-500">
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
              </div>
            )}
            </div>

            {/* 8. PRESERVED LEARNING STREAK & OFFLINE LEARNING MODE */}
            <div ref={progressSectionRef} className="space-y-4 pt-2">
              <LearningStreakCard
                streak={learningStreak}
                seniorMode={seniorMode}
                recentMilestoneNotice={recentMilestoneNotice}
              />

              <OfflineLearningPanel
                quizzes={quizzes}
                userUid={userUid}
                seniorMode={seniorMode}
                onCompleteLesson={onCompleteQuiz}
                onRecordStreakActivity={(label) => {
                  void recordLearningStreakProgress(label);
                }}
              />
            </div>
          </div>

        </div>
      )}

      {/* Rewarded Video Modal for Double Quiz Points */}
      <AdMobRewardedModal
        isOpen={showRewardedDouble}
        onClose={() => setShowRewardedDouble(false)}
        onRewardEarned={(bonus) => {
          setHasDoubledDailyPoints(true);
          onEarnPoints(bonus || 50, 'Watched Sponsored Video: Doubled Quiz Points 🪙');
          setShowRewardedDouble(false);
        }}
        baseRewardPoints={50}
        seniorMode={seniorMode}
      />

      {/* Rewarded Video Modal for Question Hint */}
      <AdMobRewardedModal
        isOpen={showHintRewarded}
        onClose={() => setShowHintRewarded(false)}
        onRewardEarned={() => {
          const nextCount = hintCountToday + 1;
          setHintCountToday(nextCount);
          try {
            localStorage.setItem('joyearn_quiz_hints_today', JSON.stringify({ date: todayDateStr, count: nextCount }));
          } catch {}
          const currentQ = todayQuizzes[dailyIndex];
          if (currentQ) {
            const correct = getCorrectOptionIndex(currentQ);
            const wrongIndices = currentQ.options
              .map((_, idx) => idx)
              .filter((idx) => idx !== correct);
            if (wrongIndices.length > 0) {
              setEliminatedOptionIndex(wrongIndices[0]);
            }
          }
          setShowHintRewarded(false);
        }}
        baseRewardPoints={0}
        seniorMode={seniorMode}
      />
    </div>
  );
};

