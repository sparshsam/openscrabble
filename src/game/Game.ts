import type { Tile, PlacedTile, Player, GameState, GamePhase, TurnAction, WordResult } from '../types.js';
import { Board, CENTER, getPremiumType } from './Board.js';
import { Bag } from './Bag.js';
import { ScoreCalculator } from './ScoreCalculator.js';

const RACK_SIZE = 7;

/**
 * Core game engine for OpenScrabble.
 * Manages turns, tile placement, scoring, and game state.
 */
export class Game {
  readonly board: Board;
  readonly bag: Bag;
  players: [Player, Player];
  currentPlayerIndex: number = 0;
  phase: GamePhase = 'placing';
  turnNumber: number = 1;
  consecutivePasses: number = 0;
  moveHistory: TurnAction[] = [];
  swapMode: boolean = false;
  private pendingTiles: Map<string, PlacedTile> = new Map(); // tileId -> placement

  constructor(player1Name: string = 'Player 1', player2Name: string = 'Player 2') {
    this.board = new Board();
    this.bag = new Bag();

    const rack1 = this.fillRack([]);
    const rack2 = this.fillRack([]);

    this.players = [
      { name: player1Name, score: 0, rack: rack1, isActive: true },
      { name: player2Name, score: 0, rack: rack2, isActive: false },
    ];
  }

  /** Get the current active player */
  get currentPlayer(): Player {
    return this.players[this.currentPlayerIndex]!;
  }

  /** Get the opponent player */
  get opponentPlayer(): Player {
    return this.players[1 - this.currentPlayerIndex]!;
  }

  /** Fill a rack to RACK_SIZE from the bag */
  private fillRack(rack: (Tile | null)[]): (Tile | null)[] {
    const result = [...rack];
    // Ensure result has exactly RACK_SIZE slots
    while (result.length < RACK_SIZE) {
      result.push(null);
    }
    const emptySlots = result.filter((t) => t === null).length;
    if (emptySlots <= 0) return result;

    const drawn = this.bag.draw(emptySlots);
    let drawIdx = 0;
    for (let i = 0; i < result.length && drawIdx < drawn.length; i++) {
      if (result[i] === null) {
        result[i] = drawn[drawIdx++]!;
      }
    }
    return result;
  }

  /** Place a tile from the rack onto the board (pending) */
  placeTile(tileId: string, row: number, col: number): boolean {
    if (this.phase !== 'placing') return false;
    if (this.board.isOccupied(row, col)) return false;
    if (!this.board.isInBounds(row, col)) return false;

    // Check if tile is already pending elsewhere - remove it first
    if (this.pendingTiles.has(tileId)) {
      const existing = this.pendingTiles.get(tileId)!;
      this.board.removeTile(existing.row, existing.col);
      this.pendingTiles.delete(tileId);
    }

    const rackTile = this.currentPlayer.rack.find((t) => t?.id === tileId);
    if (!rackTile) return false;

    this.board.placeTile({ ...rackTile }, row, col);
    this.pendingTiles.set(tileId, { ...rackTile, row, col });
    return true;
  }

  /** Remove a pending tile from the board back to the rack */
  removeTile(row: number, col: number): boolean {
    if (this.phase !== 'placing') return false;

    for (const [tileId, placed] of this.pendingTiles) {
      if (placed.row === row && placed.col === col) {
        this.board.removeTile(row, col);
        this.pendingTiles.delete(tileId);
        return true;
      }
    }
    return false;
  }

  /** Move a pending tile to a new position */
  movePendingTile(tileId: string, newRow: number, newCol: number): boolean {
    if (this.phase !== 'placing') return false;
    const existing = this.pendingTiles.get(tileId);
    if (!existing) return false;
    if (this.board.isOccupied(newRow, newCol)) return false;
    if (!this.board.isInBounds(newRow, newCol)) return false;

    this.board.removeTile(existing.row, existing.col);
    this.board.placeTile({ ...existing }, newRow, newCol);
    this.pendingTiles.set(tileId, { ...existing, row: newRow, col: newCol });
    return true;
  }

  /** Get all pending placed tiles */
  getPendingTiles(): PlacedTile[] {
    return [...this.pendingTiles.values()];
  }

  /** Clear all pending placements */
  clearPending(): void {
    for (const placed of this.pendingTiles.values()) {
      this.board.removeTile(placed.row, placed.col);
    }
    this.pendingTiles.clear();
  }

