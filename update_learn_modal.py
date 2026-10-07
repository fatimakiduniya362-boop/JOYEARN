with open('src/components/LearnModal.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add imports if not present
daily_imports = """import {
  getDailyQuizForToday,
  isDailyQuizCompletedToday,
  markDailyQuizCompletedToday,
  getTimeUntilMidnight,
  ShuffledQuizItem
} from '../services/dailyQuizService';
import { adMobManager } from '../services/adMobService';
import { AdMobInterstitialModal } from './AdMobInterstitialModal';
import { AdMobRewardedModal } from './AdMobRewardedModal';
"""

if 'getDailyQuizForToday' not in text:
    text = daily_imports + text

# 2. Add state inside LearnModal component
target_state = "  const [quizScore, setQuizScore] = useState(0);\n"
replacement_state = """  const [quizScore, setQuizScore] = useState(0);

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
"""

if target_state in text and 'quizSubTab' not in text:
    text = text.replace(target_state, replacement_state, 1)

# 3. Handle daily quiz answer & next question handlers
target_handlers = "  const handleShuffleQuestion = () => {\n"
replacement_handlers = """  const handleSelectDailyOption = (idx: number) => {
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
"""

if target_handlers in text and 'handleSelectDailyOption' not in text:
    text = text.replace(target_handlers, replacement_handlers, 1)

# 4. Insert SubTab buttons right under tab 1 {activeLearnTab === 'quiz' && (
subtab_target = "{/* TAB 1: QUIZ CHALLENGE */}\n        {activeLearnTab === 'quiz' && (\n          <>"
subtab_replacement = """{/* TAB 1: QUIZ CHALLENGE */}
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
                                  : 'Complete Today\'s Daily Quiz 🎉'
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
              <>"""

if subtab_target in text and 'SUB-TABS: DAILY 5-QUESTION QUIZ' not in text:
    text = text.replace(subtab_target, subtab_replacement, 1)

# Also close the practice mode tag
practice_close_target = "        {/* TAB 2: QUIZ LEADERBOARD */}\n        {activeLearnTab === 'leaderboard' && ("
practice_close_replacement = """              </>
            )}
          </>
        )}

        {/* TAB 2: QUIZ LEADERBOARD */}
        {activeLearnTab === 'leaderboard' && ("""

if practice_close_target in text and 'practice_close_replacement' not in text:
    text = text.replace(practice_close_target, practice_close_replacement, 1)

# 5. Render AdMob Modals right before the last closing </div> of LearnModal
admob_modals_jsx = """      {/* AdMob Interstitial Modal (After completed quizzes only, respecting 2-min rate limit) */}
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
    </div>
  );
};"""

last_close_target = "    </div>\n  );\n};"
last_idx = text.rfind(last_close_target)
if last_idx != -1 and 'AdMobInterstitialModal' not in text[last_idx-300:last_idx]:
    text = text[:last_idx] + admob_modals_jsx

with open('src/components/LearnModal.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: LearnModal updated with Daily 5-Question Quiz & AdMob integration!")
