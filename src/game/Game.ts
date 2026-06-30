import type { Tile, PlacedTile, Player, GameState, GamePhase, TurnAction, WordResult, MoveRecord, GameSummary } from '../types.js';
import { Board, CENTER, getPremiumType } from './Board.js';
import { Bag } from './Bag.js';
import { ScoreCalculator } from './ScoreCalculator.js';
import { WordValidator } from './WordValidator.js';

const RACK_SIZE = 7;

/**
 * Core game engine for OpenScrabble.
 * Manages turns, tile placement, scoring, and game state.
 * v0.3.0: Enhanced move history, undo support, game summary.
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
  moveRecords: MoveRecord[] = [];
  swapMode: boolean = false;
  endReason: 'normal' | 'resign' = 'normal';
  private pendingTiles: Map<string, PlacedTile> = new Map();
  private stateSnapshots: string[] = [];

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
    while (result.length < RACK_SIZE) result.push(null);
    const emptySlots = result.filter((t) => t === null).length;
    if (emptySlots <= 0) return this.sortRack(result);
    const drawn = this.bag.draw(emptySlots);
    let drawIdx = 0;
    for (let i = 0; i < result.length && drawIdx < drawn.length; i++) {
      if (result[i] === null) result[i] = drawn[drawIdx++]!;
    }
    return this.sortRack(result);
  }

  private sortRack(rack: (Tile | null)[]): (Tile | null)[] {
    const tiles = rack.filter((t): t is Tile => t !== null);
    const nulls = rack.filter((t) => t === null);
    tiles.sort((a, b) => {
      const aLetter = (a.playedAs || a.letter || '').toLowerCase();
      const bLetter = (b.playedAs || b.letter || '').toLowerCase();
      if (!aLetter && !bLetter) return 0;
      if (!aLetter) return 1;
      if (!bLetter) return -1;
      return aLetter.localeCompare(bLetter);
    });
    return [...tiles, ...nulls];
  }

  // ─── Pending tile management ───────────────────────────

  placeTile(tileId: string, row: number, col: number): boolean {
    if (this.phase !== 'placing') return false;
    if (this.board.isOccupied(row, col)) return false;
    if (!this.board.isInBounds(row, col)) return false;

    if (this.pendingTiles.has(tileId)) {
      const existing = this.pendingTiles.get(tileId)!;
      this.board.removeTile(existing.row, existing.col);
      this.board.placeTile({ ...existing }, row, col);
      this.pendingTiles.set(tileId, { ...existing, row, col });
      return true;
    }

    const rackIdx = this.currentPlayer.rack.findIndex((t) => t?.id === tileId);
    if (rackIdx === -1) return false;

    const rackTile = this.currentPlayer.rack[rackIdx]!;
    this.currentPlayer.rack[rackIdx] = null;
    this.board.placeTile({ ...rackTile }, row, col);
    this.pendingTiles.set(tileId, { ...rackTile, row, col });
    return true;
  }

  removeTile(row: number, col: number): boolean {
    if (this.phase !== 'placing') return false;
    for (const [tileId, placed] of this.pendingTiles) {
      if (placed.row === row && placed.col === col) {
        this.board.removeTile(row, col);
        this.pendingTiles.delete(tileId);
        this.currentPlayer.rack = this.currentPlayer.rack.filter((t) => t !== null);
        this.currentPlayer.rack.push({ letter: placed.letter, points: placed.points, id: placed.id, isBlank: placed.isBlank, playedAs: placed.playedAs });
        this.currentPlayer.rack = this.sortRack(this.currentPlayer.rack);
        while (this.currentPlayer.rack.length < RACK_SIZE) this.currentPlayer.rack.push(null);
        return true;
      }
    }
    return false;
  }

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

  undoLastPendingTile(): boolean {
    if (this.phase !== 'placing') return false;
    if (this.pendingTiles.size === 0) return false;
    const entries = [...this.pendingTiles.entries()];
    const [, placed] = entries[entries.length - 1]!;
    return this.removeTile(placed.row, placed.col);
  }

  assignBlankLetter(tileId: string, letter: string): boolean {
    if (this.phase !== 'placing') return false;
    if (letter.length !== 1 || !/^[A-Z]$/i.test(letter)) return false;
    const pending = this.pendingTiles.get(tileId);
    if (!pending) return false;
    const upper = letter.toUpperCase();
    pending.playedAs = upper;
    pending.letter = upper;
    this.board.removeTile(pending.row, pending.col);
    this.board.placeTile({ ...pending }, pending.row, pending.col);
    this.pendingTiles.set(tileId, { ...pending });
    return true;
  }

  isPendingBlank(tileId: string): boolean {
    const pending = this.pendingTiles.get(tileId);
    return !!pending && !!pending.isBlank && !pending.playedAs;
  }

  getPendingTiles(): PlacedTile[] {
    return [...this.pendingTiles.values()];
  }

  clearPending(): void {
    for (const placed of this.pendingTiles.values()) {
      this.board.removeTile(placed.row, placed.col);
      this.currentPlayer.rack.push({ letter: placed.letter, points: placed.points, id: placed.id, isBlank: placed.isBlank, playedAs: placed.playedAs });
    }
    this.pendingTiles.clear();
    this.currentPlayer.rack = this.sortRack(this.currentPlayer.rack);
    while (this.currentPlayer.rack.length < RACK_SIZE) this.currentPlayer.rack.push(null);
  }

  // ─── Submit ────────────────────────────────────────────

  /** Save a snapshot before committing a move (for undo) */
  private saveSnapshot(): void {
    // Get the current state, then modify it to represent the pre-placement state
    // (pending tiles are on the board but should be back in the rack for undo)
    const grid = this.board.getGrid();
    const rack = [...this.currentPlayer.rack];

    // Remove pending tiles from the board copy
    for (const placed of this.pendingTiles.values()) {
      grid[placed.row]![placed.col] = null;
    }

    // Add pending tiles back to rack copy (simulating pre-placement state)
    const restoredTiles = [...this.pendingTiles.values()].map((t) => ({
      letter: t.letter, points: t.points, id: t.id,
      isBlank: t.isBlank, playedAs: t.playedAs,
    }));
    const rackWithout = rack.filter((t): t is Tile => t !== null);
    const combined = [...rackWithout, ...restoredTiles];
    combined.sort((a, b) => {
      const aL = (a.playedAs || a.letter || '').toLowerCase();
      const bL = (b.playedAs || b.letter || '').toLowerCase();
      if (!aL && !bL) return 0;
      if (!aL) return 1;
      if (!bL) return -1;
      return aL.localeCompare(bL);
    });
    const fullRack: (Tile | null)[] = [...combined];
    while (fullRack.length < 7) fullRack.push(null);

    // Build snapshot state
    const state: GameState = {
      board: grid,
      players: [
        {
          ...this.players[0]!,
          rack: this.currentPlayerIndex === 0 ? fullRack : [...this.players[0]!.rack],
        },
        {
          ...this.players[1]!,
          rack: this.currentPlayerIndex === 1 ? fullRack : [...this.players[1]!.rack],
        },
      ],
      currentPlayerIndex: this.currentPlayerIndex,
      bag: this.bag.getRemainingIds(),
      phase: this.phase,
      turnNumber: this.turnNumber,
      consecutivePasses: this.consecutivePasses,
      moveHistory: [...this.moveHistory],
      swapMode: this.swapMode,
    };

    // Include premiumUsed matrix
    const premiumUsed: boolean[][] = [];
    for (let r = 0; r < 15; r++) {
      premiumUsed[r] = [];
      for (let c = 0; c < 15; c++) {
        premiumUsed[r]![c] = this.board.isPremiumUsed(r, c);
      }
    }
    this.stateSnapshots.push(JSON.stringify({ state, premiumUsed }));
    // Keep only last 10 snapshots to bound memory
    if (this.stateSnapshots.length > 10) {
      this.stateSnapshots.shift();
    }
  }

  submitWord(): { success: boolean; words: WordResult[]; totalScore: number; error?: string } {
    if (this.phase !== 'placing') {
      return { success: false, words: [], totalScore: 0, error: 'Not in placing phase' };
    }

    const pending = this.getPendingTiles();
    if (pending.length === 0) {
      return { success: false, words: [], totalScore: 0, error: 'No tiles placed' };
    }

    const hasCommittedTiles = this.board.getAllPlacedTiles().length > pending.length;
    const validationError = ScoreCalculator.validatePlacement(
      pending, hasCommittedTiles, this.board.isCenterOccupied(),
      (r, c) => this.board.isInBounds(r, c),
      (r, c) => this.board.isOccupied(r, c)
    );

    if (validationError) {
      return { success: false, words: [], totalScore: 0, error: validationError };
    }

    const words = this.board.findWords(pending);
    if (words.length === 0) {
      return { success: false, words: [], totalScore: 0, error: 'No words formed' };
    }

    const wordStrings = words.map((w) => w.word);
    const invalidWords = WordValidator.findInvalid(wordStrings);
    if (invalidWords.length > 0) {
      const badWord = invalidWords[0]!;
      return { success: false, words: [], totalScore: 0, error: `"${badWord.word}" is not a valid word` };
    }

    // Save snapshot BEFORE committing (for undo)
    this.saveSnapshot();

    const totalScore = ScoreCalculator.calculate(
      words, pending.length,
      (r, c) => this.board.isPremiumUsed(r, c)
    );

    for (const tile of pending) {
      if (getPremiumType(tile.row, tile.col)) {
        this.board.markPremiumUsed(tile.row, tile.col);
      }
    }

    for (const placed of pending) {
      const idx = this.currentPlayer.rack.findIndex((t) => t?.id === placed.id);
      if (idx !== -1) this.currentPlayer.rack[idx] = null;
    }

    this.currentPlayer.score += totalScore;

    // Get scored words for the record
    const scoredWords = ScoreCalculator.scoreWordsWithDetails(words, (r, c) => true);

    // Build detailed move record
    const desc = scoredWords.map((w) => `"${w.word}"`).join(' + ');
    const record: MoveRecord = {
      turnNumber: this.turnNumber,
      playerIndex: this.currentPlayerIndex,
      playerName: this.currentPlayer.name,
      words: scoredWords,
      totalScore,
      cumulativeScore: this.currentPlayer.score,
      moveDescription: `${desc} → ${totalScore} pts`,
    };
    this.moveRecords.push(record);

    this.moveHistory.push({ type: 'place', tiles: pending });
    this.currentPlayer.rack = this.fillRack(this.currentPlayer.rack);
    this.pendingTiles.clear();
    this.consecutivePasses = 0;

    if (this.bag.isEmpty() && this.currentPlayer.rack.every((t) => t === null)) {
      this.phase = 'gameover';
      this.endReason = 'normal';
      this.applyEndgameScoring();
    } else {
      this.switchTurn();
    }

    return { success: true, words, totalScore };
  }

  // ─── Pass / Swap ───────────────────────────────────────

  passTurn(): void {
    if (this.phase !== 'placing') return;
    this.clearPending();
    this.consecutivePasses++;

    this.moveHistory.push({ type: 'pass' });
    this.moveRecords.push({
      turnNumber: this.turnNumber,
      playerIndex: this.currentPlayerIndex,
      playerName: this.currentPlayer.name,
      words: [],
      totalScore: 0,
      cumulativeScore: this.currentPlayer.score,
      moveDescription: 'Pass',
    });

    if (this.consecutivePasses >= 6) {
      this.phase = 'gameover';
      this.endReason = 'normal';
      return;
    }
    this.switchTurn();
  }

  enterSwapMode(): void {
    if (this.phase !== 'placing') return;
    if (this.bag.remainingCount === 0) return;
    this.clearPending();
    this.swapMode = true;
    this.phase = 'swap';
  }

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
        tilesToSwap.push(this.currentPlayer.rack[idx]!);
        this.currentPlayer.rack[idx] = null;
      }
    }

    this.bag.returnTilesByTile(tilesToSwap);
    this.currentPlayer.rack = this.fillRack(this.currentPlayer.rack);

    this.moveHistory.push({ type: 'swap', tiles: tileIds });
    this.moveRecords.push({
      turnNumber: this.turnNumber,
      playerIndex: this.currentPlayerIndex,
      playerName: this.currentPlayer.name,
      words: [],
      totalScore: 0,
      cumulativeScore: this.currentPlayer.score,
      moveDescription: `Swapped ${tileIds.length} tile(s)`,
    });

    this.swapMode = false;
    this.phase = 'placing';
    this.consecutivePasses = 0;
    this.switchTurn();
  }

  cancelSwap(): void {
    this.swapMode = false;
    this.phase = 'placing';
  }

  private switchTurn(): void {
    this.currentPlayerIndex = 1 - this.currentPlayerIndex;
    this.players[0]!.isActive = this.currentPlayerIndex === 0;
    this.players[1]!.isActive = this.currentPlayerIndex === 1;
    this.turnNumber++;
  }

  private applyEndgameScoring(): void {
    const opponentRack = this.opponentPlayer.rack;
    const remainingPoints = opponentRack.reduce((sum, t) => sum + (t?.points ?? 0), 0);
    this.currentPlayer.score += remainingPoints;
    this.opponentPlayer.score -= remainingPoints;
  }

  // ─── Preview ───────────────────────────────────────────

  previewMove(): { valid: boolean; words: WordResult[]; totalScore: number; error?: string } {
    const pending = this.getPendingTiles();
    if (pending.length === 0) {
      return { valid: false, words: [], totalScore: 0, error: 'No tiles placed' };
    }

    const hasCommittedTiles = this.board.getAllPlacedTiles().length > pending.length;
    const validationError = ScoreCalculator.validatePlacement(
      pending, hasCommittedTiles, this.board.isCenterOccupied(),
      (r, c) => this.board.isInBounds(r, c),
      (r, c) => this.board.isOccupied(r, c)
    );
    if (validationError) {
      return { valid: false, words: [], totalScore: 0, error: validationError };
    }

    const words = this.board.findWords(pending);
    if (words.length === 0) {
      return { valid: false, words: [], totalScore: 0, error: 'No words formed' };
    }

    const wordStrings = words.map((w) => w.word);
    const invalid = WordValidator.findInvalid(wordStrings);
    if (invalid.length > 0) {
      const badWord = invalid[0]!;
      return { valid: false, words: [], totalScore: 0, error: `"${badWord.word}" is not a valid word` };
    }

    const scoredWords = ScoreCalculator.scoreWordsWithDetails(words, (r, c) => this.board.isPremiumUsed(r, c));
    const totalScore = ScoreCalculator.calculate(words, pending.length, (r, c) => this.board.isPremiumUsed(r, c));

    return { valid: true, words: scoredWords, totalScore };
  }

  // ─── Undo ──────────────────────────────────────────────

  /** Undo the last submitted move. Restores complete game state from snapshot. */
  undoMove(): boolean {
    if (this.phase === 'gameover') return false;
    if (this.stateSnapshots.length === 0) return false;
    if (this.pendingTiles.size > 0) return false; // can't undo while tiles are pending

    const snapshot = this.stateSnapshots.pop()!;
    this.restoreFromSnapshot(snapshot);
    return true;
  }

  /** Restore full game state from a JSON snapshot */
  private restoreFromSnapshot(snapshot: string): void {
    const data = JSON.parse(snapshot) as { state: GameState; premiumUsed: boolean[][] };
    const state = data.state;
    const premiumUsed = data.premiumUsed;

    // Restore board grid
    this.board.loadGrid(state.board);

    // Restore premium used matrix from snapshot
    this.board.clearPremiumUsed();
    if (premiumUsed) {
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (premiumUsed[r]?.[c]) {
            this.board.markPremiumUsed(r, c);
          }
        }
      }
    }

    // Restore player state
    this.players = [
      {
        name: state.players[0]!.name,
        score: state.players[0]!.score,
        rack: state.players[0]!.rack.map((t) => (t ? { ...t } : null)),
        isActive: state.currentPlayerIndex === 0,
      },
      {
        name: state.players[1]!.name,
        score: state.players[1]!.score,
        rack: state.players[1]!.rack.map((t) => (t ? { ...t } : null)),
        isActive: state.currentPlayerIndex === 1,
      },
    ];

    this.currentPlayerIndex = state.currentPlayerIndex;
    this.phase = 'placing';
    this.turnNumber = state.turnNumber;
    this.consecutivePasses = state.consecutivePasses;
    this.swapMode = false;
    this.pendingTiles.clear();

    // Restore bag
    const allInPlay: Tile[] = [];
    for (const row of state.board) {
      for (const t of row) { if (t) allInPlay.push(t); }
    }
    for (const p of state.players) {
      for (const t of p.rack) { if (t) allInPlay.push(t); }
    }
    const inPlayIds = new Set(allInPlay.map((t) => t.id));
    this.bag.reset();
    const allBagTiles = this.bag.draw(100);
    const toKeep = allBagTiles.filter((t) => !inPlayIds.has(t.id));
    this.bag.returnTiles(toKeep.map((t) => t.id));

    // Remove the last move record since we undid it
    this.moveRecords.pop();
    this.moveHistory.pop();

    // Sort racks
    for (let i = 0; i < 2; i++) {
      const rack = this.players[i]!.rack.filter((t): t is Tile => t !== null);
      rack.sort((a, b) => {
        const aLetter = (a.playedAs || a.letter || '').toLowerCase();
        const bLetter = (b.playedAs || b.letter || '').toLowerCase();
        if (!aLetter && !bLetter) return 0;
        if (!aLetter) return 1;
        if (!bLetter) return -1;
        return aLetter.localeCompare(bLetter);
      });
      const result: (Tile | null)[] = [...rack];
      while (result.length < RACK_SIZE) result.push(null);
      this.players[i]!.rack = result;
    }
  }

  // ─── Game Summary ──────────────────────────────────────

  /** Get the winner (or null if tie / game not over) */
  getWinner(): Player | null {
    if (this.phase !== 'gameover') return null;
    if (this.currentPlayer.score > this.opponentPlayer.score) return this.currentPlayer;
    if (this.opponentPlayer.score > this.currentPlayer.score) return this.opponentPlayer;
    return null;
  }

  /** Get full game summary */
  getSummary(): GameSummary {
    const winner = this.getWinner();
    let bestWord: { word: string; score: number } | null = null;

    for (const record of this.moveRecords) {
      for (const w of record.words) {
        if (!bestWord || w.score > bestWord.score) {
          bestWord = { word: w.word, score: w.score };
        }
      }
    }

    return {
      winner,
      isTie: this.phase === 'gameover' && winner === null,
      totalTurns: this.turnNumber - 1,
      moveHistory: [...this.moveRecords],
      bestWord,
      finalScores: [this.players[0]!.score, this.players[1]!.score],
    };
  }

  // ─── State ─────────────────────────────────────────────

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
    this.moveRecords = [];
    this.stateSnapshots = [];
    this.swapMode = false;
    this.pendingTiles.clear();
  }

  toJSON(): unknown {
    return this.getState();
  }

  static fromJSON(data: Record<string, unknown>): Game {
    const state = data as unknown as GameState;
    const game = new Game(state.players[0]!.name, state.players[1]!.name);
    game.board.loadGrid(state.board);

    const allTiles: Tile[] = [];
    for (const row of state.board) {
      for (const t of row) { if (t) allTiles.push(t); }
    }
    for (const p of state.players) {
      for (const t of p.rack) { if (t) allTiles.push(t); }
    }

    game.bag.reset();
    const allBagTiles = game.bag.draw(100);
    const toKeep = allBagTiles.filter((t) => !allTiles.some((at) => at.id === t.id));
    game.bag.returnTiles(toKeep.map((t) => t.id));

    game.players = state.players.map((p) => ({ ...p, rack: [...p.rack] })) as [Player, Player];
    game.currentPlayerIndex = state.currentPlayerIndex;
    game.phase = 'placing';
    game.turnNumber = state.turnNumber;
    game.consecutivePasses = state.consecutivePasses;
    game.moveHistory = state.moveHistory.map((m) => {
      if (m.type === 'place') {
        return { type: 'place' as const, tiles: [...(m as { tiles: import('../types.js').PlacedTile[] }).tiles] };
      }
      return m;
    });
    game.swapMode = false;
    game.pendingTiles.clear();
    return game;
  }
}
