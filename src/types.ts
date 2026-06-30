/** A single letter tile */
export interface Tile {
  letter: string;
  points: number;
  id: string; // unique identifier for tracking
  isBlank?: boolean;
  playedAs?: string; // the letter a blank was played as
}

/** Board position */
export interface Position {
  row: number;
  col: number;
}

/** A tile placed on the board */
export interface PlacedTile extends Tile, Position {}

export type Direction = 'across' | 'down';

/** Premium square types */
export type PremiumType = 'tw' | 'dw' | 'tl' | 'dl' | null;

/** Game phase */
export type GamePhase =
  | 'placing'   // player is placing tiles
  | 'submitting' // word is being validated
  | 'swap'      // player is selecting tiles to swap
  | 'gameover';

/** A word formed on the board with its score */
export interface WordResult {
  tiles: PlacedTile[];
  score: number;
  word: string;
}

/** Detailed record of a completed move */
export interface MoveRecord {
  turnNumber: number;
  playerIndex: number;
  playerName: string;
  words: WordResult[];
  totalScore: number;
  cumulativeScore: number;
  moveDescription: string; // e.g., "TRADE + CROSS → 24 pts"
}

/** Post-game statistics */
export interface GameSummary {
  winner: Player | null;
  isTie: boolean;
  totalTurns: number;
  moveHistory: MoveRecord[];
  bestWord: { word: string; score: number } | null;
  finalScores: [number, number];
}

/** Turn action */
export type TurnAction =
  | { type: 'place'; tiles: PlacedTile[] }
  | { type: 'pass' }
  | { type: 'swap'; tiles: string[] }; // tile ids

/** Player state */
export interface Player {
  name: string;
  score: number;
  rack: (Tile | null)[];
  isActive: boolean;
}

/** App user — guest or signed-in */
export interface AppUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  isGuest: boolean;
}

/** Player setup for a multi-player local game */
export interface PlayerSetup {
  playerName: string;
  isHuman: boolean;
  profileId?: string;
}

// ─── v0.4.1: Local Game Record ──────────────────────

export type GameRecordStatus = 'active' | 'completed' | 'abandoned';

/** A game record stored locally in the game store */
export interface GameRecord {
  id: string;
  status: GameRecordStatus;
  createdDate: string;  // ISO
  lastPlayedDate: string; // ISO
  completedDate?: string; // ISO
  players: string[];
  scores: number[];
  winner: string | null;
  isTie: boolean;
  totalTurns: number;
  bestWord: string | null;
  bestWordScore: number;
  totalMoves: number;
  bingos: number;
  /** Linked save game key (openscrabble_save_<id>) for active games */
  saveKey?: string;
}

/** Per-player aggregated stats computed from game history */
export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number; // 0-100, 0 when no games played
  totalScore: number;
  highestScore: number;
  averageScore: number;
  bestWord: string | null;
  bestWordScore: number;
  totalMoves: number;
  bingos: number;
  lastPlayedDate: string | null;
}

/** Full game state snapshot */
export interface GameState {
  board: (Tile | null)[][];
  players: [Player, Player];
  currentPlayerIndex: number;
  bag: string[]; // remaining tile ids in bag
  phase: GamePhase;
  turnNumber: number;
  consecutivePasses: number;
  moveHistory: TurnAction[];
  swapMode: boolean;
}
