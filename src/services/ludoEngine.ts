export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';
export type LudoGameMode = 'bot' | 'pass_play';
export type LudoTurnPhase =
  | 'awaiting_roll'
  | 'rolling'
  | 'awaiting_move'
  | 'transitioning'
  | 'finished';

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

export interface LudoMatchState {
  version: 2;
  gameMode: LudoGameMode;
  playerCount: 2 | 4;
  targetTokensToWin: 2 | 4;
  players: PlayerInfo[];
  currentPlayerIdx: number;
  diceValue: number | null;
  turnPhase: LudoTurnPhase;
  movableTokenIds: number[];
  consecutiveSixes: number;
  winnerColor: PlayerColor | null;
  turnCount: number;
  updatedAt: number;
}

export interface DiceRollOutcome {
  accepted: boolean;
  state: LudoMatchState;
  forfeitedByThreeSixes: boolean;
  noValidMoves: boolean;
  validMoves: number[];
}

export interface TokenMoveOutcome {
  accepted: boolean;
  state: LudoMatchState;
  capturedCount: number;
  capturedColorNames: string[];
  reachedHome: boolean;
  playerWon: boolean;
  bonusTurnAwarded: boolean;
}

// 52 common path track coordinates (row, col) in a 15x15 grid (0-indexed)
export const TRACK_COORDS: [number, number][] = [
  [6, 0],   // 0
  [6, 1],   // 1  - RED START (Safe)
  [6, 2],   // 2
  [6, 3],   // 3
  [6, 4],   // 4
  [6, 5],   // 5
  [5, 6],   // 6
  [4, 6],   // 7
  [3, 6],   // 8
  [2, 6],   // 9  - SAFE
  [1, 6],   // 10
  [0, 6],   // 11
  [0, 7],   // 12
  [0, 8],   // 13
  [1, 8],   // 14 - GREEN START (Safe)
  [2, 8],   // 15
  [3, 8],   // 16
  [4, 8],   // 17
  [5, 8],   // 18
  [6, 9],   // 19
  [6, 10],  // 20
  [6, 11],  // 21
  [6, 12],  // 22 - SAFE
  [6, 13],  // 23
  [6, 14],  // 24
  [7, 14],  // 25
  [8, 14],  // 26
  [8, 13],  // 27 - YELLOW START (Safe)
  [8, 12],  // 28
  [8, 11],  // 29
  [8, 10],  // 30
  [8, 9],   // 31
  [9, 8],   // 32
  [10, 8],  // 33
  [11, 8],  // 34
  [12, 8],  // 35 - SAFE
  [13, 8],  // 36
  [14, 8],  // 37
  [14, 7],  // 38
  [14, 6],  // 39
  [13, 6],  // 40 - BLUE START (Safe)
  [12, 6],  // 41
  [11, 6],  // 42
  [10, 6],  // 43
  [9, 6],   // 44
  [8, 5],   // 45
  [8, 4],   // 46
  [8, 3],   // 47
  [8, 2],   // 48 - SAFE
  [8, 1],   // 49
  [8, 0],   // 50
  [7, 0],   // 51 - Red entry into Home Runway
];

export const SAFE_INDICES = new Set([1, 9, 14, 22, 27, 35, 40, 48]);

export const START_INDICES: Record<PlayerColor, number> = {
  red: 1,
  green: 14,
  yellow: 27,
  blue: 40,
};

