import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, RotateCcw, ArrowLeft, Heart, CheckCircle2 } from 'lucide-react';

interface MiniGamesProps {
  onEarnPoints: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
}

// Game 1: Cute Garden Match
const GARDEN_ITEMS = ['🌸', '🍎', '🦋', '⭐', '🌈', '🌻'];

export const MiniGames: React.FC<MiniGamesProps> = ({ onEarnPoints, onClose, seniorMode }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'match' | 'puzzle' | 'memory'>('menu');

  // Garden Match State
  const [grid, setGrid] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [matchScore, setMatchScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(12);
  const [matchGameOver, setMatchGameOver] = useState(false);

  // Initialize Match Grid
  const initMatchGame = () => {
    const newGrid: string[] = [];
    for (let i = 0; i < 16; i++) {
      newGrid.push(GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)]);
    }
    setGrid(newGrid);
    setSelectedIndex(null);
    setMatchScore(0);
    setMovesLeft(12);
    setMatchGameOver(false);
  };

  const handleTileClick = (index: number) => {
    if (matchGameOver || movesLeft <= 0) return;

    if (selectedIndex === null) {
      setSelectedIndex(index);
    } else {
      if (selectedIndex === index) {
        setSelectedIndex(null);
        return;
      }

      // Check if tiles match or are adjacent
      const isMatch = grid[selectedIndex] === grid[index];
      const newGrid = [...grid];

      if (isMatch) {
        const pointsGained = 15;
        setMatchScore((prev) => prev + pointsGained);
        // Replace with new random items
        newGrid[selectedIndex] = GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)];
        newGrid[index] = GARDEN_ITEMS[Math.floor(Math.random() * GARDEN_ITEMS.length)];
        setGrid(newGrid);
      }

      const nextMoves = movesLeft - 1;
      setMovesLeft(nextMoves);
      setSelectedIndex(null);

      if (nextMoves <= 0) {
        setMatchGameOver(true);
        const finalReward = 25;
        onEarnPoints(finalReward, 'Completed Cute Garden Match Level');
      }
    }
  };

  // Game 2: Happy Animal Puzzle
  const ANIMALS = [
    { id: 'panda', name: 'Panda 🐼', emoji: '🐼', habitat: 'Bamboo Grove' },
    { id: 'rabbit', name: 'Rabbit 🐰', emoji: '🐰', habitat: 'Green Meadow' },
    { id: 'puppy', name: 'Puppy 🐶', emoji: '🐶', habitat: 'Cozy House' },
    { id: 'kitten', name: 'Kitten 🐱', emoji: '🐱', habitat: 'Warm Garden' },
    { id: 'bird', name: 'Bird 🐥', emoji: '🐥', habitat: 'Sunny Tree' },
    { id: 'elephant', name: 'Elephant 🐘', emoji: '🐘', habitat: 'Forest Stream' },
  ];
  const [unplacedAnimals, setUnplacedAnimals] = useState(ANIMALS);
  const [placedAnimals, setPlacedAnimals] = useState<string[]>([]);
  const [puzzleCompleted, setPuzzleCompleted] = useState(false);

  const initPuzzleGame = () => {
    setUnplacedAnimals([...ANIMALS].sort(() => Math.random() - 0.5));
    setPlacedAnimals([]);
    setPuzzleCompleted(false);
  };

  const handlePlaceAnimal = (animalId: string) => {
    if (placedAnimals.includes(animalId)) return;
    const next = [...placedAnimals, animalId];
    setPlacedAnimals(next);
    setUnplacedAnimals((prev) => prev.filter((a) => a.id !== animalId));

    if (next.length === ANIMALS.length) {
      setPuzzleCompleted(true);
      onEarnPoints(30, 'Completed Happy Animal Puzzle');
    }
  };

  // Game 3: Rainbow Memory
  const MEMORY_SYMBOLS = ['⭐', '🌸', '🍓', '🐼', '🌈'];
  const [memorySequence, setMemorySequence] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [isShowingSequence, setIsShowingSequence] = useState(false);
  const [memoryRound, setMemoryRound] = useState(1);
  const [memoryStatus, setMemoryStatus] = useState<'idle' | 'watching' | 'playing' | 'success' | 'failed'>('idle');

  const startMemoryRound = (round = 1) => {
    setMemoryRound(round);
    setPlayerInput([]);
    setMemoryStatus('watching');
    setIsShowingSequence(true);

    // generate sequence of length round + 2
    const seqLength = round + 2;
    const newSeq: string[] = [];
    for (let i = 0; i < seqLength; i++) {
      newSeq.push(MEMORY_SYMBOLS[Math.floor(Math.random() * MEMORY_SYMBOLS.length)]);
    }
    setMemorySequence(newSeq);

    setTimeout(() => {
      setIsShowingSequence(false);
      setMemoryStatus('playing');
    }, seqLength * 900);
  };

  const handleMemorySelect = (symbol: string) => {
    if (memoryStatus !== 'playing') return;

    const nextInput = [...playerInput, symbol];
    setPlayerInput(nextInput);

    const currentIndex = nextInput.length - 1;
    if (memorySequence[currentIndex] !== symbol) {
      setMemoryStatus('failed');
      return;
    }

    if (nextInput.length === memorySequence.length) {
      setMemoryStatus('success');
      onEarnPoints(20, `Rainbow Memory Round ${memoryRound} Clear`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border-4 border-pink-200">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activeTab !== 'menu' && (
              <button
                onClick={() => setActiveTab('menu')}
                className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className={`font-bold flex items-center gap-1.5 ${seniorMode ? 'text-2xl' : 'text-lg'}`}>
                <span>🎮</span> Family Mini-Games
              </h2>
              <p className="text-xs text-white/90">Safe, non-violent, 100% free & legitimate</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'menu' && (
            <div className="space-y-3.5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-800 flex items-start gap-2">
                <span className="text-base">🛡️</span>
                <div>
                  <p className="font-bold">Family Play Guarantee</p>
                  <p>No gambling, no real cash betting, no paid loot boxes. Play for fun & eligible reward points!</p>
                </div>
              </div>

              {/* Game 1 Card */}
              <div
                onClick={() => {
                  initMatchGame();
                  setActiveTab('match');
                }}
                className="bg-gradient-to-r from-pink-50 to-rose-50 border-2 border-pink-200 rounded-2xl p-4 cursor-pointer hover:border-pink-400 transition-all shadow-sm tap-bounce flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center text-3xl shadow-inner">
                  🌸
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">Cute Garden Match</h3>
                    <span className="text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full font-medium">+25 Pts</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Match flowers, fruits, butterflies, stars and rainbows!</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-pink-600">Tap to Play →</span>
                </div>
              </div>

              {/* Game 2 Card */}
              <div
                onClick={() => {
                  initPuzzleGame();
                  setActiveTab('puzzle');
                }}
                className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl p-4 cursor-pointer hover:border-emerald-400 transition-all shadow-sm tap-bounce flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-3xl shadow-inner">
                  🐼
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">Happy Animal Puzzle</h3>
                    <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">+30 Pts</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Place Panda, Rabbit, Puppy, Kitten and Elephant in their homes!</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-emerald-700">Tap to Play →</span>
                </div>
              </div>

              {/* Game 3 Card */}
              <div
                onClick={() => {
                  setActiveTab('memory');
                  startMemoryRound(1);
                }}
                className="bg-gradient-to-r from-sky-50 to-indigo-50 border-2 border-sky-200 rounded-2xl p-4 cursor-pointer hover:border-sky-400 transition-all shadow-sm tap-bounce flex items-center gap-4"
              >
                <div className="w-16 h-16 rounded-2xl bg-sky-100 flex items-center justify-center text-3xl shadow-inner">
                  🌈
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">Rainbow Memory</h3>
                    <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded-full font-medium">+20 Pts</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Watch and repeat cheerful patterns of stars and rainbows!</p>
                  <span className="inline-block mt-2 text-xs font-semibold text-sky-700">Tap to Play →</span>
                </div>
              </div>
            </div>
          )}

          {/* GAME 1: MATCH */}
          {activeTab === 'match' && (
            <div className="space-y-4 text-center">
              <div className="flex justify-between items-center bg-pink-50 p-2.5 rounded-xl border border-pink-200">
                <div className="text-xs text-pink-900 font-bold">
                  Score: <span className="text-pink-600 text-sm">{matchScore}</span>
                </div>
                <div className="text-xs text-pink-900 font-bold">
                  Moves Left: <span className="text-pink-600 text-sm">{movesLeft}</span>
                </div>
                <button
                  onClick={initMatchGame}
                  className="p-1 rounded-lg bg-pink-100 text-pink-700 hover:bg-pink-200"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-gray-500">Tap two identical items anywhere on the board to clear them!</p>

              <div className="grid grid-cols-4 gap-2.5 max-w-[280px] mx-auto p-2 bg-pink-100/50 rounded-2xl border-2 border-pink-200">
                {grid.map((item, index) => {
                  const isSelected = selectedIndex === index;
                  return (
                    <button
                      key={index}
                      onClick={() => handleTileClick(index)}
                      className={`h-14 rounded-xl flex items-center justify-center text-2xl transition-all shadow-sm ${
                        isSelected
                          ? 'bg-pink-300 ring-4 ring-pink-500 scale-105'
                          : 'bg-white hover:bg-pink-50 border border-pink-200'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {matchGameOver && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-2 animate-bounce-subtle">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-bold text-emerald-800">Garden Match Complete!</h4>
                  <p className="text-xs text-emerald-700">You earned +25 reward points for completing the round.</p>
                  <button
                    onClick={initMatchGame}
                    className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 tap-bounce text-sm"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GAME 2: PUZZLE */}
          {activeTab === 'puzzle' && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold text-gray-800 text-sm">Place Friends in Safe Habitats</h3>
                <p className="text-xs text-gray-500">Tap an available animal below to place it into the sanctuary.</p>
              </div>

              {/* Habitat Slots */}
              <div className="grid grid-cols-2 gap-2.5">
                {ANIMALS.map((animal) => {
                  const isPlaced = placedAnimals.includes(animal.id);
                  return (
                    <div
                      key={animal.id}
                      className={`p-3 rounded-2xl border-2 text-center transition-all ${
                        isPlaced
                          ? 'bg-emerald-50 border-emerald-300 shadow-sm'
                          : 'bg-gray-50 border-dashed border-gray-300'
                      }`}
                    >
                      <div className="text-3xl min-h-[36px]">{isPlaced ? animal.emoji : '❓'}</div>
                      <div className="text-xs font-bold text-gray-800 mt-1">{animal.name}</div>
                      <div className="text-[10px] text-gray-500">{animal.habitat}</div>
                    </div>
                  );
                })}
              </div>

              {/* Unplaced Animals Drawer */}
              {!puzzleCompleted && (
                <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="text-xs font-bold text-emerald-900">Tap an animal to place:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {unplacedAnimals.map((animal) => (
                      <button
                        key={animal.id}
                        onClick={() => handlePlaceAnimal(animal.id)}
                        className="p-2.5 bg-white border border-emerald-300 rounded-xl flex items-center gap-1.5 shadow-sm tap-bounce hover:bg-emerald-100"
                      >
                        <span className="text-xl">{animal.emoji}</span>
                        <span className="text-xs font-medium text-gray-700">{animal.name.split(' ')[0]}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {puzzleCompleted && (
                <div className="bg-emerald-100 border-2 border-emerald-400 rounded-2xl p-4 text-center space-y-2">
                  <div className="text-4xl">🐼🌸🐰</div>
                  <h4 className="font-bold text-emerald-900">All Animals Happy in Nature!</h4>
                  <p className="text-xs text-emerald-800">You earned +30 reward points for solving the animal puzzle!</p>
                  <button
                    onClick={initPuzzleGame}
                    className="w-full py-2.5 bg-emerald-700 text-white rounded-xl font-bold hover:bg-emerald-800 tap-bounce text-sm"
                  >
                    Play Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GAME 3: RAINBOW MEMORY */}
          {activeTab === 'memory' && (
            <div className="space-y-4 text-center">
              <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-xl flex justify-between items-center text-xs">
                <span className="font-bold text-sky-900">Round: {memoryRound}</span>
                <span className="text-sky-700">Remember the order!</span>
              </div>

              {/* Sequence Display */}
              <div className="h-24 bg-gradient-to-r from-sky-100 via-indigo-50 to-purple-100 rounded-2xl border-2 border-sky-200 flex items-center justify-center gap-2 p-2">
                {isShowingSequence ? (
                  <div className="flex gap-2">
                    {memorySequence.map((symbol, idx) => (
                      <div
                        key={idx}
                        className="w-11 h-11 rounded-xl bg-white shadow-md flex items-center justify-center text-2xl animate-pulse"
                      >
                        {symbol}
                      </div>
                    ))}
                  </div>
                ) : memoryStatus === 'playing' ? (
                  <div className="text-center">
                    <p className="text-xs font-bold text-indigo-900">Your Turn! Recreate the sequence:</p>
                    <div className="flex gap-1.5 justify-center mt-2">
                      {playerInput.map((sym, idx) => (
                        <span key={idx} className="w-8 h-8 rounded-lg bg-white shadow flex items-center justify-center text-lg">
                          {sym}
                        </span>
                      ))}
                      {Array.from({ length: memorySequence.length - playerInput.length }).map((_, idx) => (
                        <span
                          key={idx}
                          className="w-8 h-8 rounded-lg border-2 border-dashed border-sky-300 flex items-center justify-center text-xs text-sky-400"
                        >
                          ?
                        </span>
                      ))}
                    </div>
                  </div>
                ) : memoryStatus === 'success' ? (
                  <div className="text-emerald-700 font-bold text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5" /> Super Memory! +20 Points
                  </div>
                ) : memoryStatus === 'failed' ? (
                  <div className="text-rose-600 font-bold text-sm">
                    Oops! Try again next time.
                  </div>
                ) : (
                  <span className="text-xs text-gray-500">Ready to play...</span>
                )}
              </div>

              {/* Memory Keys */}
              <div className="flex justify-center gap-2 pt-2">
                {MEMORY_SYMBOLS.map((symbol) => (
                  <button
                    key={symbol}
                    onClick={() => handleMemorySelect(symbol)}
                    disabled={memoryStatus !== 'playing'}
                    className="w-14 h-14 rounded-2xl bg-white border-2 border-sky-200 hover:border-sky-400 shadow-md text-2xl flex items-center justify-center disabled:opacity-50 tap-bounce"
                  >
                    {symbol}
                  </button>
                ))}
              </div>

              {/* Status buttons */}
              {memoryStatus === 'success' && (
                <button
                  onClick={() => startMemoryRound(memoryRound + 1)}
                  className="w-full py-2.5 bg-sky-600 text-white rounded-xl font-bold hover:bg-sky-700 tap-bounce text-sm mt-3"
                >
                  Next Round ({memoryRound + 1}) →
                </button>
              )}

              {memoryStatus === 'failed' && (
                <button
                  onClick={() => startMemoryRound(1)}
                  className="w-full py-2.5 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 tap-bounce text-sm mt-3"
                >
                  Retry Round 1
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