  /** Submit the current word placement */
  submitWord(): { success: boolean; words: WordResult[]; totalScore: number; error?: string } {
    if (this.phase !== 'placing') {
      return { success: false, words: [], totalScore: 0, error: 'Not in placing phase' };
    }

    const pending = this.getPendingTiles();
    if (pending.length === 0) {
      return { success: false, words: [], totalScore: 0, error: 'No tiles placed' };
    }

    // Validate placement rules
    const validationError = ScoreCalculator.validatePlacement(
      pending,
      this.board.hasTiles(),
      this.board.isCenterOccupied(),
      (r, c) => this.board.isInBounds(r, c),
      (r, c) => this.board.isOccupied(r, c)
    );

    if (validationError) {
      return { success: false, words: [], totalScore: 0, error: validationError };
    }

    // Find all formed words
    const words = this.board.findWords(pending);

    if (words.length === 0) {
      this.clearPending();
      return { success: false, words: [], totalScore: 0, error: 'No valid words formed' };
    }

    // Calculate score
    const totalScore = ScoreCalculator.calculate(
      words,
      pending.length,
      (r, c) => this.board.isPremiumUsed(r, c)
    );

    // Mark premium squares as used
    for (const tile of pending) {
      if (getPremiumType(tile.row, tile.col)) {
        this.board.markPremiumUsed(tile.row, tile.col);
      }
    }

    // Deduct tiles from rack
    for (const placed of pending) {
      const idx = this.currentPlayer.rack.findIndex((t) => t?.id === placed.id);
      if (idx !== -1) {
        this.currentPlayer.rack[idx] = null;
      }
    }

    // Add score
    this.currentPlayer.score += totalScore;

    // Record move
    this.moveHistory.push({ type: 'place', tiles: pending });

    // Draw new tiles
    this.currentPlayer.rack = this.fillRack(this.currentPlayer.rack);

    // Clear pending
    this.pendingTiles.clear();
    this.consecutivePasses = 0;

    // Check game over: bag empty AND one player has empty rack
    if (this.bag.isEmpty() && this.currentPlayer.rack.every((t) => t === null)) {
      this.phase = 'gameover';
      this.applyEndgameScoring();
    } else {
      // Switch turn
      this.switchTurn();
    }

    return { success: true, words, totalScore };
  }

  /** Pass the current turn */
  passTurn(): void {
    if (this.phase !== 'placing') return;
    this.clearPending();
    this.consecutivePasses++;

    if (this.consecutivePasses >= 6) {
      this.phase = 'gameover';
      return;
    }

    this.moveHistory.push({ type: 'pass' });
    this.switchTurn();
  }

  /** Enter swap mode */
  enterSwapMode(): void {
    if (this.phase !== 'placing') return;
    if (this.bag.remainingCount === 0) return;
    this.clearPending();
    this.swapMode = true;
    this.phase = 'swap';
  }

  /** Execute swap of selected tiles */
  swapTiles(tileIds: string[]): void {
    if (this.phase !== 'swap') return;
    if (tileIds.length === 0) {
      this.phase = 'placing';
      this.swapMode = false;
      return;
    }

    const tilesToSwap: Tile[] = [];
    for (const id of tileIds) {
      const idx = this.currentPlayer.rack.findIndex((t) => t?.id === id);
      if (idx !== -1) {
        const tile = this.currentPlayer.rack[idx]!;
        tilesToSwap.push(tile);
        this.currentPlayer.rack[idx] = null;
      }
    }

    // Return tiles to bag
    this.bag.returnTilesByTile(tilesToSwap);

    // Draw new tiles
    this.currentPlayer.rack = this.fillRack(this.currentPlayer.rack);

    this.moveHistory.push({ type: 'swap', tiles: tileIds });

    this.swapMode = false;
    this.phase = 'placing';
    this.consecutivePasses = 0;
    this.switchTurn();
  }

  /** Cancel swap mode */
  cancelSwap(): void {
    this.swapMode = false;
    this.phase = 'placing';
  }

  /** Switch to the next player */
  private switchTurn(): void {
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    this.players[0]!.isActive = this.currentPlayerIndex === 0;
    this.players[1]!.isActive = this.currentPlayerIndex === 1;
    this.turnNumber++;
  }

  /** Apply endgame scoring: remaining tile values deducted from loser's score */
  private applyEndgameScoring(): void {
    // The player who went out gets the sum of opponent's remaining tiles added to their score
    const opponentRack = this.opponentPlayer.rack;
    const remainingPoints = opponentRack.reduce((sum, t) => sum + (t?.points ?? 0), 0);
    this.currentPlayer.score += remainingPoints;
    this.opponentPlayer.score -= remainingPoints;
  }

  /** Get the winner (or null if tie / game not over) */
  getWinner(): Player | null {
    if (this.phase !== 'gameover') return null;
    if (this.currentPlayer.score > this.opponentPlayer.score) return this.currentPlayer;
    if (this.opponentPlayer.score > this.currentPlayer.score) return this.opponentPlayer;
    return null; // tie
  }

  /** Get a snapshot of the full game state */
  getState(): GameState {
    return {
      board: this.board.getGrid(),
      players: [
        { ...this.players[0]!, rack: [...this.players[0]!.rack] },
        { ...this.players[1]!, rack: [...this.players[1]!.rack] },
      ],
      currentPlayerIndex: this.currentPlayerIndex,
      bag: this.bag.getRemainingIds(),
      phase: this.phase,
      turnNumber: this.turnNumber,
      consecutivePasses: this.consecutivePasses,
      moveHistory: [...this.moveHistory],
      swapMode: this.swapMode,
    };
  }

  /** Reset the game */
  reset(): void {
    const p1Name = this.players[0]!.name;
    const p2Name = this.players[1]!.name;
    const fresh = new Game(p1Name, p2Name);
    this.board.loadGrid(fresh.board.getGrid());
    this.bag.reset();
    this.players = fresh.players;
    this.currentPlayerIndex = 0;
    this.phase = 'placing';
    this.turnNumber = 1;
    this.consecutivePasses = 0;
    this.moveHistory = [];
    this.swapMode = false;
    this.pendingTiles.clear();
  }
}