export const HOME_RUNWAYS: Record<PlayerColor, [number, number][]> = {
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

// Exact SVG coordinates (1500x1500 viewBox) aligned to the 4 yard resting circles of each color
export const YARD_TOKEN_SVG_COORDS: Record<PlayerColor, [number, number][]> = {
  red: [
    [200, 200],
    [400, 200],
    [200, 400],
    [400, 400],
  ],
  green: [
    [1100, 200],
    [1300, 200],
    [1100, 400],
    [1300, 400],
  ],
  yellow: [
    [1100, 1100],
    [1300, 1100],
    [1100, 1300],
    [1300, 1300],
  ],
  blue: [
    [200, 1100],
    [400, 1100],
    [200, 1300],
    [400, 1300],
  ],
};

// Finished token slots inside each color's center triangle (SVG 1500x1500 coordinates)
export const HOME_FINISH_SLOTS: Record<PlayerColor, [number, number][]> = {
  red: [
    [638, 700],
    [638, 800],
    [674, 730],
    [674, 770],
  ],
  green: [
    [700, 638],
    [800, 638],
    [730, 674],
    [770, 674],
  ],
  yellow: [
    [862, 700],
    [862, 800],
    [826, 730],
    [826, 770],
  ],
  blue: [
    [700, 862],
    [800, 862],
    [730, 826],
    [770, 826],
  ],
};

export const COLOR_LABELS_EN: Record<PlayerColor, string> = {
  red: 'Red',
  green: 'Green',
  yellow: 'Yellow',
  blue: 'Blue',
};

const LUDO_STORAGE_KEY = 'joyearn_ludo_saved_match_v2';

export function createInitialLudoMatch(params: {
  gameMode: LudoGameMode;
  playerCount: 2 | 4;
  targetTokensToWin: 2 | 4;
  seniorMode: boolean;
}): LudoMatchState {
  const { gameMode, playerCount, targetTokensToWin, seniorMode } = params;
  const activeColors: PlayerColor[] =
    playerCount === 2 ? ['red', 'yellow'] : ['red', 'green', 'yellow', 'blue'];

  const players: PlayerInfo[] = activeColors.map((color, idx) => {
    const isHuman = gameMode === 'pass_play' || idx === 0;
    let name = '';
    let avatar = '👤';

    if (idx === 0) {
      name = seniorMode ? 'آپ (Red)' : 'You (Red)';
      avatar = '👑';
    } else if (isHuman) {
      name = `Player ${idx + 1} (${COLOR_LABELS_EN[color]})`;
      avatar = '👥';
    } else {
      const botNames = ['Panda Bot 🐼', 'Bunny Bot 🐰', 'Tiger Bot 🐯'];
      name = botNames[idx - 1] || `Bot ${idx}`;
      avatar = idx === 1 ? '🐼' : idx === 2 ? '🐰' : '🐯';
    }

    const tokens: Token[] = [0, 1, 2, 3].map((id) => ({
      id,
      color,
      step: -1,
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

  return {
    version: 2,
    gameMode,
    playerCount,
    targetTokensToWin,
    players,
    currentPlayerIdx: 0,
    diceValue: null,
    turnPhase: 'awaiting_roll',
    movableTokenIds: [],
    consecutiveSixes: 0,
    winnerColor: null,
    turnCount: 0,
    updatedAt: Date.now(),
  };
}

export function getTokenBoardGridCoords(token: Token): [number, number] | null {
  if (token.step === -1 || token.step === 56) {
    return null;
  }
  if (token.step >= 0 && token.step <= 50) {
    const globalIdx = (START_INDICES[token.color] + token.step) % 52;
    return TRACK_COORDS[globalIdx];
  }
  if (token.step >= 51 && token.step <= 55) {
    return HOME_RUNWAYS[token.color][token.step - 51];
  }
  return null;
}

export function canMoveToken(token: Token, dice: number): boolean {
  if (!Number.isInteger(dice) || dice < 1 || dice > 6) return false;
  if (token.step === 56) return false;
  if (token.step === -1) return dice === 6;
  return token.step + dice <= 56;
}

export function getMovableTokens(player: PlayerInfo, dice: number): number[] {
  return player.tokens.filter((t) => canMoveToken(t, dice)).map((t) => t.id);
}

/**
 * Transitions from awaiting_roll -> rolling. Prevents duplicate dice rolls.
 */
export function beginDiceRoll(state: LudoMatchState): { accepted: boolean; state: LudoMatchState } {
  if (state.turnPhase !== 'awaiting_roll' || state.winnerColor !== null) {
    return { accepted: false, state };
  }
  if (!state.players[state.currentPlayerIdx]) {
    return { accepted: false, state };
  }
  return {
    accepted: true,
    state: {
      ...state,
      turnPhase: 'rolling',
      movableTokenIds: [],
      updatedAt: Date.now(),
    },
  };
}

/**
 * Resolves a rolled dice value strictly from the 'rolling' phase.
 */
export function applyDiceRoll(state: LudoMatchState, rolledValue: number): DiceRollOutcome {
  if (
    state.turnPhase !== 'rolling' ||
    state.winnerColor !== null ||
    !Number.isInteger(rolledValue) ||
    rolledValue < 1 ||
    rolledValue > 6
  ) {
    return {
      accepted: false,
      state,
      forfeitedByThreeSixes: false,
      noValidMoves: false,
      validMoves: [],
    };
  }

  const activePlayer = state.players[state.currentPlayerIdx];
  if (!activePlayer) {
    return {
      accepted: false,
      state,
      forfeitedByThreeSixes: false,
      noValidMoves: false,
      validMoves: [],
    };
  }

  // Standard Ludo 3 consecutive sixes rule: forfeit turn
  if (rolledValue === 6 && state.consecutiveSixes >= 2) {
    return {
      accepted: true,
      forfeitedByThreeSixes: true,
      noValidMoves: false,
      validMoves: [],
      state: {
        ...state,
        diceValue: 6,
        consecutiveSixes: 0,
        movableTokenIds: [],
        turnPhase: 'transitioning',
        updatedAt: Date.now(),
      },
    };
  }

  const nextSixes = rolledValue === 6 ? state.consecutiveSixes + 1 : 0;
  const validMoves = getMovableTokens(activePlayer, rolledValue);

  if (validMoves.length === 0) {
    return {
      accepted: true,
      forfeitedByThreeSixes: false,
      noValidMoves: true,
      validMoves: [],
      state: {
        ...state,
        diceValue: rolledValue,
        consecutiveSixes: 0,
        movableTokenIds: [],
        turnPhase: 'transitioning',
        updatedAt: Date.now(),
      },
    };
  }

  return {
    accepted: true,
    forfeitedByThreeSixes: false,
    noValidMoves: false,
    validMoves,
    state: {
      ...state,
      diceValue: rolledValue,
      consecutiveSixes: nextSixes,
      movableTokenIds: validMoves,
      turnPhase: 'awaiting_move',
      updatedAt: Date.now(),
    },
  };
}

/**
 * Advances to the next player's turn after a 3-six forfeit or 0-valid-moves roll.
 */
export function advanceToNextTurn(state: LudoMatchState): LudoMatchState {
  if (state.winnerColor !== null || state.players.length === 0) {
    return state;
  }
  const nextIdx = (state.currentPlayerIdx + 1) % state.players.length;
  return {
    ...state,
    currentPlayerIdx: nextIdx,
    diceValue: null,
    movableTokenIds: [],
    consecutiveSixes: 0,
    turnPhase: 'awaiting_roll',
    turnCount: state.turnCount + 1,
    updatedAt: Date.now(),
  };
}

/**
 * Executes a validated token move strictly from the 'awaiting_move' phase.
 * Prevents duplicate moves, illegal moves, or moving another player's tokens.
 */
export function applyTokenMove(state: LudoMatchState, tokenId: number): TokenMoveOutcome {
  const rejected: TokenMoveOutcome = {
    accepted: false,
    state,
    capturedCount: 0,
    capturedColorNames: [],
    reachedHome: false,
    playerWon: false,
    bonusTurnAwarded: false,
  };

  if (state.turnPhase !== 'awaiting_move' || state.diceValue === null || state.winnerColor !== null) {
    return rejected;
  }

  const pIdx = state.currentPlayerIdx;
  const activePlayer = state.players[pIdx];
  if (!activePlayer) return rejected;

  if (!state.movableTokenIds.includes(tokenId)) {
    return rejected;
  }

  const targetToken = activePlayer.tokens.find((t) => t.id === tokenId);
  if (!targetToken || !canMoveToken(targetToken, state.diceValue)) {
    return rejected;
  }

  const rolledDice = state.diceValue;
  const updatedActiveTokens = activePlayer.tokens.map((t) => {
    if (t.id !== tokenId) return t;
    if (t.step === -1) return { ...t, step: 0 };
    return { ...t, step: t.step + rolledDice };
  });

  const movedToken = updatedActiveTokens.find((t) => t.id === tokenId)!;
  const reachedHome = movedToken.step === 56;

  let capturedCount = 0;
  const capturedColorNames: string[] = [];
  let targetGlobalIdx = -1;
  let isSafeSquare = false;

  if (movedToken.step >= 0 && movedToken.step <= 50) {
    targetGlobalIdx = (START_INDICES[movedToken.color] + movedToken.step) % 52;
    isSafeSquare = SAFE_INDICES.has(targetGlobalIdx);
  }

  const updatedPlayers: PlayerInfo[] = state.players.map((p, idx) => {
    if (idx === pIdx) {
      const finishedCount = updatedActiveTokens.filter((t) => t.step === 56).length;
      return {
        ...p,
        tokens: updatedActiveTokens,
        hasWon: finishedCount >= state.targetTokensToWin,
      };
    }

    if (targetGlobalIdx !== -1 && !isSafeSquare) {
      const nextTokens = p.tokens.map((otherToken) => {
        if (otherToken.step >= 0 && otherToken.step <= 50) {
          const otherGlobalIdx = (START_INDICES[otherToken.color] + otherToken.step) % 52;
          if (otherGlobalIdx === targetGlobalIdx) {
            capturedCount += 1;
            const colorName = COLOR_LABELS_EN[otherToken.color];
            if (!capturedColorNames.includes(colorName)) {
              capturedColorNames.push(colorName);
            }
            return { ...otherToken, step: -1 };
          }
        }
        return otherToken;
      });
      return { ...p, tokens: nextTokens };
    }

    return p;
  });

  const updatedActivePlayer = updatedPlayers[pIdx];
  const playerWon = updatedActivePlayer.hasWon;

  if (playerWon) {
    return {
      accepted: true,
      capturedCount,
      capturedColorNames,
      reachedHome,
      playerWon: true,
      bonusTurnAwarded: false,
      state: {
        ...state,
        players: updatedPlayers,
        diceValue: null,
        movableTokenIds: [],
        turnPhase: 'finished',
        winnerColor: updatedActivePlayer.color,
        turnCount: state.turnCount + 1,
        updatedAt: Date.now(),
      },
    };
  }

  const bonusTurnAwarded = rolledDice === 6 || capturedCount > 0 || reachedHome;
  const nextPlayerIdx = bonusTurnAwarded ? pIdx : (pIdx + 1) % updatedPlayers.length;

  return {
    accepted: true,
    capturedCount,
    capturedColorNames,
    reachedHome,
    playerWon: false,
    bonusTurnAwarded,
    state: {
      ...state,
      players: updatedPlayers,
      currentPlayerIdx: nextPlayerIdx,
      diceValue: null,
      movableTokenIds: [],
      consecutiveSixes: bonusTurnAwarded ? state.consecutiveSixes : 0,
      turnPhase: 'awaiting_roll',
      turnCount: state.turnCount + 1,
      updatedAt: Date.now(),
    },
  };
}

/**
 * Deterministic Smart Bot heuristic for selecting the best legal token to move.
 */
export function chooseBestBotToken(state: LudoMatchState): number | null {
  if (state.turnPhase !== 'awaiting_move' || state.diceValue === null) return null;
  const activePlayer = state.players[state.currentPlayerIdx];
  if (!activePlayer || state.movableTokenIds.length === 0) return null;
  if (state.movableTokenIds.length === 1) return state.movableTokenIds[0];

  const rolled = state.diceValue;
  let bestTokenId = state.movableTokenIds[0];
  let bestScore = -9999;

  for (const tId of state.movableTokenIds) {
    const token = activePlayer.tokens.find((t) => t.id === tId);
    if (!token) continue;
    let score = 0;

    // Priority 1: Capturing an opponent (+1000)
    if (token.step >= 0 && token.step + rolled <= 50) {
      const targetGlobalIdx = (START_INDICES[token.color] + token.step + rolled) % 52;
      if (!SAFE_INDICES.has(targetGlobalIdx)) {
        state.players.forEach((otherP, oIdx) => {
          if (oIdx === state.currentPlayerIdx) return;
          otherP.tokens.forEach((otherT) => {
            if (otherT.step >= 0 && otherT.step <= 50) {
              const oGlobal = (START_INDICES[otherT.color] + otherT.step) % 52;
              if (oGlobal === targetGlobalIdx) {
                score += 1000;
              }
            }
          });
        });
      }
    }

    // Priority 2: Reaching Home (+500)
    if (token.step + rolled === 56) score += 500;

    // Priority 3: Opening from yard on a 6 (+400)
    if (token.step === -1 && rolled === 6) score += 400;

    // Priority 4: Entering safe home runway (+300)
    if (token.step <= 50 && token.step + rolled >= 51 && token.step + rolled < 56) score += 300;

    // Priority 5: Landing on a safe star square (+250)
    if (token.step >= 0 && token.step + rolled <= 50) {
      const targetGlobal = (START_INDICES[token.color] + token.step + rolled) % 52;
      if (SAFE_INDICES.has(targetGlobal)) score += 250;
    }

    // Priority 6: Advancing furthest token (+100 + step)
    score += 100 + token.step;

    if (score > bestScore) {
      bestScore = score;
      bestTokenId = tId;
    }
  }

  return bestTokenId;
}

/**
 * Validates and normalizes a persisted match state so corrupted data or interrupted
 * timers (e.g. app closed mid-roll) never corrupt or stall a restored match.
 */
export function validateAndNormalizeMatchState(raw: unknown): LudoMatchState | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<LudoMatchState>;

  if (candidate.version !== 2) return null;
  if (candidate.gameMode !== 'bot' && candidate.gameMode !== 'pass_play') return null;
  if (candidate.playerCount !== 2 && candidate.playerCount !== 4) return null;
  if (candidate.targetTokensToWin !== 2 && candidate.targetTokensToWin !== 4) return null;
  if (!Array.isArray(candidate.players) || candidate.players.length !== candidate.playerCount) {
    return null;
  }

  const validColors = new Set<PlayerColor>(['red', 'green', 'yellow', 'blue']);
  for (const p of candidate.players) {
    if (!p || !validColors.has(p.color) || !Array.isArray(p.tokens) || p.tokens.length !== 4) {
      return null;
    }
    for (const t of p.tokens) {
      if (
        !t ||
        !Number.isInteger(t.id) ||
        t.id < 0 ||
        t.id > 3 ||
        t.color !== p.color ||
        !Number.isInteger(t.step) ||
        t.step < -1 ||
        t.step > 56
      ) {
        return null;
      }
    }
  }

  const pIdx =
    typeof candidate.currentPlayerIdx === 'number' &&
    candidate.currentPlayerIdx >= 0 &&
    candidate.currentPlayerIdx < candidate.players.length
      ? candidate.currentPlayerIdx
      : 0;

  // Do not restore already-finished matches
  if (candidate.winnerColor !== null && candidate.winnerColor !== undefined) {
    return null;
  }

  // If the app closed mid-roll or mid-transition, normalize safely to awaiting_roll
  let turnPhase: LudoTurnPhase = candidate.turnPhase || 'awaiting_roll';
  let diceValue: number | null =
    typeof candidate.diceValue === 'number' &&
    Number.isInteger(candidate.diceValue) &&
    candidate.diceValue >= 1 &&
    candidate.diceValue <= 6
      ? candidate.diceValue
      : null;
  let movableTokenIds: number[] = [];

  if (turnPhase === 'awaiting_move' && diceValue !== null) {
    movableTokenIds = getMovableTokens(candidate.players[pIdx], diceValue);
    if (movableTokenIds.length === 0) {
      turnPhase = 'awaiting_roll';
      diceValue = null;
    }
  } else {
    turnPhase = 'awaiting_roll';
    diceValue = null;
  }

  return {
    version: 2,
    gameMode: candidate.gameMode,
    playerCount: candidate.playerCount,
    targetTokensToWin: candidate.targetTokensToWin,
    players: candidate.players,
    currentPlayerIdx: pIdx,
    diceValue,
    turnPhase,
    movableTokenIds,
    consecutiveSixes:
      typeof candidate.consecutiveSixes === 'number' &&
      candidate.consecutiveSixes >= 0 &&
      candidate.consecutiveSixes <= 2
        ? candidate.consecutiveSixes
        : 0,
    winnerColor: null,
    turnCount: typeof candidate.turnCount === 'number' && candidate.turnCount >= 0 ? candidate.turnCount : 0,
    updatedAt: typeof candidate.updatedAt === 'number' ? candidate.updatedAt : Date.now(),
  };
}

export function saveLudoMatchState(state: LudoMatchState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (state.winnerColor !== null || state.turnPhase === 'finished') {
      localStorage.removeItem(LUDO_STORAGE_KEY);
      return;
    }
    localStorage.setItem(LUDO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage quota or restricted mode — keep gameplay uninterrupted
  }
}

export function loadSavedLudoMatchState(): LudoMatchState | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LUDO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const validated = validateAndNormalizeMatchState(parsed);
    if (!validated) {
      localStorage.removeItem(LUDO_STORAGE_KEY);
      return null;
    }
    return validated;
  } catch {
    return null;
  }
}

export function clearSavedLudoMatchState(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LUDO_STORAGE_KEY);
  } catch {
    // ignore
  }
}
