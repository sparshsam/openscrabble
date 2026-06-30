/**
 * ProfileService — manages local user profile and player setup.
 * Stats tracking for game history, all stored in localStorage.
 */

import type { AppUser, GameRecord, PlayerSetup, PlayerStats } from '../types.js';

const STORAGE_PROFILE = 'openscrabble_profile';
const STORAGE_STATS = 'openscrabble_stats';
const STORAGE_HISTORY = 'openscrabble_game_history';
const STORAGE_PLAYERS = 'openscrabble_player_setup';

// ─── Profile ──────────────────────────────────────────

export function loadProfile(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

export function saveProfile(profile: AppUser): void {
  localStorage.setItem(STORAGE_PROFILE, JSON.stringify(profile));
}

export function clearProfile(): void {
  localStorage.removeItem(STORAGE_PROFILE);
}

export function updateProfileUsername(username: string): void {
  const profile = loadProfile();
  if (profile) {
    profile.username = username;
    profile.displayName = username;
    saveProfile(profile);
  }
}

// ─── Player Setup (local multi-player names) ──────────

export interface PlayerSetupData {
  player1Name: string;
  player2Name: string;
  player3Name?: string;
  player4Name?: string;
  playerCount: number; // 2, 3, or 4
}

export function loadPlayerSetup(): PlayerSetupData {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYERS);
    if (!raw) {
      return { player1Name: 'Player 1', player2Name: 'Player 2', playerCount: 2 };
    }
    return JSON.parse(raw) as PlayerSetupData;
  } catch {
    return { player1Name: 'Player 1', player2Name: 'Player 2', playerCount: 2 };
  }
}

export function savePlayerSetup(setup: PlayerSetupData): void {
  localStorage.setItem(STORAGE_PLAYERS, JSON.stringify(setup));
}

// ─── Stats ────────────────────────────────────────────

export function loadStats(): PlayerStats {
  try {
    const raw = localStorage.getItem(STORAGE_STATS);
    if (!raw) return getDefaultStats();
    return JSON.parse(raw) as PlayerStats;
  } catch {
    return getDefaultStats();
  }
}

function getDefaultStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
    totalScore: 0,
    highestScore: 0,
    averageScore: 0,
    bestWord: null,
    bestWordScore: 0,
    totalMoves: 0,
    bingos: 0,
    lastPlayedDate: null,
  };
}

export function saveStats(stats: PlayerStats): void {
  localStorage.setItem(STORAGE_STATS, JSON.stringify(stats));
}

export function updateStatsAfterGame(
  won: boolean,
  score: number,
  bestWord: string | null,
  bestWordScore: number,
  moves: number,
  bingos: number
): void {
  const stats = loadStats();
  stats.gamesPlayed += 1;
  if (won) stats.gamesWon += 1;
  stats.totalScore += score;
  if (score > stats.highestScore) stats.highestScore = score;
  if (bestWord && bestWordScore > stats.bestWordScore) {
    stats.bestWord = bestWord;
    stats.bestWordScore = bestWordScore;
  }
  stats.totalMoves += moves;
  stats.bingos += bingos;
  saveStats(stats);
}

// ─── Game History ─────────────────────────────────────

export function loadGameHistory(): GameRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as GameRecord[];
  } catch {
    return [];
  }
}

export function addGameRecord(record: GameRecord): void {
  const history = loadGameHistory();
  history.unshift(record);
  // Keep last 50 games
  if (history.length > 50) history.length = 50;
  localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
}

export function clearGameHistory(): void {
  localStorage.removeItem(STORAGE_HISTORY);
}
