import React, { useEffect, useMemo, useState } from 'react';
import { X, Trophy, CheckCircle2, RotateCcw, Brain, Sparkles } from 'lucide-react';
import {
  BrainActivityType,
  BrainDifficulty,
  DailyMissionId,
  completeDailyMission,
  getDailyLogicChallenge,
  getDailyPicturePuzzle,
  getDailyQuizBattleQuestions,
  getDailyWordPuzzle,
  loadUserMissionsProgress,
  recordBrainChallengeResult,
  recordQuizBattleScore,
} from '../services/dailyMissionsService';
import { soundService } from '../services/soundService';

interface DailyMissionsModalProps {
  isOpen: boolean;
  missionId: DailyMissionId | null;
  onClose: () => void;
  uid: string;
  displayName?: string;
  onEarnPoints: (points: number, reason: string) => void;
  onMissionUpdated?: () => void;
}

const MEMORY_SYMBOLS = ['🌸', '🦋', '🍎', '🌍', '⭐', '🎵'];

function buildMemoryDeck(difficulty: BrainDifficulty): { id: number; symbol: string }[] {
  const pairCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 6;
  const chosen = MEMORY_SYMBOLS.slice(0, pairCount);
  const deck = [...chosen, ...chosen].map((symbol, idx) => ({ id: idx, symbol }));
  // Deterministic shuffle per difficulty + day
  const seed = new Date().getDate() + pairCount * 7;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = (seed * (i + 3) + i) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export const DailyMissionsModal: React.FC<DailyMissionsModalProps> = ({
  isOpen,
  missionId,
  onClose,
  uid,
  displayName,
  onEarnPoints,
  onMissionUpdated,
}) => {
  const [difficulty, setDifficulty] = useState<BrainDifficulty>('easy');
  const [brainTab, setBrainTab] = useState<BrainActivityType>('memory');
  const [rewardBanner, setRewardBanner] = useState<string | null>(null);

  // Quiz Battle state (5 fresh questions)
  const quizQuestions = useMemo(() => getDailyQuizBattleQuestions(), []);
  const [qIndex, setQIndex] = useState(0);
  const [qScore, setQScore] = useState(0);
  const [qSelected, setQSelected] = useState<number | null>(null);
  const [qFinished, setQFinished] = useState(false);

  // Picture Puzzle state
  const pictureItem = useMemo(() => getDailyPicturePuzzle(undefined, difficulty), [difficulty]);
  const [picSelected, setPicSelected] = useState<number | null>(null);

  // Word Puzzle state
  const wordItem = useMemo(() => getDailyWordPuzzle(undefined, difficulty), [difficulty]);
  const [wordGuess, setWordGuess] = useState('');
  const [wordStatus, setWordStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // Logic Challenge state
  const logicItem = useMemo(() => getDailyLogicChallenge(undefined, difficulty), [difficulty]);
  const [logicSelected, setLogicSelected] = useState<number | null>(null);

  // Memory Matching state
  const [memoryDeck, setMemoryDeck] = useState(() => buildMemoryDeck('easy'));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedSymbols, setMatchedSymbols] = useState<string[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    setRewardBanner(null);
    setQIndex(0);
    setQScore(0);
    setQSelected(null);
    setQFinished(false);
    setPicSelected(null);
    setWordGuess('');
    setWordStatus('idle');
    setLogicSelected(null);
    setMemoryDeck(buildMemoryDeck(difficulty));
    setFlippedIndices([]);
    setMatchedSymbols([]);
    setMemoryMoves(0);
    if (missionId === 'picture_puzzle') {
      setBrainTab('picture');
    } else if (missionId === 'brain_challenge') {
      setBrainTab('memory');
    }
  }, [isOpen, missionId, difficulty]);

  if (!isOpen || !missionId) return null;

  const progress = loadUserMissionsProgress(uid);

  const claimMissionReward = async (id: DailyMissionId) => {
    const res = await completeDailyMission(uid, id, displayName);
    if (!res.alreadyCompleted && res.rewardPoints > 0) {
      onEarnPoints(res.rewardPoints, `Daily Mission completed (${id.replace('_', ' ')})`);
      setRewardBanner(`+${res.rewardPoints} JoyPoints permanently saved!`);
    } else {
      setRewardBanner('Completed! Today’s mission reward was already claimed.');
    }
    onMissionUpdated?.();
  };

  // --- QUIZ BATTLE HANDLER ---
  const handleQuizAnswer = (optIdx: number) => {
    if (qSelected !== null) return;
    setQSelected(optIdx);
    const current = quizQuestions[qIndex];
    const isCorrect = optIdx === current.correctIndex;
    const nextScore = isCorrect ? qScore + 1 : qScore;
    if (isCorrect) {
      soundService.playCorrect();
      setQScore(nextScore);
    } else {
      soundService.playWrong();
    }

    setTimeout(async () => {
      if (qIndex + 1 < quizQuestions.length) {
        setQIndex(qIndex + 1);
        setQSelected(null);
      } else {
        setQFinished(true);
        recordQuizBattleScore(uid, nextScore);
        await claimMissionReward('quick_quiz');
      }
    }, 650);
  };

  // --- PICTURE PUZZLE HANDLER ---
  const handlePictureAnswer = async (optIdx: number) => {
    if (picSelected !== null) return;
    setPicSelected(optIdx);
    if (optIdx === pictureItem.correctIndex) {
      soundService.playCorrect();
      recordBrainChallengeResult(uid, 'picture', 100);
      await claimMissionReward(missionId === 'picture_puzzle' ? 'picture_puzzle' : 'brain_challenge');
    } else {
      soundService.playWrong();
    }
  };

  // --- WORD PUZZLE HANDLER ---
  const handleCheckWord = async () => {
    if (wordGuess.trim().toUpperCase() === wordItem.answer) {
      soundService.playCorrect();
      setWordStatus('correct');
      recordBrainChallengeResult(uid, 'word', 100);
      await claimMissionReward('brain_challenge');
    } else {
      soundService.playWrong();
      setWordStatus('wrong');
    }
  };

  // --- LOGIC HANDLER ---
  const handleLogicAnswer = async (optIdx: number) => {
    if (logicSelected !== null) return;
    setLogicSelected(optIdx);
    if (optIdx === logicItem.correctIndex) {
      soundService.playCorrect();
      recordBrainChallengeResult(uid, 'logic', 100);
      await claimMissionReward('brain_challenge');
    } else {
      soundService.playWrong();
    }
  };

  // --- MEMORY MATCH HANDLER ---
  const handleFlipCard = (idx: number) => {
    if (flippedIndices.length >= 2) return;
    if (flippedIndices.includes(idx)) return;
    if (matchedSymbols.includes(memoryDeck[idx].symbol)) return;

    soundService.playClick();
    const nextFlipped = [...flippedIndices, idx];
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMemoryMoves((m) => m + 1);
      const [first, second] = nextFlipped;
      if (memoryDeck[first].symbol === memoryDeck[second].symbol) {
        soundService.playCorrect();
        const nextMatched = [...matchedSymbols, memoryDeck[first].symbol];
        setMatchedSymbols(nextMatched);
        setFlippedIndices([]);
        const totalPairs = memoryDeck.length / 2;
        if (nextMatched.length === totalPairs) {
          const score = Math.max(40, 120 - memoryMoves * 5);
          recordBrainChallengeResult(uid, 'memory', score);
          void claimMissionReward('brain_challenge');
        }
      } else {
        setTimeout(() => setFlippedIndices([]), 650);
      }
    }
  };

  const titleLabel =
    missionId === 'quick_quiz'
      ? 'Quiz Battle (5 Questions)'
      : missionId === 'picture_puzzle'
      ? 'Daily Picture Puzzle'
      : 'Brain Challenge';

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-pink-100 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <div>
              <h2 className="text-sm font-black">{titleLabel}</h2>
              <p className="text-[11px] text-pink-100">
                Personal Best Quiz: {progress.quizBattleBestScore}/5 • Challenges: {progress.brainChallengesCompleted}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          {rewardBanner && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{rewardBanner}</span>
            </div>
          )}

          {/* QUIZ BATTLE */}
          {missionId === 'quick_quiz' && (
            <div className="space-y-4">
              {!qFinished ? (
                <>
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-0.5 rounded-full bg-pink-50 dark:bg-slate-800 text-rose-600 dark:text-rose-400">
                      {quizQuestions[qIndex].topic}
                    </span>
                    <span>
                      Question {qIndex + 1} / {quizQuestions.length} • Score: {qScore}
                    </span>
                  </div>

                  <p className="text-sm font-black text-gray-900 dark:text-white leading-snug">
                    {quizQuestions[qIndex].question}
                  </p>

                  <div className="space-y-2">
                    {quizQuestions[qIndex].options.map((opt, idx) => {
                      const isCorrect = idx === quizQuestions[qIndex].correctIndex;
                      const isPicked = qSelected === idx;
                      let cls =
                        'border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 hover:border-rose-400';
                      if (qSelected !== null) {
                        if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200';
                        else if (isPicked) cls = 'border-red-400 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300';
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          disabled={qSelected !== null}
                          onClick={() => handleQuizAnswer(idx)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center mx-auto">
                    <Trophy className="w-7 h-7" />
                  </div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Round Complete: {qScore} / {quizQuestions.length}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your personal best and weekly leaderboard progress have been updated.
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black tap-bounce"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PICTURE PUZZLE & BRAIN CHALLENGE */}
          {(missionId === 'picture_puzzle' || missionId === 'brain_challenge') && (
            <div className="space-y-4">
              {/* Brain Activity Switcher (only shown in Brain Challenge mode) */}
              {missionId === 'brain_challenge' && (
                <div className="grid grid-cols-4 gap-1.5 bg-pink-50 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
                  {(['memory', 'word', 'picture', 'logic'] as BrainActivityType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setBrainTab(t);
                      }}
                      className={`py-1.5 rounded-lg capitalize transition-all ${
                        brainTab === t
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}

              {/* Difficulty Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-gray-600 dark:text-gray-400">Difficulty:</span>
                <div className="flex gap-1.5">
                  {(['easy', 'medium', 'hard'] as BrainDifficulty[]).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        soundService.playClick();
                        setDifficulty(lvl);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize ${
                        difficulty === lvl
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-500'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* MEMORY MATCHING */}
              {brainTab === 'memory' && missionId === 'brain_challenge' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Moves: {memoryMoves}</span>
                    <span>
                      Matched: {matchedSymbols.length}/{memoryDeck.length / 2}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {memoryDeck.map((card, idx) => {
                      const isFaceUp =
                        flippedIndices.includes(idx) || matchedSymbols.includes(card.symbol);
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => handleFlipCard(idx)}
                          className={`aspect-square rounded-xl border text-xl font-bold flex items-center justify-center transition-all tap-bounce ${
                            isFaceUp
                              ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-700'
                              : 'bg-pink-100/70 dark:bg-slate-800 border-pink-200 dark:border-slate-700 text-rose-400'
                          }`}
                        >
                          {isFaceUp ? card.symbol : '?'}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WORD PUZZLE */}
              {brainTab === 'word' && missionId === 'brain_challenge' && (
                <div className="space-y-3">
                  <div className="bg-pink-50 dark:bg-slate-800 rounded-2xl p-4 text-center space-y-1">
                    <p className="text-[11px] font-bold text-rose-500 uppercase">Unscramble the Word</p>
                    <p className="text-2xl font-black tracking-widest text-gray-900 dark:text-white">
                      {wordItem.scrambled}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Hint: {wordItem.hint}</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={wordGuess}
                      onChange={(e) => {
                        setWordGuess(e.target.value);
                        setWordStatus('idle');
                      }}
                      placeholder="Type the unscrambled word..."
                      className="flex-1 rounded-xl border border-pink-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold text-gray-900 dark:text-white uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleCheckWord}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-black tap-bounce"
                    >
                      Check
                    </button>
                  </div>
                  {wordStatus === 'wrong' && (
                    <p className="text-xs text-red-500 font-bold">Not quite — try again!</p>
                  )}
                </div>
              )}

              {/* PICTURE IDENTIFICATION */}
              {(brainTab === 'picture' || missionId === 'picture_puzzle') && (
                <div className="space-y-3">
                  <div className="bg-pink-50 dark:bg-slate-800 rounded-2xl p-5 text-center space-y-2">
                    <p className="text-4xl tracking-widest">{pictureItem.emojis}</p>
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                      {pictureItem.clue}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {pictureItem.options.map((opt, idx) => {
                      const isCorrect = idx === pictureItem.correctIndex;
                      const isPicked = picSelected === idx;
                      let cls =
                        'border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100';
                      if (picSelected !== null) {
                        if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200';
                        else if (isPicked) cls = 'border-red-400 bg-red-50 dark:bg-red-950/50 text-red-600';
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handlePictureAnswer(idx)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all tap-bounce ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {picSelected !== null && picSelected !== pictureItem.correctIndex && (
                    <button
                      type="button"
                      onClick={() => setPicSelected(null)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  )}
                </div>
              )}

              {/* LOGIC CHALLENGE */}
              {brainTab === 'logic' && missionId === 'brain_challenge' && (
                <div className="space-y-3">
                  <div className="bg-pink-50 dark:bg-slate-800 rounded-2xl p-4">
                    <p className="text-xs font-bold text-rose-500 uppercase mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Logic Challenge
                    </p>
                    <p className="text-sm font-black text-gray-900 dark:text-white leading-snug">
                      {logicItem.prompt}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {logicItem.options.map((opt, idx) => {
                      const isCorrect = idx === logicItem.correctIndex;
                      const isPicked = logicSelected === idx;
                      let cls =
                        'border-pink-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100';
                      if (logicSelected !== null) {
                        if (isCorrect) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-200';
                        else if (isPicked) cls = 'border-red-400 bg-red-50 dark:bg-red-950/50 text-red-600';
                      }
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => handleLogicAnswer(idx)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all tap-bounce ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
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
