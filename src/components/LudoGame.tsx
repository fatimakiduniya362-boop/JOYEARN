import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Users,
  Bot,
  Zap,
  Shield,
  Star,
  Flame,
  ArrowLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { soundService } from '../services/soundService';

export interface LudoGameProps {
  onEarnPoints: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  onTriggerConfetti?: () => void;
}

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Token {
  id: number; // 0..3
  color: PlayerColor;
  step: number; // -1 = in Yard, 0 = Start, 1..50 = Common track, 51..55 = Home stretch, 56 = Home (Won)
}

export interface PlayerInfo {
  color: PlayerColor;
  name: string;
  avatar: string;
  isBot: boolean;
  tokens: Token[];
  hasWon: boolean;
  rank?: number;
}

// 52 common path track coordinates (row, col) in a 15x15 grid (0-indexed)
// Standard clockwise layout starting at Red start (6, 1)
const TRACK_COORDS: [number, number][] = [
  [6, 0],   // 0
  [6, 1],   // 1  - RED START (Safe ⭐)
  [6, 2],   // 2
  [6, 3],   // 3
  [6, 4],   // 4
  [6, 5],   // 5
  [5, 6],   // 6
  [4, 6],   // 7
  [3, 6],   // 8
  [2, 6],   // 9  - SAFE ⭐
  [1, 6],   // 10
  [0, 6],   // 11
  [0, 7],   // 12
  [0, 8],   // 13
  [1, 8],   // 14 - GREEN START (Safe ⭐)
  [2, 8],   // 15
  [3, 8],   // 16
  [4, 8],   // 17
  [5, 8],   // 18
  [6, 9],   // 19
  [6, 10],  // 20
  [6, 11],  // 21
  [6, 12],  // 22 - SAFE ⭐
  [6, 13],  // 23
  [6, 14],  // 24
  [7, 14],  // 25
  [8, 14],  // 26
  [8, 13],  // 27 - YELLOW START (Safe ⭐)
  [8, 12],  // 28
  [8, 11],  // 29
  [8, 10],  // 30
  [8, 9],   // 31
  [9, 8],   // 32
  [10, 8],  // 33
  [11, 8],  // 34
  [12, 8],  // 35 - SAFE ⭐
  [13, 8],  // 36
  [14, 8],  // 37
  [14, 7],  // 38
  [14, 6],  // 39
  [13, 6],  // 40 - BLUE START (Safe ⭐)
  [12, 6],  // 41
  [11, 6],  // 42
  [10, 6],  // 43
  [9, 6],   // 44
  [8, 5],   // 45
  [8, 4],   // 46
  [8, 3],   // 47
  [8, 2],   // 48 - SAFE ⭐
  [8, 1],   // 49
  [8, 0],   // 50
  [7, 0],   // 51 - Red entry into Home Runway
];

// 8 Safe Squares (indices on TRACK_COORDS)
const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

// Start indices for each color on TRACK_COORDS
const START_INDICES: Record<PlayerColor, number> = {
  red: 1,
  green: 14,
  yellow: 27,
  blue: 40,
};

// Home Runways (5 cells each, leading into center [7, 7])
const HOME_RUNWAYS: Record<PlayerColor, [number, number][]> = {
  red: [
    [7, 1],
    [7, 2],
    [7, 3],
    [7, 4],
    [7, 5],
  ],
  green: [
    [1, 7],
    [2, 7],
    [3, 7],
    [4, 7],
    [5, 7],
  ],
  yellow: [
    [7, 13],
    [7, 12],
    [7, 11],
    [7, 10],
    [7, 9],
  ],
  blue: [
    [13, 7],
    [12, 7],
    [11, 7],
    [10, 7],
    [9, 7],
  ],
};

// Yard Token default resting slots (row, col)
const YARD_SLOTS: Record<PlayerColor, [number, number][]> = {
  red: [
    [2, 2],
    [2, 3],
    [3, 2],
    [3, 3],
  ],
  green: [
    [2, 11],
    [2, 12],
    [3, 11],
    [3, 12],
  ],
  yellow: [
    [11, 11],
    [11, 12],
    [12, 11],
    [12, 12],
  ],
  blue: [
    [11, 2],
    [11, 3],
    [12, 2],
    [12, 3],
  ],
};

// Color palettes for UI rendering
const COLOR_CONFIG: Record<
  PlayerColor,
  {
    bg: string;
    border: string;
    text: string;
    lightBg: string;
    badge: string;
    hex: string;
    nameEn: string;
    nameUr: string;
  }
> = {
  red: {
    bg: 'bg-rose-500',
    border: 'border-rose-600',
    text: 'text-rose-600',
    lightBg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
    hex: '#f43f5e',
    nameEn: 'Red',
    nameUr: 'سرخ',
  },
  green: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-600',
    text: 'text-emerald-600',
    lightBg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
    hex: '#10b981',
    nameEn: 'Green',
    nameUr: 'سبز',
  },
  yellow: {
    bg: 'bg-amber-400',
    border: 'border-amber-500',
    text: 'text-amber-700',
    lightBg: 'bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    hex: '#f59e0b',
    nameEn: 'Yellow',
    nameUr: 'پیلا',
  },
  blue: {
    bg: 'bg-sky-500',
    border: 'border-sky-600',
    text: 'text-sky-600',
    lightBg: 'bg-sky-50',
    badge: 'bg-sky-100 text-sky-700',
    hex: '#0284c7',
    nameEn: 'Blue',
    nameUr: 'نیلا',
  },
};

