/**
 * LocalGameStore — localStorage-based game record system for v0.4.1.
 *
 * Stores completed and active game metadata separately from the live
 * game state save (openscrabble_save), which remains untouched.
 *
 * Keys:
 *   openscrabble_game_store  — array of GameRecord
 *   openscrabble_save        — live game state (unchanged, v0.3/v0.4 compatible)
 *   openscrabble_save_<id>   — per-game save snapshots (future)
 */

import type { GameRecord, GameRecordStatus, PlayerStats } from '../types.js';

const STORE_KEY = 'openscrabble_game_store';

// ─── CRUD ─────────────────────────────────────────────

export function loadAllGames(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as GameRecord[];
    return parsed.sort((a, b) =>
      new Date(b.lastPlayedDate).getTime() - new Date(a.lastPlayedDate).getTime()
    );
  } catch {
    return [];
  }
}

export function saveAllGames(games: GameRecord[]): void {
  localStorage.setItem(STORE_KEY, JSON.stringify(games));
}

export function getGameById(id: string): GameRecord | undefined {
  return loadAllGames().find((g) => g.id === id);
}

export function addGameRecord(game: GameRecord): void {
  const games = loadAllGames();
  // Replace if exists
  const idx = games.findIndex((g) => g.id === game.id);
  if (idx >= 0) {
    games[idx] = game;
  } else {
    games.unshift(game);
  }
  // Keep max 100 records
  if (games.length > 100) games.length = 100;
  saveAllGames(games);
}

export function updateGameRecord(
  id: string,
  updates: Partial<GameRecord>
): void {
  const games = loadAllGames();
  const idx = games.findIndex((g) => g.id === id);
  if (idx >= 0) {
    const current = games[idx]!;
    games[idx] = {
      id: current.id,
      status: current.status,
      createdDate: current.createdDate,
      lastPlayedDate: current.lastPlayedDate,
      completedDate: current.completedDate,
      players: current.players,
      scores: current.scores,
      winner: current.winner,
      isTie: current.isTie,
      totalTurns: current.totalTurns,
      bestWord: current.bestWord,
      bestWordScore: current.bestWordScore,
      totalMoves: current.totalMoves,
      bingos: current.bingos,
      saveKey: current.saveKey,
      ...updates,
    } satisfies GameRecord;
    saveAllGames(games);
  }
}

export function removeGameRecord(id: string): void {
  const games = loadAllGames().filter((g) => g.id !== id);
  saveAllGames(games);
}

export function clearAllGameRecords(): void {
  localStorage.removeItem(STORE_KEY);
}

// ─── Queries ──────────────────────────────────────────

export function getActiveGames(): GameRecord[] {
  return loadAllGames().filter((g) => g.status === 'active');
}

export function getCompletedGames(): GameRecord[] {
  return loadAllGames().filter((g) => g.status === 'completed');
}

export function hasActiveGame(): boolean {
  return getActiveGames().length > 0;
}

/**
 * Generate a unique game ID.
 */
export function generateGameId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `game_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Create a new active game record.
 */
export function createActiveGameRecord(
  players: string[],
  gameId?: string
): GameRecord {
  const id = gameId || generateGameId();
  const now = new Date().toISOString();
  const record: GameRecord = {
    id,
    status: 'active',
    createdDate: now,
    lastPlayedDate: now,
    players,
    scores: players.map(() => 0),
    winner: null,
    isTie: false,
    totalTurns: 0,
    bestWord: null,
    bestWordScore: 0,
    totalMoves: 0,
    bingos: 0,
  };
  addGameRecord(record);
  return record;
}

/**
 * Complete or abandon a game record with final stats.
 */
export function completeGameRecord(
  id: string,
  status: 'completed' | 'abandoned',
  scores: number[],
  winner: string | null,
  isTie: boolean,
  totalTurns: number,
  bestWord: string | null,
  bestWordScore: number,
  totalMoves: number,
  bingos: number
): void {
  updateGameRecord(id, {
    status,
    scores,
    winner,
    isTie,
    totalTurns,
    bestWord,
    bestWordScore,
    totalMoves,
    bingos,
    completedDate: new Date().toISOString(),
    lastPlayedDate: new Date().toISOString(),
  });
}

/**
 * Update the last-played timestamp and current scores for an active game.
 */
export function touchActiveGame(
  id: string,
  scores: number[],
  turnNumber: number
): void {
  updateGameRecord(id, {
    lastPlayedDate: new Date().toISOString(),
    scores,
    totalTurns: turnNumber,
  });
}

// ─── Stats ────────────────────────────────────────────

export function computeStats(): PlayerStats {
  const games = loadAllGames();
  const completed = games.filter((g) => g.status === 'completed');

  const stats: PlayerStats = {
    gamesPlayed: completed.length,
    gamesWon: 0,
    totalScore: 0,
    highestScore: 0,
    averageScore: 0,
    bestWord: null,
    bestWordScore: 0,
    totalMoves: 0,
    bingos: 0,
    lastPlayedDate: games.length > 0 ? games[0]!.lastPlayedDate : null,
  };

  if (completed.length === 0) return stats;

  for (const game of completed) {
    const playerScore = Math.max(...game.scores);
    stats.totalScore += playerScore;
    if (playerScore > stats.highestScore) stats.highestScore = playerScore;
    stats.totalMoves += game.totalMoves;
    stats.bingos += game.bingos;
    if (game.bestWord && game.bestWordScore > stats.bestWordScore) {
      stats.bestWord = game.bestWord;
      stats.bestWordScore = game.bestWordScore;
    }
    // Determine if the current user won
    // For simplicity, we check if winner is set and not a tie
    if (!game.isTie && game.winner) {
      stats.gamesWon += 1;
    }
  }

  stats.averageScore = Math.round(stats.totalScore / completed.length);
  return stats;
}
