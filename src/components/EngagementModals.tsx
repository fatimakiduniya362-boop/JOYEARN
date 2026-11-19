import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Award,
  Layers,
  BookOpen,
  Trophy,
  Calendar,
  CheckCircle2,
  Lock,
  Share2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';
import {
  LEVELS,
  KNOWLEDGE_SETS,
  KNOWLEDGE_CARDS,
  MINI_COURSES,
  EVENT_QUIZZES,
  getLevelForPoints,
  getCosmeticBadges,
  loadStreakShieldState,
  syncStreakShieldEarnings,
  useStreakShield,
  loadUnlockedCardIds,
  loadFinishedCategories,
  loadAllCourseProgress,
  markCourseLessonComplete,
  markCourseFinalQuizPassed,
  shareCourseCertificate,
  fetchWeeklyLeaderboard,
  getCurrentISOWeekKey,
  getLocalWeeklyPoints,
  WeeklyLeaderboardEntry,
  getCompletedEventQuizIds,
  markEventQuizCompleted,
  shareQuizResultCard,
  recordWeeklyChallengeActivity,
  unlockKnowledgeCardForCategory,
  MiniCourse,
  EventQuizPack,
} from '../services/engagementService';
import { EngagementModalTab } from './EngagementHubCard';
import { soundService } from '../services/soundService';

interface EngagementModalsProps {
  activeModal: EngagementModalTab;
  onClose: () => void;
  uid: string;
  userName: string;
  totalPoints: number;
  streakDays: number;
  quizzesCompletedCount: number;
  onEarnPoints: (points: number, reason: string) => void;
  onTriggerConfetti?: () => void;
  seniorMode: boolean;
}

