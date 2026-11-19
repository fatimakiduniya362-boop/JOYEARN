import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Star,
  ArrowLeft,
  ChevronRight,
  SlidersHorizontal,
  WifiOff,
  Play,
  Trash2,
} from 'lucide-react';
import { soundService } from '../services/soundService';
import {
  PlayerColor,
  Token,
  PlayerInfo,
  LudoGameMode,
  LudoMatchState,
  TRACK_COORDS,
  SAFE_INDICES,
  HOME_RUNWAYS,
  YARD_TOKEN_SVG_COORDS,
  HOME_FINISH_SLOTS,
  createInitialLudoMatch,
  getTokenBoardGridCoords,
  beginDiceRoll,
  applyDiceRoll,
  advanceToNextTurn,
  applyTokenMove,
  chooseBestBotToken,
  saveLudoMatchState,
  loadSavedLudoMatchState,
  clearSavedLudoMatchState,
} from '../services/ludoEngine';

export type { PlayerColor, Token, PlayerInfo };

export interface LudoGameProps {
  onEarnPoints: (points: number, reason: string) => void;
  onClose: () => void;
  seniorMode: boolean;
  onTriggerConfetti?: () => void;
}

const COLOR_CONFIG: Record<
  PlayerColor,
  {
    bg: string;
    border: string;
    text: string;
    lightBg: string;
    badge: string;
    hex: string;
    emoji: string;
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
    emoji: '🔴',
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
    emoji: '🟢',
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
    emoji: '🟡',
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
    emoji: '🔵',
    nameEn: 'Blue',
    nameUr: 'نیلا',
  },
};

const getClusterLayout = (count: number, indexInCell: number): { dx: number; dy: number; radius: number } => {
  if (count <= 1) return { dx: 0, dy: 0, radius: 32 };
  if (count === 2) {
    const offsets = [
      [-17, -10],
      [17, 10],
    ];
    const [dx, dy] = offsets[indexInCell % 2];
    return { dx, dy, radius: 24 };
  }
  if (count === 3) {
    const offsets = [
      [-18, -15],
      [18, -15],
      [0, 17],
    ];
    const [dx, dy] = offsets[indexInCell % 3];
    return { dx, dy, radius: 21 };
  }
  const offsets = [
    [-18, -18],
    [18, -18],
    [-18, 18],
    [18, 18],
    [0, 0],
  ];
  const [dx, dy] = offsets[indexInCell % offsets.length];
  return { dx, dy, radius: 19 };
};

