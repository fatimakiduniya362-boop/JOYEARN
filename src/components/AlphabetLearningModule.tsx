import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Sparkles, CheckCircle2, RotateCcw, BookOpen, ArrowRight } from 'lucide-react';
import { ALPHABET_DATA, AlphabetLetter } from '../data/alphabetDatabase';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface AlphabetLearningModuleProps {
  seniorMode?: boolean;
  onEarnPoints?: (points: number, reason: string) => void;
}

export const AlphabetLearningModule: React.FC<AlphabetLearningModuleProps> = ({
  seniorMode = false,
  onEarnPoints,
}) => {
  const { light, success } = useHaptics();
  const [selectedLetter, setSelectedLetter] = useState<AlphabetLetter>(ALPHABET_DATA[0]);
  const [isMuted, setIsMuted] = useState<boolean>(() => soundService.getMuted());

  // Subscribe to mute state updates
  useEffect(() => {
    const unsub = soundService.subscribeMute((muted) => setIsMuted(muted));
    return unsub;
  }, []);

  const toggleSound = () => {
    const next = !isMuted;
    soundService.setMuted(next);
    setIsMuted(next);
    if (!next) {
      soundService.playSuccess();
    }
  };

  const [practicedLetters, setPracticedLetters] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('joyearn_practiced_letters');
      return saved ? new Set(JSON.parse(saved)) : new Set(['A']);
    } catch {
      return new Set(['A']);
    }
  });

  const [quizMode, setQuizMode] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(false);
  const [quizSelectedOption, setQuizSelectedOption] = useState<string | null>(null);

  // Text to Speech Pronunciation & Phonics audio
  const speakText = (text: string) => {
    light();
    soundService.speakPhonics(text);
  };

  const handleSelectLetter = (item: AlphabetLetter) => {
    light();
    setSelectedLetter(item);
    speakText(`${item.letter}. ${item.word}. Phonics: ${item.phonics}.`);

    setPracticedLetters((prev) => {
      const next = new Set(prev);
      next.add(item.letter);
      try {
        localStorage.setItem('joyearn_practiced_letters', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // 3-option quiz question for revision
  const currentQuizLetter = ALPHABET_DATA[quizIndex % ALPHABET_DATA.length];
  const quizOptions = React.useMemo(() => {
    const others = ALPHABET_DATA.filter((l) => l.letter !== currentQuizLetter.letter);
    const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 2);
    return [currentQuizLetter, ...shuffled].sort(() => 0.5 - Math.random());
  }, [quizIndex]);

  const handleAnswerQuiz = (chosen: AlphabetLetter) => {
    if (quizAnswered) return;
    setQuizSelectedOption(chosen.letter);
    setQuizAnswered(true);

    if (chosen.letter === currentQuizLetter.letter) {
      soundService.playSuccess();
      success();
      setQuizScore((s) => s + 1);
      onEarnPoints?.(10, `Mastered Letter ${currentQuizLetter.letter} 🔤`);
    } else {
      soundService.playWrong();
    }
  };

  const handleNextQuiz = () => {
    setQuizAnswered(false);
    setQuizSelectedOption(null);
    setQuizIndex((i) => (i + 1) % ALPHABET_DATA.length);
  };

  return (
    <div className="w-full space-y-4">
      {/* Module Header Bar */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xl">
            🔤
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">
              {seniorMode ? 'انگریزی حروف تہجی (A to Z)' : 'English Alphabet (A to Z)'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              All 26 letters with pronunciation, illustrations, and phonics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all tap-bounce ${
              isMuted
                ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 shadow-2xs'
            }`}
            title={isMuted ? 'Sound is muted. Tap to turn sound ON' : 'Sound is ON. Tap to mute'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />}
            <span>{isMuted ? 'Sound OFF' : 'Sound ON'}</span>
          </button>

          <button
            onClick={() => {
              soundService.playClick();
              setQuizMode(!quizMode);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all tap-bounce ${
              quizMode
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            {quizMode ? 'Exit Practice' : 'Letter Quiz'}
          </button>
        </div>
      </div>

      {quizMode ? (
        /* QUIZ / REVISION MODE */
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Question {quizIndex + 1} of 26</span>
            <span className="text-rose-600 font-black">Score: {quizScore}</span>
          </div>

          <div className="text-center py-4 space-y-2">
            <span className="text-6xl block">{currentQuizLetter.illustration}</span>
            <p className="text-base font-black text-slate-800">
              Which letter does "{currentQuizLetter.word}" start with?
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {quizOptions.map((opt) => {
              const isSelected = quizSelectedOption === opt.letter;
              const isCorrect = opt.letter === currentQuizLetter.letter;

              let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-rose-50 hover:border-rose-300';
              if (quizAnswered) {
                if (isCorrect) btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-md';
                else if (isSelected) btnStyle = 'bg-rose-500 text-white border-rose-600';
                else btnStyle = 'bg-slate-50 text-slate-400 border-slate-200 opacity-60';
              }

              return (
                <button
                  key={opt.letter}
                  onClick={() => handleAnswerQuiz(opt)}
                  disabled={quizAnswered}
                  className={`py-3.5 rounded-2xl border-2 font-black text-xl transition-all tap-bounce ${btnStyle}`}
                >
                  <span>{opt.letter} {opt.lower}</span>
                </button>
              );
            })}
          </div>

          {quizAnswered && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {quizSelectedOption === currentQuizLetter.letter ? '✓ Great job!' : `Correct answer: ${currentQuizLetter.letter} for ${currentQuizLetter.word}`}
              </span>
              <button
                onClick={handleNextQuiz}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black rounded-xl shadow-xs tap-bounce flex items-center gap-1.5"
              >
                <span>Next Letter</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* EXPLORER & DETAIL MODE */
        <div className="space-y-3.5">
          {/* Active Featured Letter Card */}
          <div className="bg-gradient-to-br from-white via-rose-50/50 to-white rounded-3xl p-4 sm:p-5 border border-rose-200/90 shadow-xs space-y-3.5 overflow-hidden">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex flex-col items-center justify-center shadow-md shrink-0">
                  <span className="text-2xl font-black leading-none">{selectedLetter.letter}</span>
                  <span className="text-base font-bold leading-none opacity-90 mt-0.5">{selectedLetter.lower}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 truncate">
                      {selectedLetter.word}
                    </h3>
                    {selectedLetter.urduWord && (
                      <span className="text-[11px] text-rose-700 font-extrabold bg-rose-100/80 px-2 py-0.5 rounded-lg border border-rose-200 shrink-0">
                        {selectedLetter.urduWord}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-600 font-bold mt-0.5">{selectedLetter.phonics}</p>
                  <p className="text-xs text-slate-600 italic mt-1 line-clamp-2">"{selectedLetter.sentence}"</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-3xl sm:text-4xl select-none">{selectedLetter.illustration}</span>
                <button
                  onClick={() => speakText(`${selectedLetter.letter}. ${selectedLetter.word}. ${selectedLetter.sentence}`)}
                  className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 tap-bounce border border-rose-200"
                  title="Listen to pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* AI-Generated Learning Explanation Card */}
            <div className="bg-white/90 p-3.5 rounded-2xl border border-rose-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black text-rose-700">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>AI Learning Hub Explanation</span>
                </div>
                <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
                  Phonics & Mnemonic
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {selectedLetter.funFact}
              </p>
              {selectedLetter.practiceTips && selectedLetter.practiceTips.length > 0 && (
                <div className="pt-2 border-t border-rose-100 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    Handwriting & Pronunciation Steps:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedLetter.practiceTips.map((tip, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-slate-50 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200"
                      >
                        {idx + 1}. {tip}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Complete 26-Letter Responsive Grid */}
          <div className="bg-white rounded-3xl p-3.5 sm:p-4 border border-rose-100 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>All 26 Letters (Tap to Learn & Hear)</span>
              <span className="text-rose-600 font-black">{practicedLetters.size}/26 Practiced</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1 sm:gap-1.5">
              {ALPHABET_DATA.map((item) => {
                const isSelected = selectedLetter.letter === item.letter;
                const isPracticed = practicedLetters.has(item.letter);

                return (
                  <button
                    key={item.letter}
                    onClick={() => handleSelectLetter(item)}
                    className={`p-1.5 py-2 rounded-xl flex flex-col items-center justify-center transition-all tap-bounce relative select-none ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-md ring-2 ring-rose-400'
                        : isPracticed
                        ? 'bg-rose-50/80 hover:bg-rose-100 text-slate-800 border border-rose-200'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
                    }`}
                  >
                    <span className="text-xs font-black leading-tight">{item.letter}</span>
                    <span className="text-[10px] opacity-80 leading-tight">{item.lower}</span>
                    {isPracticed && !isSelected && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
