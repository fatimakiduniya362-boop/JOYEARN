import React, { useState, useMemo } from 'react';
import { Volume2, Sparkles, CheckCircle2, RotateCcw, Hash, ArrowRight } from 'lucide-react';
import { NUMBERS_1_TO_100, NumberItem } from '../data/numbersDatabase';
import { soundService } from '../services/soundService';
import { useHaptics } from '../hooks/useHaptics';

interface NumbersLearningModuleProps {
  seniorMode?: boolean;
  onEarnPoints?: (points: number, reason: string) => void;
}

export const NumbersLearningModule: React.FC<NumbersLearningModuleProps> = ({
  seniorMode = false,
  onEarnPoints,
}) => {
  const { light, success } = useHaptics();
  const [selectedNum, setSelectedNum] = useState<NumberItem>(NUMBERS_1_TO_100[0]);
  const [filterMode, setFilterMode] = useState<'all' | 'even' | 'odd' | 'prime' | 'tens'>('all');
  const [practiceMode, setPracticeMode] = useState(false);

  // Missing number practice game state
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswered, setPracticeAnswered] = useState(false);
  const [chosenOption, setChosenOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const speakText = (text: string) => {
    light();
    soundService.speakPhonics(text);
  };

  const handleSelectNumber = (item: NumberItem) => {
    soundService.playClick();
    light();
    setSelectedNum(item);
    speakText(`${item.number}. ${item.word}.`);
  };

  const displayedNumbers = useMemo(() => {
    if (filterMode === 'even') return NUMBERS_1_TO_100.filter((n) => n.isEven);
    if (filterMode === 'odd') return NUMBERS_1_TO_100.filter((n) => !n.isEven);
    if (filterMode === 'prime') return NUMBERS_1_TO_100.filter((n) => n.isPrime);
    if (filterMode === 'tens') return NUMBERS_1_TO_100.filter((n) => n.number % 10 === 0);
    return NUMBERS_1_TO_100;
  }, [filterMode]);

  // Generate sequence for missing number challenge (e.g., 14, 15, [ ? ], 17)
  const currentChallenge = useMemo(() => {
    const start = Math.max(1, (practiceIndex * 7) % 94);
    const missingOffset = (practiceIndex % 3) + 1; // 1, 2, or 3
    const missingValue = start + missingOffset;
    const sequence = [start, start + 1, start + 2, start + 3];

    // Generate 3 options
    const distractor1 = Math.max(1, missingValue - 2);
    const distractor2 = Math.min(100, missingValue + 2);
    const options = Array.from(new Set([missingValue, distractor1, distractor2])).sort(() => 0.5 - Math.random());

    return { sequence, missingValue, options };
  }, [practiceIndex]);

  const handleAnswerPractice = (val: number) => {
    if (practiceAnswered) return;
    setChosenOption(val);
    setPracticeAnswered(true);

    if (val === currentChallenge.missingValue) {
      soundService.playSuccess();
      success();
      setScore((s) => s + 1);
      onEarnPoints?.(10, `Completed Math Count Challenge #${practiceIndex + 1} 🔢`);
    } else {
      soundService.playWrong();
    }
  };

  const handleNextPractice = () => {
    setPracticeAnswered(false);
    setChosenOption(null);
    setPracticeIndex((i) => i + 1);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl">
            🔢
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800">
              {seniorMode ? 'گنتی اور اعداد (1 تا 100)' : 'Numbers & Counting (1 to 100)'}
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Complete sequence with words, Roman numerals, and skip-counting
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundService.playClick();
            setPracticeMode(!practiceMode);
          }}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all tap-bounce ${
            practiceMode
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
        >
          {practiceMode ? 'View Grid' : 'Math Practice'}
        </button>
      </div>

      {practiceMode ? (
        /* MISSING NUMBER MINI-GAME */
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
            <span>Counting Challenge #{practiceIndex + 1}</span>
            <span className="text-amber-600 font-black">Score: {score}</span>
          </div>

          <div className="text-center py-4 space-y-3">
            <p className="text-sm font-black text-slate-800">Find the missing number in the sequence:</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {currentChallenge.sequence.map((n) => {
                const isTarget = n === currentChallenge.missingValue;
                return (
                  <div
                    key={n}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg border-2 ${
                      isTarget
                        ? 'bg-amber-100 border-amber-400 text-amber-900 border-dashed animate-pulse'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    {isTarget ? (practiceAnswered ? currentChallenge.missingValue : '?') : n}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {currentChallenge.options.map((opt) => {
              const isSelected = chosenOption === opt;
              const isCorrect = opt === currentChallenge.missingValue;

              let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-amber-50 hover:border-amber-300';
              if (practiceAnswered) {
                if (isCorrect) btnStyle = 'bg-emerald-500 text-white border-emerald-600 shadow-md';
                else if (isSelected) btnStyle = 'bg-rose-500 text-white border-rose-600';
                else btnStyle = 'bg-slate-50 text-slate-400 border-slate-200 opacity-60';
              }

              return (
                <button
                  key={opt}
                  onClick={() => handleAnswerPractice(opt)}
                  disabled={practiceAnswered}
                  className={`py-3.5 rounded-2xl border-2 font-black text-xl transition-all tap-bounce ${btnStyle}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {practiceAnswered && (
            <div className="pt-2 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">
                {chosenOption === currentChallenge.missingValue ? '✓ Spot on!' : `The missing number is ${currentChallenge.missingValue}`}
              </span>
              <button
                onClick={handleNextPractice}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black rounded-xl shadow-xs tap-bounce flex items-center gap-1.5"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* EXPLORER & COMPLETE 1-100 GRID */
        <div className="space-y-4">
          {/* Active Number Card */}
          <div className="bg-gradient-to-br from-white via-amber-50/40 to-white rounded-3xl p-5 border border-rose-100 shadow-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-md">
                  {selectedNum.number}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{selectedNum.word}</h3>
                    <span className="text-xs text-amber-700 font-bold bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">
                      Roman: {selectedNum.roman}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>{selectedNum.isEven ? 'Even Number' : 'Odd Number'}</span>
                    <span>•</span>
                    <span>{selectedNum.isPrime ? 'Prime Number' : 'Composite'}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => speakText(`${selectedNum.number}. ${selectedNum.word}.`)}
                className="p-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 tap-bounce"
                title="Pronounce number"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/80 p-3 rounded-2xl border border-amber-100 text-xs text-slate-600 flex items-start gap-2">
              <span className="text-base shrink-0">💡</span>
              <p className="leading-relaxed">
                <strong className="text-slate-800">Math Fact: </strong>
                {selectedNum.fact}
              </p>
            </div>
          </div>

          {/* Quick Filter Segmented Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'even', 'odd', 'prime', 'tens'] as const).map((filter) => {
              const isActive = filterMode === filter;
              return (
                <button
                  key={filter}
                  onClick={() => {
                    soundService.playClick();
                    setFilterMode(filter);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all capitalize tap-bounce shrink-0 ${
                    isActive
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {filter === 'tens' ? 'Multiples of 10' : filter} ({
                    filter === 'all'
                      ? 100
                      : filter === 'even' || filter === 'odd'
                      ? 50
                      : filter === 'prime'
                      ? 25
                      : 10
                  })
                </button>
              );
            })}
          </div>

          {/* Complete 1 to 100 Grid */}
          <div className="bg-white rounded-3xl p-4 border border-rose-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>Sequence Grid (1 through 100)</span>
              <span className="text-rose-600">Showing {displayedNumbers.length} numbers</span>
            </div>

            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5 max-h-80 overflow-y-auto p-1 rounded-2xl bg-slate-50/50">
              {displayedNumbers.map((item) => {
                const isSelected = selectedNum.number === item.number;
                return (
                  <button
                    key={item.number}
                    onClick={() => handleSelectNumber(item)}
                    className={`h-11 rounded-xl flex flex-col items-center justify-center transition-all tap-bounce ${
                      isSelected
                        ? 'bg-amber-500 text-white font-black shadow-md scale-105'
                        : 'bg-white hover:bg-amber-50 text-slate-800 border border-slate-200/80 font-bold text-xs'
                    }`}
                  >
                    <span>{item.number}</span>
                    <span className="text-[8px] opacity-70 leading-none">{item.roman}</span>
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