export const LudoGame: React.FC<LudoGameProps> = ({
  onEarnPoints,
  onClose,
  seniorMode,
  onTriggerConfetti,
}) => {
  // Game Setup options
  const [gameMode, setGameMode] = useState<'bot' | 'pass_play'>('bot');
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [targetTokensToWin, setTargetTokensToWin] = useState<2 | 4>(2); // Quick (2) vs Classic (4)
  const [gameStarted, setGameStarted] = useState(false);

  // Active match state
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [movableTokenIds, setMovableTokenIds] = useState<number[]>([]);
  const [turnMessage, setTurnMessage] = useState<string>('Roll the dice!');
  const [consecutiveSixes, setConsecutiveSixes] = useState(0);
  const [winner, setWinner] = useState<PlayerInfo | null>(null);
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundService.getMuted());
  const [recentCaptureText, setRecentCaptureText] = useState<string | null>(null);

  // Animation and timer refs
  const botTurnTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const captureAnimTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize a new match
  const initializeMatch = useCallback(() => {
    const activeColors: PlayerColor[] =
      playerCount === 2 ? ['red', 'green'] : ['red', 'green', 'yellow', 'blue'];

    const newPlayers: PlayerInfo[] = activeColors.map((color, idx) => {
      const isHuman = gameMode === 'pass_play' || idx === 0;
      let name = '';
      let avatar = '👤';

      if (idx === 0) {
        name = seniorMode ? 'آپ (You)' : 'You (Red)';
        avatar = '👑';
      } else if (isHuman) {
        name = `Player ${idx + 1} (${COLOR_CONFIG[color].nameEn})`;
        avatar = '👥';
      } else {
        const botNames = ['Panda Bot 🐼', 'Bunny Bot 🐰', 'Tiger Bot 🐯'];
        name = botNames[idx - 1] || `Bot ${idx}`;
        avatar = idx === 1 ? '🐼' : idx === 2 ? '🐰' : '🐯';
      }

      const tokens: Token[] = [0, 1, 2, 3].map((id) => ({
        id,
        color,
        step: -1, // -1 means resting in yard
      }));

      return {
        color,
        name,
        avatar,
        isBot: !isHuman,
        tokens,
        hasWon: false,
      };
    });

    setPlayers(newPlayers);
    setCurrentPlayerIdx(0);
    setDiceValue(null);
    setIsRolling(false);
    setMovableTokenIds([]);
    setConsecutiveSixes(0);
    setWinner(null);
    setRecentCaptureText(null);
    setTurnMessage(
      seniorMode
        ? '🔴 آپ کی باری ہے! ڈائس رول کریں'
        : '🔴 Your Turn! Roll the dice'
    );
    setGameStarted(true);
  }, [gameMode, playerCount, seniorMode]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
      if (captureAnimTimeoutRef.current) clearTimeout(captureAnimTimeoutRef.current);
    };
  }, []);

  // Compute position (row, col) for a token given its step
  const getTokenCoords = useCallback(
    (token: Token): [number, number] => {
      if (token.step === -1) {
        return YARD_SLOTS[token.color][token.id];
      }
      if (token.step >= 0 && token.step <= 50) {
        const startIdx = START_INDICES[token.color];
        const globalIdx = (startIdx + token.step) % 52;
        return TRACK_COORDS[globalIdx];
      }
      if (token.step >= 51 && token.step <= 55) {
        const runwayIdx = token.step - 51;
        return HOME_RUNWAYS[token.color][runwayIdx];
      }
      // Reached Home Triangle Center
      return [7, 7];
    },
    []
  );

  // Check if a move is valid for a token with rolled dice value
  const canMoveToken = useCallback((token: Token, dice: number): boolean => {
    if (token.step === 56) return false; // Already finished
    if (token.step === -1) {
      return dice === 6; // Needs a 6 to open
    }
    // Cannot exceed step 56 (needs exact roll to enter home)
    return token.step + dice <= 56;
  }, []);

  // Find all movable tokens for the active player
  const getMovableTokens = useCallback(
    (player: PlayerInfo, dice: number): number[] => {
      return player.tokens
        .filter((t) => canMoveToken(t, dice))
        .map((t) => t.id);
    },
    [canMoveToken]
  );

  // Execute a move for a specific token
  const executeTokenMove = useCallback(
    (tokenId: number, rolledDice: number) => {
      const activePlayer = players[currentPlayerIdx];
      if (!activePlayer) return;

      soundService.playPieceMove();
      setMovableTokenIds([]);

      const updatedTokens = activePlayer.tokens.map((t) => {
        if (t.id !== tokenId) return t;
        if (t.step === -1) {
          // Open token to start square (step 0)
          return { ...t, step: 0 };
        }
        return { ...t, step: t.step + rolledDice };
      });

      const movedToken = updatedTokens.find((t) => t.id === tokenId)!;

      // Check for Token Victory (reached step 56)
      let justWonToken = false;
      if (movedToken.step === 56) {
        justWonToken = true;
        soundService.playSuccess();
      }

      // Check for Capturing / Cutting Opponent Tokens on common track
      let capturedOpponent = false;
      let capturedColorName = '';

      if (movedToken.step >= 0 && movedToken.step <= 50) {
        const startIdx = START_INDICES[movedToken.color];
        const globalIdx = (startIdx + movedToken.step) % 52;
        const isSafeSquare = SAFE_INDICES.has(globalIdx);

        if (!isSafeSquare) {
          // Check all other players' tokens at this exact cell
          players.forEach((otherPlayer, pIdx) => {
            if (pIdx === currentPlayerIdx) return;
            otherPlayer.tokens.forEach((otherToken) => {
              if (otherToken.step >= 0 && otherToken.step <= 50) {
                const otherStartIdx = START_INDICES[otherToken.color];
                const otherGlobalIdx = (otherStartIdx + otherToken.step) % 52;
                if (otherGlobalIdx === globalIdx) {
                  // CAPTURE!
                  capturedOpponent = true;
                  capturedColorName = COLOR_CONFIG[otherToken.color].nameEn;
                  otherToken.step = -1; // Send back to Yard!
                }
              }
            });
          });
        }
      }

      if (capturedOpponent) {
        soundService.playCapture();
        const bonusPoints = 15;
        onEarnPoints(bonusPoints, `Ludo: Captured ${capturedColorName} Token 🎯`);
        const msg = seniorMode
          ? `🎯 گوٹی کٹ گئی! زبردست! (+${bonusPoints} Pts) دوبارہ رول کریں!`
          : `🎯 Token Captured! (+${bonusPoints} Pts) Bonus Roll Awarded!`;
        setRecentCaptureText(msg);
        if (captureAnimTimeoutRef.current) clearTimeout(captureAnimTimeoutRef.current);
        captureAnimTimeoutRef.current = setTimeout(() => {
          setRecentCaptureText(null);
        }, 3200);
      }

      // Count finished tokens
      const finishedCount = updatedTokens.filter((t) => t.step === 56).length;
      const playerWonMatch = finishedCount >= targetTokensToWin;

      const updatedPlayers = players.map((p, idx) => {
        if (idx === currentPlayerIdx) {
          return {
            ...p,
            tokens: updatedTokens,
            hasWon: playerWonMatch,
          };
        }
        return p;
      });

      setPlayers(updatedPlayers);

      // Check Match End
      if (playerWonMatch) {
        setWinner(activePlayer);
        soundService.playDailyGoalCheer();
        onTriggerConfetti?.();
        const matchPrize = targetTokensToWin === 2 ? 50 : 100;
        onEarnPoints(
          matchPrize,
          `JoyLudo Champion Victory (${targetTokensToWin} Tokens Reached Home 👑)`
        );
        return;
      }

      // Turn continuation rules:
      // In Ludo, rolling a 6 OR capturing a token OR reaching home grants an EXTRA TURN!
      const getsBonusTurn = rolledDice === 6 || capturedOpponent || justWonToken;

      if (getsBonusTurn && consecutiveSixes < 2) {
        // Active player rolls again
        setDiceValue(null);
        setTurnMessage(
          seniorMode
            ? `${COLOR_CONFIG[activePlayer.color].nameUr} کو اضافی باری ملی! دوبارہ رول کریں 🎲`
            : `${activePlayer.name} earned a bonus roll! Roll again 🎲`
        );

        if (activePlayer.isBot) {
          botTurnTimeoutRef.current = setTimeout(() => {
            triggerDiceRoll();
          }, 900);
        }
      } else {
        // Pass turn to next player
        setConsecutiveSixes(0);
        setDiceValue(null);
        const nextIdx = (currentPlayerIdx + 1) % players.length;
        setCurrentPlayerIdx(nextIdx);
        const nextPlayer = players[nextIdx];
        setTurnMessage(
          seniorMode
            ? `${COLOR_CONFIG[nextPlayer.color].nameUr} کی باری ہے...`
            : `${nextPlayer.name}'s turn...`
        );

        if (nextPlayer.isBot) {
          botTurnTimeoutRef.current = setTimeout(() => {
            triggerDiceRoll(nextIdx);
          }, 900);
        }
      }
    },
    [
      players,
      currentPlayerIdx,
      seniorMode,
      targetTokensToWin,
      consecutiveSixes,
      onEarnPoints,
      onTriggerConfetti,
    ]
  );

  // Trigger Dice Roll (Human or Bot)
  const triggerDiceRoll = useCallback(
    (explicitPlayerIdx?: number) => {
      const pIdx = explicitPlayerIdx !== undefined ? explicitPlayerIdx : currentPlayerIdx;
      const player = players[pIdx];
      if (!player || isRolling || winner) return;

      setIsRolling(true);
      soundService.playDiceRoll();

      // Animate dice tumbling for 600ms
      setTimeout(() => {
        const rolled = Math.floor(Math.random() * 6) + 1;
        setDiceValue(rolled);
        setIsRolling(false);

        // Check for 3 sixes penalty
        if (rolled === 6) {
          if (consecutiveSixes >= 2) {
            // Three 6s in a row: forfeit turn
            setConsecutiveSixes(0);
            setTurnMessage(
              seniorMode
                ? 'تین چھکے! باری اگلے کھلاڑی کو منتقل ہو گئی'
                : '3 Sixes in a row! Turn forfeited.'
            );
            const nextIdx = (pIdx + 1) % players.length;
            setCurrentPlayerIdx(nextIdx);
            if (players[nextIdx].isBot) {
              botTurnTimeoutRef.current = setTimeout(() => {
                triggerDiceRoll(nextIdx);
              }, 900);
            }
            return;
          }
          setConsecutiveSixes((prev) => prev + 1);
        } else {
          setConsecutiveSixes(0);
        }

        const validMoves = getMovableTokens(player, rolled);
        setMovableTokenIds(validMoves);

        if (validMoves.length === 0) {
          // No valid moves: notify and pass turn
          setTurnMessage(
            rolled === 6
              ? seniorMode
                ? 'کوئی گوٹی نہیں چلائی جا سکتی'
                : 'No movable tokens'
              : seniorMode
                ? 'کوئی گوٹی نہیں کھل سکی (چھکہ چاہیے)'
                : 'No movable tokens (Needs a 6)'
          );

          botTurnTimeoutRef.current = setTimeout(() => {
            setDiceValue(null);
            const nextIdx = (pIdx + 1) % players.length;
            setCurrentPlayerIdx(nextIdx);
            const nextPlayer = players[nextIdx];
            setTurnMessage(
              seniorMode
                ? `${COLOR_CONFIG[nextPlayer.color].nameUr} کی باری ہے...`
                : `${nextPlayer.name}'s turn...`
            );
            if (nextPlayer.isBot) {
              botTurnTimeoutRef.current = setTimeout(() => {
                triggerDiceRoll(nextIdx);
              }, 900);
            }
          }, 1100);
        } else if (validMoves.length === 1 && player.isBot) {
          // Bot has only 1 move: auto-execute
          botTurnTimeoutRef.current = setTimeout(() => {
            executeTokenMove(validMoves[0], rolled);
          }, 750);
        } else if (player.isBot) {
          // Smart Bot AI Decision Engine
          botTurnTimeoutRef.current = setTimeout(() => {
            let bestTokenId = validMoves[0];
            let bestScore = -9999;

            validMoves.forEach((tId) => {
              const token = player.tokens.find((t) => t.id === tId)!;
              let score = 0;

              // Priority 1: Capturing an opponent (+1000)
              if (token.step >= 0 && token.step + rolled <= 50) {
                const targetStep = token.step + rolled;
                const targetGlobalIdx =
                  (START_INDICES[token.color] + targetStep) % 52;
                if (!SAFE_INDICES.has(targetGlobalIdx)) {
                  players.forEach((otherP, oIdx) => {
                    if (oIdx === pIdx) return;
                    otherP.tokens.forEach((otherT) => {
                      if (otherT.step >= 0 && otherT.step <= 50) {
                        const oGlobal =
                          (START_INDICES[otherT.color] + otherT.step) % 52;
                        if (oGlobal === targetGlobalIdx) {
                          score += 1000;
                        }
                      }
                    });
                  });
                }
              }

              // Priority 2: Reaching Home (+500)
              if (token.step + rolled === 56) {
                score += 500;
              }

              // Priority 3: Opening from yard on a 6 (+400)
              if (token.step === -1 && rolled === 6) {
                score += 400;
              }

              // Priority 4: Reaching a safe star square (+250)
              if (token.step >= 0 && token.step + rolled <= 50) {
                const targetStep = token.step + rolled;
                const targetGlobal =
                  (START_INDICES[token.color] + targetStep) % 52;
                if (SAFE_INDICES.has(targetGlobal)) {
                  score += 250;
                }
              }

              // Priority 5: Advancing furthest token (+100 + step)
              score += 100 + token.step;

              if (score > bestScore) {
                bestScore = score;
                bestTokenId = tId;
              }
            });

            executeTokenMove(bestTokenId, rolled);
          }, 850);
        } else if (validMoves.length === 1 && player.tokens[validMoves[0]].step === -1) {
          // If human rolled 6 and only has Yard tokens, auto prompt with highlight
          setTurnMessage(
            seniorMode
              ? 'چھکہ! گوٹی کھولنے کے لیے ہائی لائٹ شدہ دائرے پر ٹیپ کریں'
              : 'Six! Tap your highlighted token to bring it out'
          );
        } else {
          setTurnMessage(
            seniorMode
              ? 'گوٹی منتخب کریں جو آپ آگے بڑھانا چاہتے ہیں'
              : 'Tap a highlighted token to move it'
          );
        }
      }, 600);
    },
    [
      currentPlayerIdx,
      players,
      isRolling,
      winner,
      consecutiveSixes,
      seniorMode,
      getMovableTokens,
      executeTokenMove,
    ]
  );

  // Active Player & helpers
  const activePlayer = players[currentPlayerIdx];
  const isHumanTurn = activePlayer && !activePlayer.isBot;

  // Toggle Mute
  const handleToggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    soundService.setMuted(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-pink-200 flex flex-col my-auto max-h-[96vh]">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-700 p-3.5 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce"
              title="Close Ludo"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🎲</span>
                <h1 className="font-black text-base tracking-tight flex items-center gap-1">
                  JoyLudo Royal
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase">
                    {targetTokensToWin === 2 ? 'Quick' : 'Classic'}
                  </span>
                </h1>
              </div>
              <p className="text-[10.5px] text-rose-100 font-medium">
                {seniorMode
                  ? 'اصلی لودو • دوستوں یا روبوٹ کے ساتھ کھیلیں اور پوائنٹس جیتیں'
                  : 'Play vs Bot or Pass & Play • 100% Free & Win JoyPoints'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToggleSound}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce text-xs"
              title={isSoundMuted ? 'Unmute' : 'Mute'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={initializeMatch}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce text-xs"
              title="Restart Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* SETUP SCREEN (If game not yet configured) */}
        {!gameStarted ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Feature Banner */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-100 border border-pink-200 rounded-3xl p-4 text-center relative overflow-hidden shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-400 text-white flex items-center justify-center text-3xl mx-auto shadow-lg mb-2">
                🎲
              </div>
              <h2 className="font-black text-slate-900 text-lg">
                {seniorMode ? 'شاندار لودو چیلنج' : 'Royal Ludo Tournament'}
              </h2>
              <p className="text-xs text-slate-600 max-w-xs mx-auto mt-1">
                {seniorMode
                  ? 'اصلی قوانین: گوٹی کاٹنے پر بونس باری، محفوظ ستارے اور چھکہ رول!'
                  : 'Authentic rules: Cut opponent tokens, safe star squares, 3D dice rolls & genuine reward points!'}
              </p>
              <div className="flex items-center justify-center gap-3 mt-3 text-[11px] font-bold text-rose-700">
                <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-pink-200">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Safe Stars
                </span>
                <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-pink-200">
                  <Zap className="w-3 h-3 text-rose-500 fill-rose-500" /> Fast Play
                </span>
                <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-pink-200">
                  <Trophy className="w-3 h-3 text-amber-500 fill-amber-500" /> +50 to +100 Pts
                </span>
              </div>
            </div>

            {/* Mode Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                {seniorMode ? 'کھیلنے کا طریقہ منتخب کریں' : 'Choose Game Mode'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setGameMode('bot')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all tap-bounce ${
                    gameMode === 'bot'
                      ? 'border-rose-500 bg-rose-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-lg mb-1.5">
                    🤖
                  </div>
                  <h3 className="font-extrabold text-xs text-slate-900">
                    {seniorMode ? 'روبوٹ کے خلاف' : 'Vs Smart Bot'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Single player vs AI
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('pass_play')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all tap-bounce ${
                    gameMode === 'pass_play'
                      ? 'border-rose-500 bg-rose-50/80 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg mb-1.5">
                    👥
                  </div>
                  <h3 className="font-extrabold text-xs text-slate-900">
                    {seniorMode ? 'دوستوں کے ساتھ' : 'Pass & Play'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Play on same device
                  </p>
                </button>
              </div>
            </div>

            {/* Number of Players */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                {seniorMode ? 'کھلاڑیوں کی تعداد' : 'Number of Players'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPlayerCount(2)}
                  className={`py-2.5 px-3 rounded-2xl border-2 font-black text-xs transition-all tap-bounce flex items-center justify-center gap-1.5 ${
                    playerCount === 2
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <span>🔴 vs 🟢</span> 2 Players
                </button>
                <button
                  type="button"
                  onClick={() => setPlayerCount(4)}
                  className={`py-2.5 px-3 rounded-2xl border-2 font-black text-xs transition-all tap-bounce flex items-center justify-center gap-1.5 ${
                    playerCount === 4
                      ? 'border-rose-500 bg-rose-50 text-rose-700'
                      : 'border-slate-200 text-slate-600 bg-white'
                  }`}
                >
                  <span>🔴 🟢 🟡 🔵</span> 4 Players
                </button>
              </div>
            </div>

            {/* Target Tokens to Win (Quick vs Classic) */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase text-slate-500 tracking-wider">
                {seniorMode ? 'جیت کی شرط (ٹوکنز)' : 'Target to Win'}
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTargetTokensToWin(2)}
                  className={`p-2.5 rounded-2xl border-2 text-left transition-all tap-bounce ${
                    targetTokensToWin === 2
                      ? 'border-amber-500 bg-amber-50/70 text-amber-950'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">⚡ Quick Match</span>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                      +50 Pts
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">2 tokens home to win</p>
                </button>

                <button
                  type="button"
                  onClick={() => setTargetTokensToWin(4)}
                  className={`p-2.5 rounded-2xl border-2 text-left transition-all tap-bounce ${
                    targetTokensToWin === 4
                      ? 'border-amber-500 bg-amber-50/70 text-amber-950'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs">👑 Classic Match</span>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded-full">
                      +100 Pts
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">All 4 tokens home</p>
                </button>
              </div>
            </div>

            {/* Start Button */}
            <button
              type="button"
              onClick={initializeMatch}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white font-black text-sm shadow-md tap-bounce flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{seniorMode ? 'کھیل شروع کریں (Start Ludo)' : 'Start Ludo Game'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ACTIVE MATCH PLAY SCREEN */
          <div className="p-2 sm:p-3 space-y-2.5 overflow-y-auto flex-1 flex flex-col justify-between">
            {/* Status & Player Banners */}
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, idx) => {
                const isCurrent = idx === currentPlayerIdx;
                const homeTokensCount = p.tokens.filter((t) => t.step === 56).length;
                return (
                  <div
                    key={p.color}
                    className={`rounded-2xl p-2 border-2 transition-all flex items-center justify-between ${
                      isCurrent
                        ? `${COLOR_CONFIG[p.color].border} ${COLOR_CONFIG[p.color].lightBg} ring-2 ring-pink-300 shadow-xs scale-[1.02]`
                        : 'border-slate-200 bg-white opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-7 h-7 rounded-xl ${COLOR_CONFIG[p.color].bg} text-white flex items-center justify-center text-xs font-black shadow-xs`}
                      >
                        {p.avatar}
                      </div>
                      <div className="leading-tight">
                        <div className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1">
                          {p.name.split(' ')[0]}
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          )}
                        </div>
                        <div className="text-[9.5px] text-slate-500">
                          {homeTokensCount}/{targetTokensToWin} Home 🏁
                        </div>
                      </div>
                    </div>

                    {/* Mini Token Status Indicators */}
                    <div className="flex gap-0.5">
                      {p.tokens.slice(0, targetTokensToWin).map((t) => (
                        <span
                          key={t.id}
                          className={`w-2.5 h-2.5 rounded-full border ${
                            t.step === 56
                              ? 'bg-amber-400 border-amber-600'
                              : t.step >= 0
                              ? `${COLOR_CONFIG[p.color].bg} border-slate-700`
                              : 'bg-slate-200 border-slate-300'
                          }`}
                          title={`Token ${t.id + 1}: ${
                            t.step === 56 ? 'Finished' : t.step >= 0 ? 'Active' : 'In Yard'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Turn Announcement Banner */}
            <div className="bg-slate-900 text-white rounded-2xl py-2 px-3 text-center shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <span className="text-base">
                  {activePlayer ? COLOR_CONFIG[activePlayer.color].nameEn === 'Red' ? '🔴' : '🟢' : '🎲'}
                </span>
                <span className="text-xs font-black tracking-tight line-clamp-1">
                  {turnMessage}
                </span>
              </div>
              {recentCaptureText && (
                <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30 animate-pulse">
                  Capture!
                </span>
              )}
            </div>

            {/* 15x15 LUDO BOARD SVG CONTAINER */}
            <div className="w-full aspect-square max-w-[370px] mx-auto bg-amber-50/70 p-1 rounded-3xl border-4 border-slate-800 shadow-xl relative overflow-hidden select-none">
              {/* Board Grid */}
              <svg
                viewBox="0 0 1500 1500"
                className="w-full h-full rounded-2xl"
                style={{ touchAction: 'manipulation' }}
              >
                {/* 1. YARD BASES (6x6 cells each = 600x600 px) */}
                {/* Red Yard (Top-Left: 0..600, 0..600) */}
                <rect x="0" y="0" width="600" height="600" fill="#f43f5e" />
                <rect x="100" y="100" width="400" height="400" rx="36" fill="#ffffff" />
                {/* Green Yard (Top-Right: 900..1500, 0..600) */}
                <rect x="900" y="0" width="600" height="600" fill="#10b981" />
                <rect x="1000" y="100" width="400" height="400" rx="36" fill="#ffffff" />
                {/* Blue Yard (Bottom-Left: 0..600, 900..1500) */}
                <rect x="0" y="900" width="600" height="600" fill="#0284c7" />
                <rect x="100" y="1000" width="400" height="400" rx="36" fill="#ffffff" />
                {/* Yellow Yard (Bottom-Right: 900..1500, 900..1500) */}
                <rect x="900" y="900" width="600" height="600" fill="#f59e0b" />
                <rect x="1000" y="1000" width="400" height="400" rx="36" fill="#ffffff" />

                {/* Yard Resting Circles */}
                {/* Red Yard circles */}
                <circle cx="200" cy="200" r="50" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="6" />
                <circle cx="400" cy="200" r="50" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="6" />
                <circle cx="200" cy="400" r="50" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="6" />
                <circle cx="400" cy="400" r="50" fill="#ffe4e6" stroke="#f43f5e" strokeWidth="6" />
                {/* Green Yard circles */}
                <circle cx="1100" cy="200" r="50" fill="#d1fae5" stroke="#10b981" strokeWidth="6" />
                <circle cx="1300" cy="200" r="50" fill="#d1fae5" stroke="#10b981" strokeWidth="6" />
                <circle cx="1100" cy="400" r="50" fill="#d1fae5" stroke="#10b981" strokeWidth="6" />
                <circle cx="1300" cy="400" r="50" fill="#d1fae5" stroke="#10b981" strokeWidth="6" />
                {/* Blue Yard circles */}
                <circle cx="200" cy="1100" r="50" fill="#e0f2fe" stroke="#0284c7" strokeWidth="6" />
                <circle cx="400" cy="1100" r="50" fill="#e0f2fe" stroke="#0284c7" strokeWidth="6" />
                <circle cx="200" cy="1300" r="50" fill="#e0f2fe" stroke="#0284c7" strokeWidth="6" />
                <circle cx="400" cy="1300" r="50" fill="#e0f2fe" stroke="#0284c7" strokeWidth="6" />
                {/* Yellow Yard circles */}
                <circle cx="1100" cy="1100" r="50" fill="#fef3c7" stroke="#f59e0b" strokeWidth="6" />
                <circle cx="1300" cy="1100" r="50" fill="#fef3c7" stroke="#f59e0b" strokeWidth="6" />
                <circle cx="1100" cy="1300" r="50" fill="#fef3c7" stroke="#f59e0b" strokeWidth="6" />
                <circle cx="1300" cy="1300" r="50" fill="#fef3c7" stroke="#f59e0b" strokeWidth="6" />

                {/* 2. 52 COMMON TRACK CELLS */}
                {TRACK_COORDS.map(([r, c], idx) => {
                  const isRedStart = idx === 1;
                  const isGreenStart = idx === 14;
                  const isYellowStart = idx === 27;
                  const isBlueStart = idx === 40;
                  const isSafe = SAFE_INDICES.has(idx);

                  let cellFill = '#ffffff';
                  if (isRedStart) cellFill = '#ffe4e6';
                  else if (isGreenStart) cellFill = '#d1fae5';
                  else if (isYellowStart) cellFill = '#fef3c7';
                  else if (isBlueStart) cellFill = '#e0f2fe';

                  return (
                    <g key={`track-${idx}`}>
                      <rect
                        x={c * 100}
                        y={r * 100}
                        width="100"
                        height="100"
                        fill={cellFill}
                        stroke="#cbd5e1"
                        strokeWidth="2"
                      />
                      {/* Star on Safe cells */}
                      {isSafe && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 64}
                          textAnchor="middle"
                          fontSize="42"
                          fill="#f59e0b"
                          className="font-bold select-none"
                        >
                          ★
                        </text>
                      )}
                      {/* Start Arrow Indicators */}
                      {isRedStart && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 82}
                          textAnchor="middle"
                          fontSize="26"
                          fill="#f43f5e"
                          fontWeight="bold"
                        >
                          🔴
                        </text>
                      )}
                      {isGreenStart && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 82}
                          textAnchor="middle"
                          fontSize="26"
                          fill="#10b981"
                          fontWeight="bold"
                        >
                          🟢
                        </text>
                      )}
                      {isYellowStart && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 82}
                          textAnchor="middle"
                          fontSize="26"
                          fill="#f59e0b"
                          fontWeight="bold"
                        >
                          🟡
                        </text>
                      )}
                      {isBlueStart && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 82}
                          textAnchor="middle"
                          fontSize="26"
                          fill="#0284c7"
                          fontWeight="bold"
                        >
                          🔵
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* 3. HOME RUNWAYS (5 cells each) */}
                {/* Red Runway: row 7, cols 1..5 */}
                {HOME_RUNWAYS.red.map(([r, c], idx) => (
                  <rect
                    key={`red-runway-${idx}`}
                    x={c * 100}
                    y={r * 100}
                    width="100"
                    height="100"
                    fill="#f43f5e"
                    stroke="#fda4af"
                    strokeWidth="2"
                  />
                ))}
                {/* Green Runway: col 7, rows 1..5 */}
                {HOME_RUNWAYS.green.map(([r, c], idx) => (
                  <rect
                    key={`green-runway-${idx}`}
                    x={c * 100}
                    y={r * 100}
                    width="100"
                    height="100"
                    fill="#10b981"
                    stroke="#6ee7b7"
                    strokeWidth="2"
                  />
                ))}
                {/* Yellow Runway: row 7, cols 9..13 */}
                {HOME_RUNWAYS.yellow.map(([r, c], idx) => (
                  <rect
                    key={`yellow-runway-${idx}`}
                    x={c * 100}
                    y={r * 100}
                    width="100"
                    height="100"
                    fill="#f59e0b"
                    stroke="#fde68a"
                    strokeWidth="2"
                  />
                ))}
                {/* Blue Runway: col 7, rows 9..13 */}
                {HOME_RUNWAYS.blue.map(([r, c], idx) => (
                  <rect
                    key={`blue-runway-${idx}`}
                    x={c * 100}
                    y={r * 100}
                    width="100"
                    height="100"
                    fill="#0284c7"
                    stroke="#7dd3fc"
                    strokeWidth="2"
                  />
                ))}

                {/* 4. CENTER FINISH TRIANGLES (rows 6..8, cols 6..8 = 600..900, 600..900) */}
                {/* Center base square */}
                <rect x="600" y="600" width="300" height="300" fill="#ffffff" stroke="#94a3b8" strokeWidth="3" />
                {/* Red Triangle (Left) */}
                <polygon points="600,600 750,750 600,900" fill="#f43f5e" />
                {/* Green Triangle (Top) */}
                <polygon points="600,600 750,750 900,600" fill="#10b981" />
                {/* Yellow Triangle (Right) */}
                <polygon points="900,600 750,750 900,900" fill="#f59e0b" />
                {/* Blue Triangle (Bottom) */}
                <polygon points="600,900 750,750 900,900" fill="#0284c7" />
                {/* Center Crown / Trophy */}
                <circle cx="750" cy="750" r="48" fill="#ffffff" stroke="#e2e8f0" strokeWidth="4" />
                <text x="750" y="765" textAnchor="middle" fontSize="36" fill="#f59e0b">
                  👑
                </text>

                {/* 5. ALL ACTIVE TOKENS ON BOARD */}
                {players.flatMap((p, pIdx) =>
                  p.tokens.map((token) => {
                    const [r, c] = getTokenCoords(token);
                    const isMovable =
                      pIdx === currentPlayerIdx &&
                      movableTokenIds.includes(token.id) &&
                      diceValue !== null &&
                      !isRolling;

                    const tokenColorHex = COLOR_CONFIG[token.color].hex;
                    const cx = c * 100 + 50;
                    const cy = r * 100 + 50;

                    // If token reached Home
                    if (token.step === 56) {
                      return (
                        <g key={`finished-token-${token.color}-${token.id}`}>
                          <circle cx={cx} cy={cy} r="28" fill="#fbbf24" stroke="#78350f" strokeWidth="3" />
                          <text x={cx} y={cy + 8} textAnchor="middle" fontSize="22">
                            👑
                          </text>
                        </g>
                      );
                    }

                    return (
                      <g
                        key={`token-${token.color}-${token.id}`}
                        onClick={() => {
                          if (isMovable && isHumanTurn && diceValue !== null) {
                            executeTokenMove(token.id, diceValue);
                          }
                        }}
                        style={{
                          cursor: isMovable && isHumanTurn ? 'pointer' : 'default',
                        }}
                        className="transition-transform duration-300"
                      >
                        {/* Pulsing Highlight Ring when movable */}
                        {isMovable && isHumanTurn && (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="44"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="8"
                            strokeDasharray="12 6"
                            className="animate-spin"
                            style={{ transformOrigin: `${cx}px ${cy}px` }}
                          />
                        )}

                        {/* Drop shadow */}
                        <circle cx={cx + 3} cy={cy + 4} r="32" fill="rgba(0,0,0,0.25)" />

                        {/* Token Outer Ring */}
                        <circle
                          cx={cx}
                          cy={cy}
                          r="32"
                          fill={tokenColorHex}
                          stroke="#ffffff"
                          strokeWidth="5"
                        />

                        {/* Inner Gradient Highlight */}
                        <circle cx={cx - 6} cy={cy - 6} r="16" fill="rgba(255,255,255,0.45)" />

                        {/* Token Number / Star */}
                        <text
                          x={cx}
                          y={cy + 8}
                          textAnchor="middle"
                          fontSize="24"
                          fontWeight="900"
                          fill="#ffffff"
                          className="select-none pointer-events-none"
                        >
                          {token.step === -1 ? '●' : token.id + 1}
                        </text>
                      </g>
                    );
                  })
                )}
              </svg>
            </div>

            {/* CONTROLS & 3D INTERACTIVE DICE */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
              {/* Turn indicator info */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-2xl ${
                    activePlayer ? COLOR_CONFIG[activePlayer.color].bg : 'bg-slate-300'
                  } text-white flex items-center justify-center font-black text-sm shadow-xs`}
                >
                  {activePlayer?.avatar || '🎲'}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                    {activePlayer?.name}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    {isHumanTurn
                      ? diceValue === null
                        ? seniorMode
                          ? 'ڈائس رول کریں'
                          : 'Tap dice to roll'
                        : seniorMode
                        ? 'گوٹی منتخب کریں'
                        : 'Select your token'
                      : seniorMode
                      ? 'روبوٹ سوچ رہا ہے...'
                      : 'Bot thinking...'}
                  </p>
                </div>
              </div>

              {/* 3D Rolling Dice Box */}
              <div className="flex items-center gap-3">
                {/* Dice Button */}
                <button
                  type="button"
                  disabled={!isHumanTurn || isRolling || diceValue !== null || !!winner}
                  onClick={() => triggerDiceRoll()}
                  className={`w-14 h-14 rounded-2xl bg-white border-2 flex items-center justify-center transition-all tap-bounce relative select-none shadow-md ${
                    isRolling ? 'animate-bounce border-pink-400 rotate-12 scale-105' : ''
                  } ${
                    isHumanTurn && diceValue === null && !isRolling && !winner
                      ? 'border-rose-500 ring-4 ring-rose-400/40 cursor-pointer animate-pulse'
                      : 'border-slate-300'
                  }`}
                  title="Roll Dice"
                >
                  {isRolling ? (
                    <span className="text-2xl animate-spin">🎲</span>
                  ) : diceValue !== null ? (
                    /* Render Crisp Dice Pips (1 to 6) */
                    <div className="w-10 h-10 grid grid-cols-3 grid-rows-3 p-1">
                      {/* Pip 1: Center */}
                      {diceValue % 2 === 1 && (
                        <div className="col-start-2 row-start-2 w-2.5 h-2.5 rounded-full bg-slate-900 mx-auto my-auto" />
                      )}
                      {/* Pips for 2, 3, 4, 5, 6 */}
                      {diceValue >= 2 && (
                        <>
                          <div className="col-start-1 row-start-1 w-2.5 h-2.5 rounded-full bg-slate-900" />
                          <div className="col-start-3 row-start-3 w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mt-auto" />
                        </>
                      )}
                      {/* Pips for 4, 5, 6 */}
                      {diceValue >= 4 && (
                        <>
                          <div className="col-start-3 row-start-1 w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto" />
                          <div className="col-start-1 row-start-3 w-2.5 h-2.5 rounded-full bg-slate-900 mt-auto" />
                        </>
                      )}
                      {/* Extra pips for 6 */}
                      {diceValue === 6 && (
                        <>
                          <div className="col-start-1 row-start-2 w-2.5 h-2.5 rounded-full bg-slate-900 my-auto" />
                          <div className="col-start-3 row-start-2 w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto my-auto" />
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <span className="text-2xl">🎲</span>
                      <span className="text-[8px] font-black text-rose-600 uppercase">
                        ROLL
                      </span>
                    </div>
                  )}

                  {/* 6 Bonus Star indicator */}
                  {diceValue === 6 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black flex items-center justify-center border border-white shadow-xs">
                      ★
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WINNER CELEBRATION MODAL */}
        {winner && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl border-4 border-amber-300 animate-scale-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-900 flex items-center justify-center text-4xl mx-auto shadow-lg animate-bounce">
                👑
              </div>

              <div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                  Victory!
                </span>
                <h3 className="font-black text-2xl text-slate-900 mt-2">
                  {winner.name} Won!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  {seniorMode
                    ? `مبارک ہو! تمام ضروری ${targetTokensToWin} گوٹیاں کامیابی سے گھر پہنچ گئیں 🏆`
                    : `Congratulations! First to safely bring ${targetTokensToWin} tokens Home!`}
                </p>
              </div>

              {/* Reward Award Box */}
              <div className="bg-gradient-to-r from-pink-50 to-amber-50 rounded-2xl p-3 border border-pink-200">
                <span className="text-xs text-slate-500 font-bold">JoyPoints Reward</span>
                <div className="text-xl font-black text-rose-600 mt-0.5">
                  +{targetTokensToWin === 2 ? 50 : 100} JoyPoints 🪙
                </div>
                <p className="text-[10.5px] text-emerald-600 font-bold mt-0.5">
                  ✓ Automatically added to your Redeemable Balance
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={initializeMatch}
                  className="py-3 rounded-2xl bg-slate-900 text-white font-extrabold text-xs shadow-md tap-bounce flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Play Again</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-xs shadow-md tap-bounce"
                >
                  Return to Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
