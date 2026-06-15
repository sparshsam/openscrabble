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
