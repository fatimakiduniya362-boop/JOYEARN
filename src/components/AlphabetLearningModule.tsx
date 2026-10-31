import React, { useState } from 'react';
import { Volume2, Sparkles, CheckCircle2, RotateCcw, BookOpen, ArrowRight } from 'lucide-react';
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

  // Text to Speech Pronunciation
  const speakText = (text: string) => {
    soundService.playClick();
    light();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectLetter = (item: AlphabetLetter) => {
    soundService.playClick();
    light();
    setSelectedLetter(item);
    speakText(`${item.letter}. ${item.word}.`);

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
        <div className="space-y-4">
          {/* Active Featured Letter Card */}
          <div className="bg-gradient-to-br from-white via-rose-50/40 to-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-18 h-18 rounded-3xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex flex-col items-center justify-center shadow-md">
                  <span className="text-2xl font-black leading-none">{selectedLetter.letter}</span>
                  <span className="text-lg font-bold leading-none opacity-90">{selectedLetter.lower}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedLetter.word}</h3>
                    {selectedLetter.urduWord && (
                      <span className="text-xs text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                        {selectedLetter.urduWord}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-semibold">{selectedLetter.phonics}</p>
                  <p className="text-xs text-slate-600 italic mt-1">"{selectedLetter.sentence}"</p>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className="text-4xl">{selectedLetter.illustration}</span>
                <button
                  onClick={() => speakText(`${selectedLetter.letter}. ${selectedLetter.word}. ${selectedLetter.sentence}`)}
                  className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-700 tap-bounce mt-1"
                  title="Listen to pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Educational Fun Fact */}
            <div className="bg-white/80 p-3 rounded-2xl border border-rose-100 text-xs text-slate-600 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong className="text-slate-800">Did you know? </strong>
                {selectedLetter.funFact}
              </p>
            </div>
          </div>

          {/* Complete 26-Letter Responsive Grid */}
          <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>All 26 Letters (Tap to Learn & Hear)</span>
              <span className="text-rose-600">{practicedLetters.size}/26 Practiced</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
              {ALPHABET_DATA.map((item) => {
                const isSelected = selectedLetter.letter === item.letter;
                const isPracticed = practicedLetters.has(item.letter);

                return (
                  <button
                    key={item.letter}
                    onClick={() => handleSelectLetter(item)}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center transition-all tap-bounce relative ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-md scale-105'
                        : isPracticed
                        ? 'bg-rose-50/70 hover:bg-rose-100 text-slate-800 border border-rose-200/80'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    <span className="text-xs font-black">{item.letter}</span>
                    <span className="text-[10px] opacity-80">{item.lower}</span>
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