export const LudoGame: React.FC<LudoGameProps> = ({
  onEarnPoints,
  onClose,
  seniorMode,
  onTriggerConfetti,
}) => {
  // Setup options
  const [gameMode, setGameMode] = useState<LudoGameMode>('bot');
  const [playerCount, setPlayerCount] = useState<2 | 4>(2);
  const [targetTokensToWin, setTargetTokensToWin] = useState<2 | 4>(2);
  const [savedMatch, setSavedMatch] = useState<LudoMatchState | null>(() => loadSavedLudoMatchState());

  // Active match state driven strictly by ludoEngine state machine
  const [matchState, setMatchState] = useState<LudoMatchState | null>(null);
  const [turnMessage, setTurnMessage] = useState<string>('Roll the dice!');
  const [isSoundMuted, setIsSoundMuted] = useState(() => soundService.getMuted());
  const [recentCaptureText, setRecentCaptureText] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [reconnectedNotice, setReconnectedNotice] = useState<boolean>(false);

  // Synchronous ref to avoid stale closures in dice/bot timers
  const matchRef = useRef<LudoMatchState | null>(null);
  const diceRollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const botTurnTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureAnimTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectNoticeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitMatchState = useCallback((next: LudoMatchState | null) => {
    matchRef.current = next;
    setMatchState(next);
    if (next) {
      saveLudoMatchState(next);
      if (next.winnerColor !== null || next.turnPhase === 'finished') {
        setSavedMatch(null);
      } else {
        setSavedMatch(next);
      }
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    if (diceRollTimeoutRef.current) {
      clearTimeout(diceRollTimeoutRef.current);
      diceRollTimeoutRef.current = null;
    }
    if (botTurnTimeoutRef.current) {
      clearTimeout(botTurnTimeoutRef.current);
      botTurnTimeoutRef.current = null;
    }
    if (captureAnimTimeoutRef.current) {
      clearTimeout(captureAnimTimeoutRef.current);
      captureAnimTimeoutRef.current = null;
    }
    if (reconnectNoticeTimeoutRef.current) {
      clearTimeout(reconnectNoticeTimeoutRef.current);
      reconnectNoticeTimeoutRef.current = null;
    }
  }, []);

  // Cleanup timers on unmount (saved state remains safely persisted in localStorage)
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  // Disconnection / reconnection listener — never corrupts or resets match state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOffline = () => {
      setIsOffline(true);
      setReconnectedNotice(false);
    };
    const handleOnline = () => {
      setIsOffline(false);
      setReconnectedNotice(true);
      if (reconnectNoticeTimeoutRef.current) clearTimeout(reconnectNoticeTimeoutRef.current);
      reconnectNoticeTimeoutRef.current = setTimeout(() => {
        setReconnectedNotice(false);
      }, 3200);
    };
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Mutual recursion ref for scheduling Bot rolls
  const triggerDiceRollRef = useRef<() => void>(() => {});

  // Execute a validated token move
  const executeTokenMove = useCallback(
    (tokenId: number) => {
      const current = matchRef.current;
      if (!current) return;

      const activePlayer = current.players[current.currentPlayerIdx];
      const outcome = applyTokenMove(current, tokenId);
      if (!outcome.accepted) return;

      soundService.playPieceMove();
      if (outcome.reachedHome) {
        soundService.playSuccess();
      }

      commitMatchState(outcome.state);

      if (outcome.capturedCount > 0 && activePlayer) {
        soundService.playCapture();
        const bonusPoints = 15;
        const capturedLabel = outcome.capturedColorNames.join(' & ') || 'Opponent';
        if (!activePlayer.isBot) {
          onEarnPoints(bonusPoints, `Ludo: Captured ${capturedLabel} Token 🎯`);
        }
        const msg = activePlayer.isBot
          ? seniorMode
            ? `🎯 ${activePlayer.name.split(' ')[0]} نے گوٹی کاٹ دی!`
            : `🎯 ${activePlayer.name.split(' ')[0]} captured a token!`
          : seniorMode
            ? `🎯 گوٹی کٹ گئی! زبردست! (+${bonusPoints} Pts) دوبارہ رول کریں!`
            : `🎯 Token Captured! (+${bonusPoints} Pts) Bonus Roll Awarded!`;
        setRecentCaptureText(msg);
        if (captureAnimTimeoutRef.current) clearTimeout(captureAnimTimeoutRef.current);
        captureAnimTimeoutRef.current = setTimeout(() => {
          setRecentCaptureText(null);
        }, 3200);
      }

      if (outcome.playerWon && activePlayer) {
        if (!activePlayer.isBot) {
          soundService.playDailyGoalCheer();
          onTriggerConfetti?.();
          const matchPrize = outcome.state.targetTokensToWin === 2 ? 50 : 100;
          onEarnPoints(
            matchPrize,
            `JoyLudo Champion Victory (${outcome.state.targetTokensToWin} Tokens Reached Home 👑)`
          );
        }
        return;
      }

      const nextActivePlayer = outcome.state.players[outcome.state.currentPlayerIdx];
      if (!nextActivePlayer) return;

      if (outcome.bonusTurnAwarded) {
        setTurnMessage(
          seniorMode
            ? `${COLOR_CONFIG[nextActivePlayer.color].nameUr} کو اضافی باری ملی! دوبارہ رول کریں 🎲`
            : `${nextActivePlayer.name} earned a bonus roll! Roll again 🎲`
        );
      } else {
        setTurnMessage(
          seniorMode
            ? `${COLOR_CONFIG[nextActivePlayer.color].nameUr} کی باری ہے...`
            : `${nextActivePlayer.name}'s turn...`
        );
      }

      if (nextActivePlayer.isBot) {
        if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
        botTurnTimeoutRef.current = setTimeout(() => {
          triggerDiceRollRef.current();
        }, 850);
      }
    },
    [commitMatchState, onEarnPoints, onTriggerConfetti, seniorMode]
  );

  // Trigger dice roll strictly through beginDiceRoll -> applyDiceRoll state machine
  const triggerDiceRoll = useCallback(() => {
    const current = matchRef.current;
    if (!current) return;

    const started = beginDiceRoll(current);
    if (!started.accepted) return;

    commitMatchState(started.state);
    soundService.playDiceRoll();

    if (diceRollTimeoutRef.current) clearTimeout(diceRollTimeoutRef.current);
    diceRollTimeoutRef.current = setTimeout(() => {
      diceRollTimeoutRef.current = null;
      const latest = matchRef.current;
      if (!latest || latest.turnPhase !== 'rolling' || latest.winnerColor !== null) return;

      const rolled = Math.floor(Math.random() * 6) + 1;
      const outcome = applyDiceRoll(latest, rolled);
      if (!outcome.accepted) return;

      commitMatchState(outcome.state);
      const latestPlayer = outcome.state.players[outcome.state.currentPlayerIdx];
      if (!latestPlayer) return;

      if (outcome.forfeitedByThreeSixes) {
        setTurnMessage(
          seniorMode
            ? 'تین چھکے! باری اگلے کھلاڑی کو منتقل ہو گئی'
            : '3 Sixes in a row! Turn forfeited.'
        );
        if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
        botTurnTimeoutRef.current = setTimeout(() => {
          const cur = matchRef.current;
          if (!cur || cur.turnPhase !== 'transitioning') return;
          const nextState = advanceToNextTurn(cur);
          commitMatchState(nextState);
          const nextPlayer = nextState.players[nextState.currentPlayerIdx];
          if (!nextPlayer) return;
          setTurnMessage(
            seniorMode
              ? `${COLOR_CONFIG[nextPlayer.color].nameUr} کی باری ہے...`
              : `${nextPlayer.name}'s turn...`
          );
          if (nextPlayer.isBot) {
            botTurnTimeoutRef.current = setTimeout(() => {
              triggerDiceRollRef.current();
            }, 850);
          }
        }, 950);
        return;
      }

      if (outcome.noValidMoves) {
        setTurnMessage(
          rolled === 6
            ? seniorMode
              ? 'کوئی گوٹی نہیں چلائی جا سکتی'
              : 'No movable tokens'
            : seniorMode
              ? 'کوئی گوٹی نہیں کھل سکی (چھکہ چاہیے)'
              : 'No movable tokens (Needs a 6)'
        );
        if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
        botTurnTimeoutRef.current = setTimeout(() => {
          const cur = matchRef.current;
          if (!cur || cur.turnPhase !== 'transitioning') return;
          const nextState = advanceToNextTurn(cur);
          commitMatchState(nextState);
          const nextPlayer = nextState.players[nextState.currentPlayerIdx];
          if (!nextPlayer) return;
          setTurnMessage(
            seniorMode
              ? `${COLOR_CONFIG[nextPlayer.color].nameUr} کی باری ہے...`
              : `${nextPlayer.name}'s turn...`
          );
          if (nextPlayer.isBot) {
            botTurnTimeoutRef.current = setTimeout(() => {
              triggerDiceRollRef.current();
            }, 850);
          }
        }, 1000);
        return;
      }

      if (latestPlayer.isBot) {
        const chosenId = chooseBestBotToken(outcome.state);
        if (chosenId !== null) {
          if (botTurnTimeoutRef.current) clearTimeout(botTurnTimeoutRef.current);
          botTurnTimeoutRef.current = setTimeout(() => {
            executeTokenMove(chosenId);
          }, outcome.validMoves.length === 1 ? 650 : 800);
        }
        return;
      }

      if (
        outcome.validMoves.length === 1 &&
        latestPlayer.tokens[outcome.validMoves[0]]?.step === -1
      ) {
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
    }, 520);
  }, [commitMatchState, executeTokenMove, seniorMode]);

  useEffect(() => {
    triggerDiceRollRef.current = triggerDiceRoll;
  }, [triggerDiceRoll]);

  // Start a brand-new match
  const initializeMatch = useCallback(() => {
    clearAllTimers();
    clearSavedLudoMatchState();
    const fresh = createInitialLudoMatch({
      gameMode,
      playerCount,
      targetTokensToWin,
      seniorMode,
    });
    commitMatchState(fresh);
    setRecentCaptureText(null);
    setTurnMessage(
      seniorMode ? '🔴 آپ کی باری ہے! ڈائس رول کریں' : '🔴 Your Turn! Roll the dice'
    );
  }, [clearAllTimers, commitMatchState, gameMode, playerCount, seniorMode, targetTokensToWin]);

  // Resume a saved match cleanly (and resume bot turn if it was a bot's turn)
  const handleResumeSavedMatch = useCallback(() => {
    const restored = loadSavedLudoMatchState();
    if (!restored) {
      setSavedMatch(null);
      return;
    }
    clearAllTimers();
    setGameMode(restored.gameMode);
    setPlayerCount(restored.playerCount);
    setTargetTokensToWin(restored.targetTokensToWin);
    commitMatchState(restored);
    setRecentCaptureText(null);

    const active = restored.players[restored.currentPlayerIdx];
    if (!active) return;

    if (restored.turnPhase === 'awaiting_move' && restored.diceValue !== null) {
      if (active.isBot) {
        setTurnMessage(seniorMode ? 'روبوٹ کی باری جاری ہے...' : `${active.name} resuming move...`);
        const chosenId = chooseBestBotToken(restored);
        if (chosenId !== null) {
          botTurnTimeoutRef.current = setTimeout(() => {
            executeTokenMove(chosenId);
          }, 700);
        }
      } else {
        setTurnMessage(
          seniorMode
            ? 'میچ بحال ہو گیا! ہائی لائٹ شدہ گوٹی منتخب کریں'
            : 'Match restored! Tap a highlighted token to move'
        );
      }
    } else if (active.isBot) {
      setTurnMessage(seniorMode ? 'روبوٹ کی باری جاری ہے...' : `${active.name}'s turn...`);
      botTurnTimeoutRef.current = setTimeout(() => {
        triggerDiceRollRef.current();
      }, 750);
    } else {
      setTurnMessage(
        seniorMode
          ? `${COLOR_CONFIG[active.color].nameUr} کی باری بحال ہو گئی! ڈائس رول کریں`
          : `${active.name}'s turn restored! Roll the dice`
      );
    }
  }, [clearAllTimers, commitMatchState, executeTokenMove, seniorMode]);

  const handleDiscardSavedMatch = useCallback(() => {
    clearSavedLudoMatchState();
    setSavedMatch(null);
  }, []);

  const handleBackToSetup = useCallback(() => {
    clearAllTimers();
    matchRef.current = null;
    setMatchState(null);
    setRecentCaptureText(null);
    setSavedMatch(loadSavedLudoMatchState());
  }, [clearAllTimers]);

  const handleToggleSound = () => {
    const next = !isSoundMuted;
    setIsSoundMuted(next);
    soundService.setMuted(next);
  };

  // Derived view values
  const gameStarted = matchState !== null;
  const players = matchState?.players ?? [];
  const currentPlayerIdx = matchState?.currentPlayerIdx ?? 0;
  const diceValue = matchState?.diceValue ?? null;
  const turnPhase = matchState?.turnPhase ?? 'awaiting_roll';
  const isRolling = turnPhase === 'rolling';
  const movableTokenIds = matchState?.movableTokenIds ?? [];
  const activePlayer = players[currentPlayerIdx];
  const isHumanTurn = Boolean(activePlayer && !activePlayer.isBot);
  const winner = matchState?.winnerColor
    ? players.find((p) => p.color === matchState.winnerColor) ?? null
    : null;
  const effectiveTargetTokens = matchState?.targetTokensToWin ?? targetTokensToWin;

  // Pre-compute board tokens:
  // - Yard tokens use exact YARD_TOKEN_SVG_COORDS aligned with the 4 yard circles
  // - Track/Runway tokens use 15x15 grid coordinates with clean multi-token clustering
  const renderedTokens = (() => {
    const boardItems: {
      playerIdx: number;
      token: Token;
      cx: number;
      cy: number;
      radius: number;
      isMovable: boolean;
    }[] = [];

    const cellGroups = new Map<string, { playerIdx: number; token: Token; r: number; c: number }[]>();

    players.forEach((p, pIdx) => {
      p.tokens.forEach((token) => {
        if (token.step === 56) return;

        const isMovable =
          pIdx === currentPlayerIdx &&
          turnPhase === 'awaiting_move' &&
          movableTokenIds.includes(token.id) &&
          diceValue !== null &&
          winner === null;

        if (token.step === -1) {
          const [cx, cy] = YARD_TOKEN_SVG_COORDS[token.color][token.id];
          boardItems.push({
            playerIdx: pIdx,
            token,
            cx,
            cy,
            radius: 34,
            isMovable,
          });
          return;
        }

        const coords = getTokenBoardGridCoords(token);
        if (!coords) return;
        const [r, c] = coords;
        const key = `${r},${c}`;
        const list = cellGroups.get(key) || [];
        list.push({ playerIdx: pIdx, token, r, c });
        cellGroups.set(key, list);
      });
    });

    cellGroups.forEach((group) => {
      group.forEach((item, indexInCell) => {
        const { dx, dy, radius } = getClusterLayout(group.length, indexInCell);
        const isMovable =
          item.playerIdx === currentPlayerIdx &&
          turnPhase === 'awaiting_move' &&
          movableTokenIds.includes(item.token.id) &&
          diceValue !== null &&
          winner === null;
        boardItems.push({
          playerIdx: item.playerIdx,
          token: item.token,
          cx: item.c * 100 + 50 + dx,
          cy: item.r * 100 + 50 + dy,
          radius,
          isMovable,
        });
      });
    });

    // Draw movable tokens last so they sit on top of stacked tokens for easy tapping
    boardItems.sort((a, b) => Number(a.isMovable) - Number(b.isMovable));
    return boardItems;
  })();

  const finishedTokens = players.flatMap((p) => {
    const done = p.tokens.filter((t) => t.step === 56);
    return done.map((token, idx) => {
      const [cx, cy] = HOME_FINISH_SLOTS[token.color][idx % 4];
      return { token, cx, cy };
    });
  });

  const canHumanRoll =
    isHumanTurn && turnPhase === 'awaiting_roll' && diceValue === null && winner === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border-2 border-pink-200 flex flex-col my-auto max-h-[96vh]">
        {/* Top Header */}
        <header className="bg-gradient-to-r from-rose-500 via-pink-600 to-rose-700 p-3.5 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce shrink-0"
              title="Close Ludo"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🎲</span>
                <h1 className="font-black text-base tracking-tight flex items-center gap-1 truncate">
                  JoyLudo Royal
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase shrink-0">
                    {effectiveTargetTokens === 2 ? 'Quick' : 'Classic'}
                  </span>
                </h1>
              </div>
              <p className="text-[10.5px] text-rose-100 font-medium truncate">
                {seniorMode
                  ? 'اصلی لودو • دوستوں یا روبوٹ کے ساتھ کھیلیں اور پوائنٹس جیتیں'
                  : 'Play vs Bot or Pass & Play • 100% Free & Win JoyPoints'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleSound}
              className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce text-xs"
              title={isSoundMuted ? 'Unmute' : 'Mute'}
            >
              {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            {gameStarted && (
              <>
                <button
                  type="button"
                  onClick={handleBackToSetup}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce text-xs"
                  title="Change Mode / Setup"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={initializeMatch}
                  className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white tap-bounce text-xs"
                  title="Restart Match"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </header>

        {/* Connection status notice (non-intrusive, never interrupts gameplay) */}
        {(isOffline || reconnectedNotice) && (
          <div
            className={`px-3 py-1.5 text-[11px] font-bold flex items-center justify-center gap-1.5 shrink-0 ${
              isOffline
                ? 'bg-amber-50 text-amber-800 border-b border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {seniorMode
                    ? 'آف لائن موڈ — میچ محفوظ ہے، انٹرنیٹ بحال ہونے پر پوائنٹس سنک ہوں گے'
                    : 'Offline — match saved locally, points sync automatically on reconnect'}
                </span>
              </>
            ) : (
              <span>
                {seniorMode
                  ? '✓ انٹرنیٹ بحال ہو گیا — میچ جاری ہے'
                  : '✓ Reconnected — match progress intact'}
              </span>
            )}
          </div>
        )}

        {/* SETUP SCREEN */}
        {!gameStarted ? (
          <div className="p-5 space-y-4 overflow-y-auto">
            {/* Saved Match Resume Banner */}
            {savedMatch && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3 flex items-center justify-between gap-2 shadow-xs">
                <div className="min-w-0">
                  <div className="text-xs font-black text-emerald-900">
                    {seniorMode ? 'محفوظ شدہ میچ موجود ہے' : 'Unfinished Match Saved'}
                  </div>
                  <p className="text-[10.5px] text-emerald-700 font-medium truncate">
                    {savedMatch.playerCount}P • {savedMatch.gameMode === 'bot' ? 'Vs Bot' : 'Pass & Play'} •{' '}
                    {savedMatch.targetTokensToWin === 2 ? 'Quick' : 'Classic'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleResumeSavedMatch}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs tap-bounce flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{seniorMode ? 'جاری رکھیں' : 'Resume'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscardSavedMatch}
                    className="p-1.5 rounded-xl bg-white border border-emerald-200 text-slate-500 hover:text-rose-600 tap-bounce"
                    title="Discard saved match"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

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
                  : 'Authentic rules: Cut opponent tokens, safe star squares, bonus rolls & genuine reward points!'}
              </p>
              <div className="flex items-center justify-center gap-2 sm:gap-3 mt-3 text-[11px] font-bold text-rose-700 flex-wrap">
                <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-pink-200">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> Safe Stars
                </span>
                <span className="flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-full border border-pink-200">
                  <Zap className="w-3 h-3 text-rose-500 fill-rose-500" /> Auto-Saved
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
                  <p className="text-[10px] text-slate-500 mt-0.5">Single player vs AI</p>
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
                  <p className="text-[10px] text-slate-500 mt-0.5">Play on same device</p>
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
                  <span>🔴 vs 🟡</span> 2 Players
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
              <span>{seniorMode ? 'کھیل شروع کریں (Start Ludo)' : 'Start New Ludo Match'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* ACTIVE MATCH PLAY SCREEN */
          <div className="p-2 sm:p-3 space-y-2.5 overflow-y-auto flex-1 flex flex-col justify-between">
            {/* Status & Player Banners */}
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, idx) => {
                const isCurrent = idx === currentPlayerIdx && !winner;
                const homeTokensCount = p.tokens.filter((t) => t.step === 56).length;
                const sortedIndicatorTokens = [...p.tokens]
                  .sort((a, b) => b.step - a.step)
                  .slice(0, effectiveTargetTokens);

                return (
                  <div
                    key={p.color}
                    className={`rounded-2xl p-2 border-2 transition-all flex items-center justify-between ${
                      isCurrent
                        ? `${COLOR_CONFIG[p.color].border} ${COLOR_CONFIG[p.color].lightBg} ring-2 ring-pink-300 shadow-xs`
                        : 'border-slate-200 bg-white opacity-85'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl shrink-0 ${COLOR_CONFIG[p.color].bg} text-white flex items-center justify-center text-xs font-black shadow-xs`}
                      >
                        {p.avatar}
                      </div>
                      <div className="leading-tight min-w-0">
                        <div className="text-[11px] font-extrabold text-slate-900 flex items-center gap-1 truncate">
                          <span className="truncate">{p.name.split(' ')[0]}</span>
                          {isCurrent && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                          )}
                        </div>
                        <div className="text-[9.5px] text-slate-500">
                          {homeTokensCount}/{effectiveTargetTokens} Home 🏁
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-0.5 shrink-0">
                      {sortedIndicatorTokens.map((t) => (
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
            <div className="bg-slate-900 text-white rounded-2xl py-2 px-3 text-center shadow-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-left min-w-0">
                <span className="text-base shrink-0">
                  {activePlayer ? COLOR_CONFIG[activePlayer.color].emoji : '🎲'}
                </span>
                <span className="text-xs font-black tracking-tight line-clamp-1">
                  {turnMessage}
                </span>
              </div>
              {recentCaptureText && (
                <span className="text-[10px] font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-400/30 animate-pulse shrink-0">
                  Capture!
                </span>
              )}
            </div>

            {/* 15x15 LUDO BOARD SVG CONTAINER */}
            <div className="w-full aspect-square max-w-[370px] mx-auto bg-amber-50/70 p-1 rounded-3xl border-4 border-slate-800 shadow-xl relative overflow-hidden select-none">
              <svg
                viewBox="0 0 1500 1500"
                className="w-full h-full rounded-2xl"
                style={{ touchAction: 'manipulation' }}
              >
                {/* 1. YARD BASES */}
                <rect x="0" y="0" width="600" height="600" fill="#f43f5e" />
                <rect x="100" y="100" width="400" height="400" rx="36" fill="#ffffff" />

                <rect x="900" y="0" width="600" height="600" fill="#10b981" />
                <rect x="1000" y="100" width="400" height="400" rx="36" fill="#ffffff" />

                <rect x="0" y="900" width="600" height="600" fill="#0284c7" />
                <rect x="100" y="1000" width="400" height="400" rx="36" fill="#ffffff" />

                <rect x="900" y="900" width="600" height="600" fill="#f59e0b" />
                <rect x="1000" y="1000" width="400" height="400" rx="36" fill="#ffffff" />

                {/* Yard Resting Circles (exact match to YARD_TOKEN_SVG_COORDS) */}
                {(['red', 'green', 'blue', 'yellow'] as PlayerColor[]).map((color) => {
                  const circleFill =
                    color === 'red'
                      ? '#ffe4e6'
                      : color === 'green'
                      ? '#d1fae5'
                      : color === 'blue'
                      ? '#e0f2fe'
                      : '#fef3c7';
                  return YARD_TOKEN_SVG_COORDS[color].map(([cx, cy], idx) => (
                    <circle
                      key={`yard-circle-${color}-${idx}`}
                      cx={cx}
                      cy={cy}
                      r="52"
                      fill={circleFill}
                      stroke={COLOR_CONFIG[color].hex}
                      strokeWidth="6"
                    />
                  ));
                })}

                {/* 2. 52 COMMON TRACK CELLS */}
                {TRACK_COORDS.map(([r, c], idx) => {
                  const isRedStart = idx === 1;
                  const isGreenStart = idx === 14;
                  const isYellowStart = idx === 27;
                  const isBlueStart = idx === 40;
                  const isStartCell = isRedStart || isGreenStart || isYellowStart || isBlueStart;
                  const isSafe = SAFE_INDICES.has(idx);

                  let cellFill = '#ffffff';
                  let starFill = '#f59e0b';
                  let arrowChar = '';
                  if (isRedStart) {
                    cellFill = '#f43f5e';
                    starFill = '#ffffff';
                    arrowChar = '→';
                  } else if (isGreenStart) {
                    cellFill = '#10b981';
                    starFill = '#ffffff';
                    arrowChar = '↓';
                  } else if (isYellowStart) {
                    cellFill = '#f59e0b';
                    starFill = '#ffffff';
                    arrowChar = '←';
                  } else if (isBlueStart) {
                    cellFill = '#0284c7';
                    starFill = '#ffffff';
                    arrowChar = '↑';
                  }

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
                      {isSafe && !isStartCell && (
                        <text
                          x={c * 100 + 50}
                          y={r * 100 + 66}
                          textAnchor="middle"
                          fontSize="44"
                          fill={starFill}
                          className="font-bold select-none"
                        >
                          ★
                        </text>
                      )}
                      {isStartCell && (
                        <>
                          <text
                            x={c * 100 + 50}
                            y={r * 100 + 54}
                            textAnchor="middle"
                            fontSize="36"
                            fill="#ffffff"
                            fontWeight="bold"
                            className="select-none"
                          >
                            ★
                          </text>
                          <text
                            x={c * 100 + 50}
                            y={r * 100 + 88}
                            textAnchor="middle"
                            fontSize="26"
                            fill="rgba(255,255,255,0.92)"
                            fontWeight="900"
                            className="select-none"
                          >
                            {arrowChar}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* 3. HOME RUNWAYS */}
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

                {/* 4. CENTER FINISH TRIANGLES */}
                <rect x="600" y="600" width="300" height="300" fill="#ffffff" stroke="#94a3b8" strokeWidth="3" />
                <polygon points="600,600 750,750 600,900" fill="#f43f5e" />
                <polygon points="600,600 750,750 900,600" fill="#10b981" />
                <polygon points="900,600 750,750 900,900" fill="#f59e0b" />
                <polygon points="600,900 750,750 900,900" fill="#0284c7" />
                <circle cx="750" cy="750" r="42" fill="#ffffff" stroke="#e2e8f0" strokeWidth="4" />
                <text x="750" y="763" textAnchor="middle" fontSize="34" fill="#f59e0b" className="select-none">
                  👑
                </text>

                {/* 5A. FINISHED TOKENS */}
                {finishedTokens.map(({ token, cx, cy }) => (
                  <g key={`finished-token-${token.color}-${token.id}`}>
                    <circle
                      cx={cx}
                      cy={cy}
                      r="18"
                      fill="#ffffff"
                      stroke={COLOR_CONFIG[token.color].hex}
                      strokeWidth="5"
                    />
                    <text
                      x={cx}
                      y={cy + 6}
                      textAnchor="middle"
                      fontSize="16"
                      fontWeight="900"
                      fill={COLOR_CONFIG[token.color].hex}
                      className="select-none pointer-events-none"
                    >
                      ★
                    </text>
                  </g>
                ))}

                {/* 5B. ACTIVE & YARD TOKENS */}
                {renderedTokens.map(({ token, cx, cy, radius, isMovable }) => {
                  const tokenColorHex = COLOR_CONFIG[token.color].hex;
                  const canTapToken =
                    isMovable && isHumanTurn && turnPhase === 'awaiting_move' && diceValue !== null;

                  return (
                    <g
                      key={`token-${token.color}-${token.id}`}
                      onClick={() => {
                        if (canTapToken) {
                          executeTokenMove(token.id);
                        }
                      }}
                      style={{
                        cursor: canTapToken ? 'pointer' : 'default',
                      }}
                    >
                      {canTapToken && <circle cx={cx} cy={cy} r="54" fill="transparent" />}

                      {canTapToken && (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={radius + 11}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth="7"
                          strokeDasharray="12 6"
                          className="animate-spin"
                          style={{ transformOrigin: `${cx}px ${cy}px` }}
                        />
                      )}

                      <circle cx={cx + 2} cy={cy + 3} r={radius} fill="rgba(0,0,0,0.28)" />

                      <circle
                        cx={cx}
                        cy={cy}
                        r={radius}
                        fill={tokenColorHex}
                        stroke="#ffffff"
                        strokeWidth={radius >= 28 ? 5 : 4}
                      />

                      <circle
                        cx={cx - radius * 0.2}
                        cy={cy - radius * 0.2}
                        r={radius * 0.45}
                        fill="rgba(255,255,255,0.42)"
                      />

                      <text
                        x={cx}
                        y={cy + Math.round(radius * 0.26)}
                        textAnchor="middle"
                        fontSize={Math.round(radius * 0.72)}
                        fontWeight="900"
                        fill="#ffffff"
                        className="select-none pointer-events-none"
                      >
                        {token.step === -1 ? '●' : token.id + 1}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* CONTROLS & DICE */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-10 h-10 rounded-2xl shrink-0 ${
                    activePlayer ? COLOR_CONFIG[activePlayer.color].bg : 'bg-slate-300'
                  } text-white flex items-center justify-center font-black text-sm shadow-xs`}
                >
                  {activePlayer?.avatar || '🎲'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-xs text-slate-900 leading-tight truncate">
                    {activePlayer?.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 truncate">
                    {isHumanTurn
                      ? turnPhase === 'awaiting_roll'
                        ? seniorMode
                          ? 'ڈائس رول کریں'
                          : 'Tap dice to roll'
                        : turnPhase === 'awaiting_move'
                        ? seniorMode
                          ? 'گوٹی منتخب کریں'
                          : 'Select highlighted token'
                        : seniorMode
                        ? 'باری تبدیل ہو رہی ہے...'
                        : 'Updating turn...'
                      : seniorMode
                      ? 'روبوٹ سوچ رہا ہے...'
                      : 'Bot thinking...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isHumanTurn &&
                  turnPhase === 'awaiting_move' &&
                  diceValue !== null &&
                  movableTokenIds.length === 1 &&
                  !winner && (
                    <button
                      type="button"
                      onClick={() => executeTokenMove(movableTokenIds[0])}
                      className="px-3 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs shadow-xs tap-bounce"
                    >
                      {seniorMode ? 'گوٹی چلائیں' : 'Move'}
                    </button>
                  )}

                <button
                  type="button"
                  disabled={!canHumanRoll}
                  onClick={() => triggerDiceRoll()}
                  className={`w-14 h-14 rounded-2xl bg-white border-2 flex items-center justify-center transition-all tap-bounce relative select-none shadow-md ${
                    isRolling ? 'animate-bounce border-pink-400 rotate-12 scale-105' : ''
                  } ${
                    canHumanRoll
                      ? 'border-rose-500 ring-4 ring-rose-400/40 cursor-pointer animate-pulse'
                      : 'border-slate-300 opacity-85 cursor-not-allowed'
                  }`}
                  title="Roll Dice"
                >
                  {isRolling ? (
                    <span className="text-2xl animate-spin">🎲</span>
                  ) : diceValue !== null ? (
                    <div className="w-10 h-10 grid grid-cols-3 grid-rows-3 p-1">
                      {diceValue % 2 === 1 && (
                        <div className="col-start-2 row-start-2 w-2.5 h-2.5 rounded-full bg-slate-900 mx-auto my-auto" />
                      )}
                      {diceValue >= 2 && (
                        <>
                          <div className="col-start-1 row-start-1 w-2.5 h-2.5 rounded-full bg-slate-900" />
                          <div className="col-start-3 row-start-3 w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto mt-auto" />
                        </>
                      )}
                      {diceValue >= 4 && (
                        <>
                          <div className="col-start-3 row-start-1 w-2.5 h-2.5 rounded-full bg-slate-900 ml-auto" />
                          <div className="col-start-1 row-start-3 w-2.5 h-2.5 rounded-full bg-slate-900 mt-auto" />
                        </>
                      )}
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
                      <span className="text-[8px] font-black text-rose-600 uppercase">ROLL</span>
                    </div>
                  )}

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

        {/* WINNER / MATCH END MODAL */}
        {winner && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl border-4 border-amber-300 animate-scale-up">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-900 flex items-center justify-center text-4xl mx-auto shadow-lg animate-bounce">
                {winner.isBot ? winner.avatar : '👑'}
              </div>

              <div>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-100 text-amber-800 uppercase tracking-wider">
                  {winner.isBot ? 'Match Over' : 'Victory!'}
                </span>
                <h3 className="font-black text-2xl text-slate-900 mt-2">{winner.name} Won!</h3>
                <p className="text-xs text-slate-600 mt-1">
                  {winner.isBot
                    ? seniorMode
                      ? 'اس میچ میں روبوٹ جیت گیا۔ دوبارہ کوشش کریں!'
                      : 'The Bot reached Home first this round. Play again to win the championship reward!'
                    : seniorMode
                    ? `مبارک ہو! تمام ضروری ${effectiveTargetTokens} گوٹیاں کامیابی سے گھر پہنچ گئیں 🏆`
                    : `Congratulations! First to safely bring ${effectiveTargetTokens} tokens Home!`}
                </p>
              </div>

              {!winner.isBot ? (
                <div className="bg-gradient-to-r from-pink-50 to-amber-50 rounded-2xl p-3 border border-pink-200">
                  <span className="text-xs text-slate-500 font-bold">JoyPoints Reward</span>
                  <div className="text-xl font-black text-rose-600 mt-0.5">
                    +{effectiveTargetTokens === 2 ? 50 : 100} JoyPoints 🪙
                  </div>
                  <p className="text-[10.5px] text-emerald-600 font-bold mt-0.5">
                    ✓ Automatically added to your Redeemable Balance
                  </p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                  <span className="text-xs text-slate-600 font-bold">
                    {seniorMode
                      ? 'جیت پر +50 / +100 پوائنٹس ملتے ہیں'
                      : 'Win a match to earn +50 / +100 JoyPoints!'}
                  </span>
                </div>
              )}

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
                  onClick={handleBackToSetup}
                  className="py-3 rounded-2xl bg-amber-100 hover:bg-amber-200 text-amber-950 font-extrabold text-xs shadow-xs tap-bounce"
                >
                  Change Mode
                </button>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-extrabold text-xs shadow-md tap-bounce"
              >
                Return to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