export const EngagementModals: React.FC<EngagementModalsProps> = ({
  activeModal,
  onClose,
  uid,
  userName,
  totalPoints,
  streakDays,
  quizzesCompletedCount,
  onEarnPoints,
  onTriggerConfetti,
}) => {
  const [notice, setNotice] = useState<string | null>(null);
  const [shieldState, setShieldState] = useState(() => loadStreakShieldState(uid));
  const [unlockedCardIds, setUnlockedCardIds] = useState<string[]>(() => loadUnlockedCardIds(uid));
  const [selectedAlbumSet, setSelectedAlbumSet] = useState<string>('animals');

  // Courses state
  const [courseProgress, setCourseProgress] = useState(() => loadAllCourseProgress(uid));
  const [activeCourse, setActiveCourse] = useState<MiniCourse | null>(null);
  const [courseQuizActive, setCourseQuizActive] = useState(false);
  const [courseQuizIdx, setCourseQuizIdx] = useState(0);
  const [courseQuizScore, setCourseQuizScore] = useState(0);
  const [courseQuizDone, setCourseQuizDone] = useState(false);

  // Weekly challenge state
  const [weeklyEntries, setWeeklyEntries] = useState<WeeklyLeaderboardEntry[]>([]);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyFromCache, setWeeklyFromCache] = useState(true);

  // Event quiz state
  const [completedEvents, setCompletedEvents] = useState<string[]>(() => getCompletedEventQuizIds(uid));
  const [activeEvent, setActiveEvent] = useState<EventQuizPack | null>(null);
  const [eventIdx, setEventIdx] = useState(0);
  const [eventScore, setEventScore] = useState(0);
  const [eventDone, setEventDone] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!activeModal) return;
    setNotice(null);
    const { state } = syncStreakShieldEarnings(uid, streakDays);
    setShieldState(state);
    setUnlockedCardIds(loadUnlockedCardIds(uid));
    setCourseProgress(loadAllCourseProgress(uid));
    setCompletedEvents(getCompletedEventQuizIds(uid));

    if (activeModal === 'weekly') {
      setWeeklyLoading(true);
      fetchWeeklyLeaderboard(false)
        .then((res) => {
          setWeeklyEntries(res.entries);
          setWeeklyFromCache(res.fromCache);
        })
        .finally(() => setWeeklyLoading(false));
    }
  }, [activeModal, uid, streakDays]);

  if (!activeModal) return null;

  const showTempNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const levelInfo = getLevelForPoints(totalPoints);
  const finishedCats = loadFinishedCategories(uid);
  const badges = getCosmeticBadges({
    streakDays,
    finishedCategoriesCount: finishedCats.length,
    quizzesCompletedCount,
  });

  // Handlers
  const handleUseShield = () => {
    soundService.playClick();
    const res = useStreakShield(uid);
    setShieldState(res.state);
    if (res.success) {
      soundService.playFanfare();
      onTriggerConfetti?.();
    }
    showTempNotice(res.message);
  };

  const handleCompleteLesson = (course: MiniCourse, day: number) => {
    soundService.playClick();
    const res = markCourseLessonComplete(uid, course.id, day);
    setCourseProgress(loadAllCourseProgress(uid));
    if (res.newlyCompleted) {
      soundService.playSuccess();
      onEarnPoints(10, `${course.title} Lesson Day ${day}`);
      recordWeeklyChallengeActivity(uid, userName, 10, `course_${course.id}_${day}`);
      showTempNotice(`Completed Day ${day}! (+10 Pts within daily cap)`);
    }
  };

  const handleCourseQuizAnswer = (optIdx: number) => {
    if (!activeCourse) return;
    const q = activeCourse.finalQuiz[courseQuizIdx];
    const isCorrect = optIdx === q.correctIndex;
    const nextScore = isCorrect ? courseQuizScore + 1 : courseQuizScore;
    if (isCorrect) soundService.playCorrect();
    else soundService.playWrong();

    if (courseQuizIdx < activeCourse.finalQuiz.length - 1) {
      setCourseQuizScore(nextScore);
      setCourseQuizIdx((i) => i + 1);
    } else {
      setCourseQuizScore(nextScore);
      setCourseQuizDone(true);
      if (nextScore >= 3) {
        markCourseFinalQuizPassed(uid, activeCourse.id);
        setCourseProgress(loadAllCourseProgress(uid));
        onEarnPoints(25, `Completed ${activeCourse.title} Final Quiz`);
        recordWeeklyChallengeActivity(uid, userName, 25, `course_final_${activeCourse.id}`);
        soundService.playFanfare();
        onTriggerConfetti?.();
      }
    }
  };

  const handleShareCertificate = async (course: MiniCourse) => {
    soundService.playClick();
    setSharing(true);
    const prog = courseProgress[course.id];
    const res = await shareCourseCertificate({
      courseTitle: course.title,
      courseEmoji: course.emoji,
      userName,
      completedDate: prog?.certificateIssuedAt || new Date().toISOString().slice(0, 10),
    });
    setSharing(false);
    showTempNotice(res.message);
  };

  const handleEventAnswer = (optIdx: number) => {
    if (!activeEvent) return;
    const q = activeEvent.questions[eventIdx];
    const isCorrect = optIdx === q.correctIndex;
    const nextScore = isCorrect ? eventScore + 1 : eventScore;
    if (isCorrect) soundService.playCorrect();
    else soundService.playWrong();

    if (eventIdx < activeEvent.questions.length - 1) {
      setEventScore(nextScore);
      setEventIdx((i) => i + 1);
    } else {
      setEventScore(nextScore);
      setEventDone(true);
      const firstTime = markEventQuizCompleted(uid, activeEvent.id, nextScore);
      setCompletedEvents(getCompletedEventQuizIds(uid));
      const pts = Math.min(25, nextScore * 5);
      if (firstTime && pts > 0) {
        onEarnPoints(pts, `${activeEvent.title} Completed`);
        recordWeeklyChallengeActivity(uid, userName, pts, `event_${activeEvent.id}`);
      }
      const cardRes = unlockKnowledgeCardForCategory(uid, 'general');
      setUnlockedCardIds(cardRes.allUnlockedIds);
      if (cardRes.completedSet) {
        onTriggerConfetti?.();
      }
      soundService.playFanfare();
    }
  };

  const handleShareEventResult = async () => {
    if (!activeEvent) return;
    setSharing(true);
    const res = await shareQuizResultCard({
      quizTitle: activeEvent.title,
      score: eventScore,
      total: activeEvent.questions.length,
      userName,
      streakDays,
      levelName: levelInfo.current.name,
    });
    setSharing(false);
    showTempNotice(res.message);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-500 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {activeModal === 'levels' && <Award className="w-5 h-5" />}
            {activeModal === 'album' && <Layers className="w-5 h-5" />}
            {activeModal === 'courses' && <BookOpen className="w-5 h-5" />}
            {activeModal === 'weekly' && <Trophy className="w-5 h-5" />}
            {activeModal === 'events' && <Calendar className="w-5 h-5" />}
            <h2 className="font-black text-base">
              {activeModal === 'levels' && 'Levels, Badges & Streak Shield'}
              {activeModal === 'album' && 'Knowledge Cards Album'}
              {activeModal === 'courses' && '30-Day Mini Courses'}
              {activeModal === 'weekly' && `Weekly Challenge (${getCurrentISOWeekKey()})`}
              {activeModal === 'events' && 'Special Event Quizzes'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundService.playClick();
              setActiveCourse(null);
              setActiveEvent(null);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white tap-bounce"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Inline Notice Banner */}
        {notice && (
          <div className="mx-3 mt-3 p-2.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-2xl text-xs font-bold flex items-center justify-between gap-2">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice(null)} className="font-black">✕</button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ================================================================
              TAB 1: LEVELS, COSMETIC BADGES & STREAK SHIELD
             ================================================================ */}
          {activeModal === 'levels' && (
            <>
              {/* Streak Shield Box */}
              <div className="p-4 rounded-3xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-sky-600 dark:text-sky-400" />
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        Streak Shield ({shieldState.shields}/2 stored)
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Earn 1 shield at every 7-day streak (max 2 stored). Use 1 shield to save a missed day.
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleUseShield}
                  disabled={shieldState.shields <= 0}
                  className={`w-full py-2.5 rounded-2xl text-xs font-black tap-bounce ${
                    shieldState.shields > 0
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {shieldState.shields > 0
                    ? 'Use 1 Streak Shield to Protect Streak'
                    : 'Reach a 7-Day Streak to Earn Your First Shield'}
                </button>
              </div>

              {/* Levels Roadmap (Cosmetic) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">
                    Levels (Beginner → Master)
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400">Cosmetic • No extra points</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {LEVELS.map((lvl) => {
                    const reached = totalPoints >= lvl.minPoints;
                    return (
                      <div
                        key={lvl.id}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                          reached
                            ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-700 shadow-2xs'
                            : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <span className="text-2xl">{lvl.emoji}</span>
                        <div>
                          <div className="font-black text-xs text-slate-900 dark:text-white">
                            {lvl.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold">
                            {lvl.minPoints.toLocaleString()}+ pts
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cosmetic Badges */}
              <div className="space-y-2">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-500">
                  Cosmetic Badges ({badges.filter((b) => b.unlocked).length}/{badges.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {badges.map((b) => (
                    <div
                      key={b.id}
                      className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
                        b.unlocked
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
                          : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-55'
                      }`}
                    >
                      <span className="text-xl">{b.unlocked ? b.emoji : '🔒'}</span>
                      <div className="min-w-0">
                        <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                          {b.title}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{b.requirement}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ================================================================
              TAB 2: KNOWLEDGE CARDS ALBUM
             ================================================================ */}
          {activeModal === 'album' && (
            <>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete quizzes across categories to unlock collectible Knowledge Cards. Finish a full set of 4 cards to trigger a set celebration!
              </p>

              {/* Set Selector Tabs */}
              <div className="grid grid-cols-4 gap-1.5">
                {KNOWLEDGE_SETS.map((s) => {
                  const setCards = KNOWLEDGE_CARDS.filter((c) => c.setId === s.id);
                  const count = setCards.filter((c) => unlockedCardIds.includes(c.id)).length;
                  const active = selectedAlbumSet === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setSelectedAlbumSet(s.id);
                      }}
                      className={`p-2 rounded-2xl text-center border tap-bounce transition-all ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="text-lg">{s.emoji}</div>
                      <div className="text-[10px] font-black">{s.title}</div>
                      <div className="text-[9px] opacity-80 font-bold">{count}/4</div>
                    </button>
                  );
                })}
              </div>

              {/* Set Completed Celebration Banner */}
              {(() => {
                const setCards = KNOWLEDGE_CARDS.filter((c) => c.setId === selectedAlbumSet);
                const setFinished = setCards.every((c) => unlockedCardIds.includes(c.id));
                const setMeta = KNOWLEDGE_SETS.find((s) => s.id === selectedAlbumSet);
                return (
                  <>
                    {setFinished && setMeta && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-xs flex items-center justify-between shadow-sm">
                        <span className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>{setMeta.title} Set Complete! 🎉</span>
                        </span>
                        <span>4/4</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2.5">
                      {setCards.map((card) => {
                        const unlocked = unlockedCardIds.includes(card.id);
                        return (
                          <div
                            key={card.id}
                            className={`p-3.5 rounded-2xl border space-y-1.5 ${
                              unlocked
                                ? 'bg-white dark:bg-slate-800 border-emerald-300 dark:border-emerald-700 shadow-2xs'
                                : 'bg-slate-100 dark:bg-slate-900 border-dashed border-slate-300 dark:border-slate-700 opacity-70'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{unlocked ? card.emoji : '❓'}</span>
                              {unlocked ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                            <h4 className="font-black text-xs text-slate-900 dark:text-white">
                              {unlocked ? card.title : 'Locked Card'}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                              {unlocked
                                ? card.fact
                                : `Finish a ${card.categoryTrigger} quiz to unlock this card.`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}

          {/* ================================================================
              TAB 3: 30-DAY MINI COURSES + FINAL QUIZ + CANVAS CERTIFICATE
             ================================================================ */}
          {activeModal === 'courses' && !activeCourse && (
            <div className="space-y-3">
              {MINI_COURSES.map((course) => {
                const prog = courseProgress[course.id];
                const doneCount = prog?.completedDays?.length || 0;
                return (
                  <div
                    key={course.id}
                    className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${course.accent} text-white flex items-center justify-center text-2xl shrink-0`}
                        >
                          {course.emoji}
                        </div>
                        <div>
                          <h3 className="font-black text-sm text-slate-900 dark:text-white">
                            {course.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {doneCount}/30 lessons • {prog?.finalQuizPassed ? 'Certificate Earned ✓' : '30 Days + Final Quiz'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
                      {course.description}
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          soundService.playClick();
                          setActiveCourse(course);
                          setCourseQuizActive(false);
                          setCourseQuizDone(false);
                        }}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black tap-bounce"
                      >
                        Open Course
                      </button>
                      {prog?.finalQuizPassed && (
                        <button
                          type="button"
                          disabled={sharing}
                          onClick={() => handleShareCertificate(course)}
                          className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black tap-bounce flex items-center gap-1"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Certificate</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'courses' && activeCourse && !courseQuizActive && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setActiveCourse(null)}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Courses</span>
              </button>

              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    {activeCourse.emoji} {activeCourse.title}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {(courseProgress[activeCourse.id]?.completedDays?.length || 0)}/30 lessons done
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playClick();
                    setCourseQuizActive(true);
                    setCourseQuizIdx(0);
                    setCourseQuizScore(0);
                    setCourseQuizDone(false);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black tap-bounce"
                >
                  Final Quiz
                </button>
              </div>

              {courseProgress[activeCourse.id]?.finalQuizPassed && (
                <button
                  type="button"
                  disabled={sharing}
                  onClick={() => handleShareCertificate(activeCourse)}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 rounded-2xl text-xs font-black tap-bounce flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{sharing ? 'Preparing Certificate...' : 'Share Certificate Image'}</span>
                </button>
              )}

              <div className="space-y-2">
                {activeCourse.lessons.map((lesson) => {
                  const done = courseProgress[activeCourse.id]?.completedDays?.includes(lesson.day);
                  return (
                    <div
                      key={lesson.day}
                      className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <h4 className="font-black text-xs text-slate-900 dark:text-white">
                          {lesson.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                          {lesson.summary}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={done}
                        onClick={() => handleCompleteLesson(activeCourse, lesson.day)}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black shrink-0 tap-bounce ${
                          done
                            ? 'bg-emerald-100 text-emerald-700 cursor-default'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {done ? 'Done ✓' : 'Complete'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeModal === 'courses' && activeCourse && courseQuizActive && (
            <div className="space-y-3">
              {courseQuizDone ? (
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="text-4xl">{courseQuizScore >= 3 ? '🎓' : '📘'}</div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {courseQuizScore >= 3 ? 'Course Quiz Passed!' : 'Keep Practicing!'}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    You scored <strong>{courseQuizScore}/{activeCourse.finalQuiz.length}</strong>. (Pass score: 3/5)
                  </p>
                  {courseQuizScore >= 3 && (
                    <button
                      type="button"
                      disabled={sharing}
                      onClick={() => handleShareCertificate(activeCourse)}
                      className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl text-xs font-black tap-bounce flex items-center justify-center gap-1.5"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share Certificate Image</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCourseQuizActive(false)}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black tap-bounce"
                  >
                    Back to Lessons
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{activeCourse.title} Final Quiz</span>
                    <span>Q{courseQuizIdx + 1}/{activeCourse.finalQuiz.length}</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {activeCourse.finalQuiz[courseQuizIdx].question}
                  </h3>
                  <div className="space-y-2">
                    {activeCourse.finalQuiz[courseQuizIdx].options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleCourseQuizAnswer(idx)}
                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left text-xs font-bold text-slate-800 dark:text-slate-100 tap-bounce"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 4: WEEKLY CHALLENGE LEADERBOARD (First names, top 20, 1h cache)
             ================================================================ */}
          {activeModal === 'weekly' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-300">
                    Your Score This Week ({getCurrentISOWeekKey()})
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white">
                    {getLocalWeeklyPoints(uid)} Pts
                  </div>
                </div>
                <button
                  type="button"
                  disabled={weeklyLoading}
                  onClick={() => {
                    soundService.playClick();
                    setWeeklyLoading(true);
                    fetchWeeklyLeaderboard(true)
                      .then((res) => {
                        setWeeklyEntries(res.entries);
                        setWeeklyFromCache(res.fromCache);
                      })
                      .finally(() => setWeeklyLoading(false));
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1 tap-bounce"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${weeklyLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-500">
                Resets automatically every week • First names only • Top 20 • {weeklyFromCache ? 'Cached (1h)' : 'Live'}
              </p>

              {weeklyLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">Loading weekly rankings...</div>
              ) : weeklyEntries.length === 0 ? (
                <div className="py-8 px-4 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-2xl">🏆</div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    New Weekly Challenge Started!
                  </h4>
                  <p className="text-xs text-slate-500">
                    Complete quizzes or mini-course lessons to post the first real score on this week&apos;s board.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {weeklyEntries.map((entry) => (
                    <div
                      key={entry.uid}
                      className={`p-3 rounded-2xl border flex items-center justify-between ${
                        entry.uid === uid
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center">
                          #{entry.rank}
                        </span>
                        <span className="font-black text-xs text-slate-900 dark:text-white">
                          {entry.firstName} {entry.uid === uid ? '(You)' : ''}
                        </span>
                      </div>
                      <span className="font-black text-xs text-indigo-600 dark:text-indigo-300">
                        {entry.weeklyPoints} Pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================
              TAB 5: EVENT QUIZZES (Ramadan, Eid, Independence Day, New Year)
             ================================================================ */}
          {activeModal === 'events' && !activeEvent && (
            <div className="space-y-3">
              {EVENT_QUIZZES.map((ev) => {
                const done = completedEvents.includes(ev.id);
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${ev.accent} text-white flex items-center justify-center text-2xl shrink-0`}
                      >
                        {ev.emoji}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-sm text-slate-900 dark:text-white truncate">
                          {ev.title}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {ev.questions.length} Questions • {done ? 'Completed ✓' : 'Up to +25 Pts'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setActiveEvent(ev);
                        setEventIdx(0);
                        setEventScore(0);
                        setEventDone(false);
                      }}
                      className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black tap-bounce shrink-0"
                    >
                      {done ? 'Replay' : 'Start'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeModal === 'events' && activeEvent && (
            <div className="space-y-3">
              {eventDone ? (
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="text-4xl">{activeEvent.emoji}</div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white">
                    {activeEvent.title} Complete!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    You scored <strong>{eventScore}/{activeEvent.questions.length}</strong>.
                  </p>
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={handleShareEventResult}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-xs font-black tap-bounce flex items-center justify-center gap-1.5"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{sharing ? 'Creating Card...' : 'Share My Result'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveEvent(null)}
                    className="w-full py-2.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-2xl text-xs font-bold tap-bounce"
                  >
                    Back to Event Quizzes
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>{activeEvent.emoji} {activeEvent.title}</span>
                    <span>Q{eventIdx + 1}/{activeEvent.questions.length}</span>
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                    {activeEvent.questions[eventIdx].question}
                  </h3>
                  <div className="space-y-2">
                    {activeEvent.questions[eventIdx].options.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleEventAnswer(idx)}
                        className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-left text-xs font-bold text-slate-800 dark:text-slate-100 tap-bounce"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
