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
  Clock
} from 'lucide-react';
import { QuizItem, DifficultyLevel } from '../types';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';
import { getTodayDailyQuiz } from '../utils/dailyRotation';
import { isDailyQuizCompletedToday, markDailyQuizCompletedToday } from '../services/dailyQuizService';
import { AlphabetLearningModule } from './AlphabetLearningModule';
import { NumbersLearningModule } from './NumbersLearningModule';
import { BioscienceExplorer } from './BioscienceExplorer';
import { adMobManager } from '../services/adMobService';
import { AdMobRewardedModal } from './AdMobRewardedModal';

interface LearnPageProps {
  quizzes: QuizItem[];
  onEarnPoints: (points: number, reason: string) => void;
  seniorMode: boolean;
  completedQuizIds?: string[];
  onCompleteQuiz?: (quizId: string) => void;
  onDailyQuizCompleted?: () => void;
  streakDays?: number;
  onBackToHome?: () => void;
}

export const LearnPage: React.FC<LearnPageProps> = ({
  quizzes,
  onEarnPoints,
  seniorMode,
  completedQuizIds = [],
  onCompleteQuiz,
  onDailyQuizCompleted,
  streakDays = 5,
  onBackToHome,
}) => {
  const { light, success, warning, selection } = useHaptics();

  // Active view: 'browse' (main educational curriculum) | 'daily_quiz' | 'lesson_quiz'
  const [activeView, setActiveView] = useState<'browse' | 'daily_quiz' | 'lesson_quiz'>('browse');

  // Active curriculum section tab
  const [curriculumSection, setCurriculumSection] = useState<'alphabet' | 'numbers' | 'bioscience' | 'daily_quiz' | 'quizzes'>('alphabet');

  // Active single quiz state
  const [currentQuiz, setCurrentQuiz] = useState<QuizItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Beginner');

  // Daily Quiz state
  const todayQuizzes = useMemo(() => getTodayDailyQuiz(), []);
  const [dailyIndex, setDailyIndex] = useState(0);
  const [dailyScore, setDailyScore] = useState(0);
  const [dailyCompleted, setDailyCompleted] = useState(() => isDailyQuizCompletedToday());
  const [dailyOptionSelected, setDailyOptionSelected] = useState<number | null>(null);
  const [dailyAnswered, setDailyAnswered] = useState(false);

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

  // Filtered quizzes
  const filteredQuizzes = useMemo(() => {
    return quizzes.filter((q) => {
      if (selectedCategory !== 'All' && q.category !== selectedCategory) return false;
      if (selectedDifficulty) {
        const qDiff = (q.difficulty || 'Beginner').toLowerCase();
        if (qDiff !== selectedDifficulty.toLowerCase()) {
          if (selectedDifficulty !== 'Beginner' && !q.difficulty) return false;
        }
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
    setDailyIndex(0);
    setDailyScore(0);
    setDailyOptionSelected(null);
    setDailyAnswered(false);
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

  // Submit answer for single quiz
  const handleSelectOption = (index: number) => {
    if (isAnswered || !currentQuiz) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuiz.correctIndex || index === currentQuiz.correctAnswer;
    if (isCorrect) {
      soundService.playCorrect();
      success();
      const mult = selectedDifficulty === 'Advanced' ? 2.0 : selectedDifficulty === 'Intermediate' ? 1.5 : 1.0;
      const pts = Math.round(currentQuiz.points * mult);
      onCompleteQuiz?.(currentQuiz.id);
      onEarnPoints(pts, `Completed Lesson Quiz: ${currentQuiz.category}`);
    } else {
      soundService.playWrong();
      warning();
    }
  };

  // Daily quiz option select
  const handleDailyOptionSelect = (index: number) => {
    if (dailyAnswered) return;
    const currentQ = todayQuizzes[dailyIndex];
    if (!currentQ) return;

    setDailyOptionSelected(index);
    setDailyAnswered(true);

    const isCorrect = index === currentQ.correctIndex || index === currentQ.correctAnswer;
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
    }
  };

  return (
    <div className="w-full flex flex-col bg-slate-50 min-h-full pb-28">
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
              +{currentQuiz.points} Pts Reward
            </span>
          </div>

          {/* Quiz Card */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-emerald-600 uppercase tracking-wider">
                {currentQuiz.category} • {currentQuiz.difficulty || 'Beginner'}
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
                const isCorrect = idx === currentQuiz.correctIndex || idx === currentQuiz.correctAnswer;

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
                    selectedOption === currentQuiz.correctIndex || selectedOption === currentQuiz.correctAnswer
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  <span className="text-base">
                    {selectedOption === currentQuiz.correctIndex || selectedOption === currentQuiz.correctAnswer ? '🎉' : '💡'}
                  </span>
                  <span>
                    {selectedOption === currentQuiz.correctIndex || selectedOption === currentQuiz.correctAnswer
                      ? `Correct! You earned +${currentQuiz.points} JoyPoints.`
                      : 'Good try! Keep learning to boost your score.'}
                  </span>
                </div>

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
              Question {dailyIndex + 1} of {todayQuizzes.length}
            </span>
          </div>

          {dailyCompleted && dailyIndex >= todayQuizzes.length - 1 && dailyAnswered ? (
            /* Completed Screen */
            <div className="bg-white rounded-3xl p-6 border border-slate-200 text-center space-y-4 shadow-sm animate-fadeIn">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
                🏆
              </div>
              <h2 className="text-lg font-black text-slate-900">
                Daily Quiz Complete!
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto">
                You answered <strong className="text-emerald-600 font-black">{dailyScore}/{todayQuizzes.length}</strong> questions correctly. Your daily streak has been updated!
              </p>

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
                    Score: {dailyScore}/{dailyIndex + 1}
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
                    const isCorrect = idx === todayQuizzes[dailyIndex].correctIndex || idx === todayQuizzes[dailyIndex].correctAnswer;
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
                  <div className="pt-3 border-t border-slate-100">
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
            VIEW C: MAIN LEARNING HUB & QUIZ CURRICULUM BROWSER
           ========================================================================= */
        <div className="flex flex-col w-full space-y-4">
          {/* Header Banner - Restrained Pink/Rose Snapchat-Inspired Palette */}
          <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-700 text-white p-4 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBackToHome && (
                  <button
                    onClick={onBackToHome}
                    className="p-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white tap-bounce shrink-0"
                    title="Back to Home"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-inner shrink-0">
                  🧠
                </div>
                <div>
                  <h1 className={`font-black flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                    {seniorMode ? 'تعلیمی مرکز اور اسباق' : 'Learning Hub & Curriculum'}
                  </h1>
                  <p className="text-xs text-rose-100 font-medium">
                    A-Z Alphabet, 1-100 Numbers, Bioscience & Daily Quizzes
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-xl text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>{streakDays} Days</span>
              </div>
            </div>

            {/* Curriculum Sub-Navigation Pills */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'alphabet', label: 'Alphabet (A-Z)', emoji: '🔤' },
                { id: 'numbers', label: 'Numbers (1-100)', emoji: '🔢' },
                { id: 'bioscience', label: 'Bioscience Lab', emoji: '🧬' },
                { id: 'daily_quiz', label: 'Daily Quiz', emoji: '🎯' },
                { id: 'quizzes', label: 'All Quizzes', emoji: '📚' },
              ].map((tab) => {
                const isActive = curriculumSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      soundService.playClick();
                      selection();
                      setCurriculumSection(tab.id as any);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-1.5 tap-bounce ${
                      isActive
                        ? 'bg-white text-rose-700 shadow-md scale-102'
                        : 'bg-white/20 hover:bg-white/30 text-white border border-white/20'
                    }`}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC CURRICULUM SECTION BODY */}
          <div className="px-4 space-y-4">
            {curriculumSection === 'alphabet' && (
              <AlphabetLearningModule
                seniorMode={seniorMode}
                onEarnPoints={onEarnPoints}
              />
            )}

            {curriculumSection === 'numbers' && (
              <NumbersLearningModule
                seniorMode={seniorMode}
                onEarnPoints={onEarnPoints}
              />
            )}

            {curriculumSection === 'bioscience' && (
              <BioscienceExplorer
                seniorMode={seniorMode}
                onEarnPoints={onEarnPoints}
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
                    className={`shrink-0 px-3.5 py-2 rounded-2xl text-xs font-extrabold transition-all tap-bounce ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/80 shadow-2xs'
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
                            {quiz.difficulty || 'Beginner'}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 mt-1 line-clamp-2">
                          {seniorMode && quiz.urduQuestion ? quiz.urduQuestion : quiz.question}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                          +{quiz.points} Pts
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
            const correct = currentQ.correctIndex !== undefined ? currentQ.correctIndex : currentQ.correctAnswer;
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

