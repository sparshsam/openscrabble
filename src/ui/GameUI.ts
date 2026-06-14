import type { GameState, PlacedTile, Tile, WordResult } from '../types.js';
import { Game } from '../game/Game.js';
import { GamePersistence } from '../game/Persistence.js';
import { getPremiumType } from '../game/Board.js';

/**
 * Pointer drag state — tracks an ongoing drag from rack or board cell.
 */
interface DragState {
  tileId: string;
  isDragging: boolean;
  startX: number;
  startY: number;
  clone: HTMLElement | null;
  source: 'rack' | 'board';
  sourceRow: number;
  sourceCol: number;
  currentTarget: HTMLElement | null;
  suppressClick: boolean;
}

/**
 * GameUI — renders the full game screen with live feedback,
 * tile scores, validation preview, and mobile-first layout.
 * Uses unified Pointer Events for all tile interaction (mouse, touch, pen).
 * Tap-to-select/place retained as fallback.
 * Automatically saves state to localStorage after every action.
 */
export class GameUI {
  private game: Game;
  private root: HTMLElement;
  private selectedTileId: string | null = null;
  private drag: DragState | null = null;
  private swapSelection: Set<string> = new Set();
  private onBackToHome: (() => void) | null = null;

  constructor(
    root: HTMLElement,
    game?: Game,
    onBackToHome?: () => void
  ) {
    this.root = root;
    this.game = game ?? new Game();
    this.onBackToHome = onBackToHome ?? null;
    this.render();
  }

  private save(): void {
    GamePersistence.save(this.game);
  }

  private render(): void {
    const state = this.game.getState();
    this.root.innerHTML = '';
    this.root.appendChild(this.createGameContainer(state));
  }

  // ─── Layout ──────────────────────────────────────────

  private createGameContainer(state: GameState): HTMLElement {
    const container = document.createElement('div');
    container.className = 'game-container';

    container.appendChild(this.createHeader(state));
    container.appendChild(this.createScoreDisplay(state));
    container.appendChild(this.createBoard(state));

    const preview = this.game.getPendingTiles().length > 0 ? this.game.previewMove() : null;
    container.appendChild(this.createLivePreview(preview));
    container.appendChild(this.createActionsBar(state));
    container.appendChild(this.createRack(state));
    container.appendChild(this.createMessageArea());

    return container;
  }

  // ─── Header ──────────────────────────────────────────

  private createHeader(state: GameState): HTMLElement {
    const header = document.createElement('header');
    header.className = 'game-header';
    header.innerHTML = `<h1>OpenScrabble</h1>
      <div class="header-actions">
        <span class="turn-indicator">Turn ${state.turnNumber}</span>
        <button class="btn btn-icon" data-action="reset" title="New Game">↻</button>
        <button class="btn btn-icon" data-action="home" title="Home">⌂</button>
      </div>`;

    header.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      this.onReset();
    });

    header.querySelector('[data-action="home"]')?.addEventListener('click', () => {
      if (confirm('Return to home? The current game will be saved.')) {
        this.save();
        this.onBackToHome?.();
      }
    });

    return header;
  }

  private onReset(): void {
    if (confirm('Start a new game? Your current game will be lost.')) {
      GamePersistence.clear();
      this.game = new Game(
        this.game.players[0]!.name,
        this.game.players[1]!.name
      );
      this.selectedTileId = null;
      this.clearDrag();
      this.render();
    }
  }

  // ─── Score Display ───────────────────────────────────

  private createScoreDisplay(state: GameState): HTMLElement {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';

    for (let i = 0; i < 2; i++) {
      const player = state.players[i]!;
      const pDiv = document.createElement('div');
      pDiv.className = `player-score ${i === state.currentPlayerIndex ? 'active' : ''}`;
      pDiv.innerHTML = `
        <span class="player-name">${this.esc(player.name)}</span>
        <span class="player-score-value">${player.score}</span>
        <span class="tiles-left">${player.rack.filter((t) => t !== null).length}/7</span>
      `;
      scoreDiv.appendChild(pDiv);
    }

    const bagInfo = document.createElement('div');
    bagInfo.className = 'bag-count';
    bagInfo.textContent = `Bag: ${state.bag.length}`;
    scoreDiv.appendChild(bagInfo);

    return scoreDiv;
  }

  // ─── Board ───────────────────────────────────────────

  private createBoard(state: GameState): HTMLElement {
    const boardContainer = document.createElement('div');
    boardContainer.className = 'board-container';

    const boardEl = document.createElement('div');
    boardEl.className = 'board';

    // Prevent board scrolling while dragging
    boardEl.addEventListener('touchstart', (e) => {
      if (this.drag?.isDragging) e.preventDefault();
    }, { passive: false });

    const preview = this.game.getPendingTiles().length > 0 ? this.game.previewMove() : null;
    const pendingSet = new Set(
      this.game.getPendingTiles().map((t) => `${t.row},${t.col}`)
    );

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = this.createCell(r, c, state, pendingSet, preview);
        boardEl.appendChild(cell);
      }
    }

    boardContainer.appendChild(boardEl);

    return boardContainer;
  }

  private createCell(
    row: number, col: number, state: GameState,
    pendingSet: Set<string>, preview: { valid: boolean; error?: string } | null
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);

    const tile = state.board[row]![col];
    const isPending = pendingSet.has(`${row},${col}`);
    const premium = getPremiumType(row, col);

    // Center star
    if (row === 7 && col === 7 && !tile) {
      cell.classList.add('center-star');
      cell.textContent = '★';
    }

    // Premium square
    if (premium && !tile && !(row === 7 && col === 7)) {
      cell.classList.add(`premium-${premium}`);
      cell.dataset.premium = premium;
      cell.textContent = this.getPremiumLabel(premium);
    }

    // Placed tile
    if (tile) {
      cell.classList.add('has-tile');
      if (isPending) {
        cell.classList.add('pending');
        if (preview) {
          cell.classList.add(preview.valid ? 'pending-valid' : 'pending-invalid');
        }
        // Highlight the selected pending tile
        if (this.selectedTileId === tile.id) {
          cell.classList.add('selected');
        }
      }
      cell.dataset.tileId = tile.id;
      cell.textContent = tile.playedAs ?? tile.letter;

      // Point badge
      const badge = document.createElement('span');
      badge.className = 'tile-points';
      badge.textContent = String(tile.points);
      cell.appendChild(badge);
    }

    // ── Click (tap-to-place / tap-to-move) ──
    cell.addEventListener('click', () => {
      if (!this.game || this.game.phase !== 'placing') return;
      // If we just finished a drag on this cell, ignore the click
      if (this.drag?.suppressClick) return;

      if (isPending) {
        // Tapping a pending tile: if selected, remove; otherwise select
        if (this.selectedTileId === tile?.id) {
          this.game.removeTile(row, col);
          this.selectedTileId = null;
        } else {
          this.selectedTileId = tile?.id ?? null;
        }
        this.save();
        this.render();
        return;
      }

      if (this.selectedTileId && !tile) {
        this.game.placeTile(this.selectedTileId, row, col);
        this.selectedTileId = null;
        this.save();
        this.render();
      }
    });

    // ── Pointer down (drag start) for pending tiles ──
    if (isPending) {
      cell.addEventListener('pointerdown', (e) => {
        if (this.game.phase !== 'placing' || !tile) return;
        this.startDrag(tile.id, 'board', e, row, col);
      });
    }

    return cell;
  }

  // ─── Rack ────────────────────────────────────────────

  private createRack(state: GameState): HTMLElement {
    const rackContainer = document.createElement('div');
    rackContainer.className = 'rack-container';

    const player = state.players[state.currentPlayerIndex]!;
    const pendingTileIds = new Set(this.game.getPendingTiles().map((t) => t.id));

    const label = document.createElement('div');
    label.className = 'rack-label';
    label.textContent = `${player.name}'s Rack`;
    rackContainer.appendChild(label);

    const rack = document.createElement('div');
    rack.className = 'tile-rack';

    for (let i = 0; i < 7; i++) {
      const slot = document.createElement('div');
      slot.className = 'rack-slot';
      const tile = player.rack[i];

      if (tile) {
        const isOnBoard = pendingTileIds.has(tile.id);
        slot.classList.add('has-tile');

        if (state.swapMode) {
          const isSelected = this.swapSelection.has(tile.id);
          slot.classList.toggle('selected', isSelected);
          slot.textContent = tile.letter || '?';
          const badge = document.createElement('span');
          badge.className = 'tile-points';
          badge.textContent = String(tile.points);
          slot.appendChild(badge);
          slot.addEventListener('click', () => {
            if (this.swapSelection.has(tile.id)) {
              this.swapSelection.delete(tile.id);
            } else {
              this.swapSelection.add(tile.id);
            }
            this.render();
          });
        } else if (isOnBoard) {
          // Tile is on the board — show as dimmed/empty slot
          slot.classList.remove('has-tile');
          slot.classList.add('empty', 'on-board');
          slot.textContent = '';
        } else {
          slot.textContent = tile.letter || '?';
          if (tile.points > 0) {
            const badge = document.createElement('span');
            badge.className = 'tile-points';
            badge.textContent = String(tile.points);
            slot.appendChild(badge);
          }
          if (tile.letter === '') slot.classList.add('blank-tile');
          slot.dataset.tileId = tile.id;

          // ── Click (tap to select) ──
          slot.addEventListener('click', () => {
            if (this.game.phase !== 'placing') return;
            // If we just finished a drag, ignore click
            if (this.drag?.suppressClick) return;

            // If in swap mode, handled above
            if (state.swapMode) return;

            if (this.selectedTileId === tile.id) {
              this.selectedTileId = null;
              this.render();
              return;
            }
            const pending = this.game.getPendingTiles().find((t) => t.id === tile.id);
            if (pending) {
              this.game.removeTile(pending.row, pending.col);
              this.save();
              this.selectedTileId = null;
              this.render();
              return;
            }
            this.selectedTileId = tile.id;
            this.render();
          });

          // ── Pointer down (drag start) ──
          slot.addEventListener('pointerdown', (e) => {
            if (this.game.phase !== 'placing') return;
            this.startDrag(tile.id, 'rack', e);
          });
        }
      } else {
        slot.classList.add('empty');
      }

      rack.appendChild(slot);
    }

    rackContainer.appendChild(rack);

    return rackContainer;
  }

  // ─── Pointer Events: Drag System ─────────────────────

  /** Start tracking a potential drag from the given source. */
  private startDrag(
    tileId: string,
    source: 'rack' | 'board',
    e: PointerEvent,
    sourceRow?: number,
    sourceCol?: number
  ): void {
    if (this.drag) return; // already dragging

    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);

    this.drag = {
      tileId,
      isDragging: false,
      startX: e.clientX,
      startY: e.clientY,
      clone: null,
      source,
      sourceRow: sourceRow ?? -1,
      sourceCol: sourceCol ?? -1,
      currentTarget: null,
      suppressClick: false,
    };

    // Immediately create the clone so it follows the finger with no delay
    this.dragCloneAt(e.clientX, e.clientY);

    // Prevent page scrolling on mobile immediately
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    // Add document-level listeners for move/up
    document.addEventListener('pointermove', this.onGlobalPointerMove);
    document.addEventListener('pointerup', this.onGlobalPointerUp);
  }

  /** Create (or reposition) the drag clone centered on (x, y). */
  private dragCloneAt(clientX: number, clientY: number): void {
    if (!this.drag) return;

    // Find the source tile element under the start point
    const sourceEl = document.elementFromPoint(clientX, clientY);
    const tileEl = sourceEl?.closest('.has-tile') as HTMLElement;
    if (!tileEl) return;

    if (!this.drag.clone) {
      // First creation — build the clone
      const clone = tileEl.cloneNode(true) as HTMLElement;
      clone.className = 'tile-drag-clone';
      const size = Math.max(tileEl.offsetWidth || 36, 40);
      clone.style.width = `${size}px`;
      clone.style.height = `${size}px`;
      // Use a fixed letter size so it's readable on mobile
      clone.style.fontSize = 'clamp(1rem, 4vw, 1.4rem)';
      document.body.appendChild(clone);
      this.drag.clone = clone;

      // Mark source as held
      tileEl.classList.add('tile-held');
    }

    // Position clone: left/top at clientX/clientY; CSS translate(-50%,-50%) centers it
    if (this.drag.clone) {
      this.drag.clone.style.left = `${clientX}px`;
      this.drag.clone.style.top = `${clientY}px`;
    }

    this.drag.isDragging = true;
  };

  /** Handle pointer move during a drag. */
  private onGlobalPointerMove = (e: PointerEvent): void => {
    if (!this.drag) return;

    // Reposition the clone to follow the finger
    this.dragCloneAt(e.clientX, e.clientY);

    // Highlight drop target
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest('.cell') as HTMLElement;

    if (cell !== this.drag.currentTarget) {
      if (this.drag.currentTarget) {
        this.drag.currentTarget.classList.remove('drag-over');
      }
      this.drag.currentTarget = cell;
      if (cell) {
        cell.classList.add('drag-over');
      }
    }
  };

  private onGlobalPointerUp = (e: PointerEvent): void => {
    if (!this.drag) return;

    // Remove document-level listeners
    document.removeEventListener('pointermove', this.onGlobalPointerMove);
    document.removeEventListener('pointerup', this.onGlobalPointerUp);

    // Restore scrolling
    document.body.style.overflow = '';
    document.body.style.touchAction = '';

    // Clean up clone + highlights
    if (this.drag.clone) {
      this.drag.clone.remove();
    }
    if (this.drag.currentTarget) {
      this.drag.currentTarget.classList.remove('drag-over');
    }

    // Remove held class from source tile
    // Try to find and unmark the held tile
    document.querySelectorAll('.tile-held').forEach((el) => el.classList.remove('tile-held'));

    if (this.drag.isDragging) {
      // ── Actual drag completed — resolve placement ──
      this.drag.suppressClick = true;

      const target = document.elementFromPoint(e.clientX, e.clientY);
      const cell = target?.closest('.cell') as HTMLElement;
      const isOverRack = target?.closest('.rack-container') !== null;
      const isOverBoardCell = cell !== null;
      const isEmptyCell = cell && !cell.classList.contains('has-tile');

      if (isOverBoardCell && isEmptyCell) {
        // Drop on empty board cell
        const row = parseInt(cell.dataset.row!);
        const col = parseInt(cell.dataset.col!);
        if (this.drag.source === 'board') {
          this.game.movePendingTile(this.drag.tileId, row, col);
        } else {
          this.game.placeTile(this.drag.tileId, row, col);
        }
        this.selectedTileId = null;
      } else if (isOverRack && this.drag.source === 'board') {
        // Drop on rack — return pending tile
        this.game.removeTile(this.drag.sourceRow, this.drag.sourceCol);
        this.selectedTileId = null;
      }
      // else: dropped elsewhere — tile stays where it was

      this.clearDrag();
      this.save();
      this.render();
    } else {
      // ── Tap (no drag) — let click handlers do the work ──
      // but we still need to clean up drag state
      this.clearDrag();
    }
  };

  /** Clean up drag state without resolving. */
  private clearDrag(): void {
    if (this.drag?.clone) {
      this.drag.clone.remove();
    }
    if (this.drag?.currentTarget) {
      this.drag.currentTarget.classList.remove('drag-over');
    }
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.querySelectorAll('.tile-held').forEach((el) => el.classList.remove('tile-held'));
    this.drag = null;
  }

  // ─── Live Preview ────────────────────────────────────

  private createLivePreview(
    preview: { valid: boolean; words: WordResult[]; totalScore: number; error?: string } | null
  ): HTMLElement {
    const bar = document.createElement('div');
    bar.className = 'preview-bar';

    if (!preview) {
      bar.classList.add('preview-empty');
      bar.textContent = 'Place tiles to see word preview';
      return bar;
    }

    if (preview.valid) {
      bar.classList.add('preview-valid');
      const wordStr = preview.words.map((w) => `"${w.word}"`).join(', ');
      const pendingCount = this.game.getPendingTiles().length;
      const bingoNote = pendingCount >= 7 ? ' 🎉 Bingo!' : '';
      bar.textContent = `${wordStr} → ${preview.totalScore} pts${bingoNote}`;
    } else {
      bar.classList.add('preview-invalid');
      bar.innerHTML = `✕ ${this.esc(preview.error ?? 'Invalid move')}`;
    }

    return bar;
  }

  // ─── Actions Bar ─────────────────────────────────────

  private createActionsBar(state: GameState): HTMLElement {
    const actions = document.createElement('div');
    actions.className = 'actions-bar';

    if (state.swapMode) {
      const swapBtn = document.createElement('button');
      swapBtn.className = 'btn btn-primary';
      swapBtn.textContent = `Swap (${this.swapSelection.size})`;
      swapBtn.disabled = this.swapSelection.size === 0;
      swapBtn.addEventListener('click', () => {
        this.game.swapTiles([...this.swapSelection]);
        this.swapSelection.clear();
        this.save();
        this.render();
      });
      actions.appendChild(swapBtn);

      const cancelBtn = document.createElement('button');
      cancelBtn.className = 'btn btn-secondary';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => {
        this.swapSelection.clear();
        this.game.cancelSwap();
        this.render();
      });
      actions.appendChild(cancelBtn);
    } else if (state.phase === 'placing') {
      const pendingCount = this.game.getPendingTiles().length;
      const preview = pendingCount > 0 ? this.game.previewMove() : null;
      const isMoveInvalid = preview !== null && !preview.valid;

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary';
      submitBtn.textContent = isMoveInvalid ? 'Word Not Valid' : 'Submit Word';
      submitBtn.disabled = pendingCount === 0 || isMoveInvalid;
      submitBtn.title = isMoveInvalid ? (preview?.error ?? 'Fix the word before submitting') : '';
      submitBtn.addEventListener('click', () => {
        const result = this.game.submitWord();
        if (result.success) {
          this.showMessage(result);
        } else {
          this.showMessage(result);
        }
        this.selectedTileId = null;
        this.save();
        this.render();
      });
      actions.appendChild(submitBtn);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-secondary';
      clearBtn.textContent = 'Clear';
      clearBtn.disabled = pendingCount === 0;
      clearBtn.addEventListener('click', () => {
        this.game.clearPending();
        this.selectedTileId = null;
        this.save();
        this.render();
      });
      actions.appendChild(clearBtn);

      const passBtn = document.createElement('button');
      passBtn.className = 'btn';
      passBtn.textContent = 'Pass';
      passBtn.addEventListener('click', () => {
        this.game.passTurn();
        this.selectedTileId = null;
        this.save();
        this.render();
      });
      actions.appendChild(passBtn);

      const swapBtn = document.createElement('button');
      swapBtn.className = 'btn';
      swapBtn.textContent = 'Swap';
      swapBtn.disabled = state.bag.length === 0;
      swapBtn.addEventListener('click', () => {
        this.game.enterSwapMode();
        this.render();
      });
      actions.appendChild(swapBtn);
    } else if (state.phase === 'gameover') {
      const winner = this.game.getWinner();
      const resultDiv = document.createElement('div');
      resultDiv.className = 'game-over-banner';
      if (winner) {
        resultDiv.textContent = `🏆 ${winner.name} wins! ${winner.score} pts`;
      } else {
        resultDiv.textContent = `🤝 Tie game! ${state.players[0]!.score} - ${state.players[1]!.score}`;
      }
      actions.appendChild(resultDiv);

      const newGameBtn = document.createElement('button');
      newGameBtn.className = 'btn btn-primary';
      newGameBtn.textContent = 'New Game';
      newGameBtn.addEventListener('click', () => {
        GamePersistence.clear();
        this.game = new Game(
          this.game.players[0]!.name,
          this.game.players[1]!.name
        );
        this.render();
      });
      actions.appendChild(newGameBtn);

      const homeBtn = document.createElement('button');
      homeBtn.className = 'btn';
      homeBtn.textContent = 'Home';
      homeBtn.addEventListener('click', () => {
        GamePersistence.clear();
        this.onBackToHome?.();
      });
      actions.appendChild(homeBtn);
    }

    return actions;
  }

  // ─── Message ─────────────────────────────────────────

  private createMessageArea(): HTMLElement {
    const msg = document.createElement('div');
    msg.className = 'message-area';
    msg.id = 'game-message';
    return msg;
  }

  private showMessage(result: { success: boolean; words: WordResult[]; totalScore: number; error?: string }): void {
    const msgEl = document.getElementById('game-message');
    if (!msgEl) return;

    if (result.success) {
      const wordsText = result.words.map((w) => `"${w.word}"`).join(', ');
      const bingoNote = result.totalScore >= 57 ? ' 🎉 Bingo!' : '';
      msgEl.textContent = `${wordsText} → +${result.totalScore} pts${bingoNote}`;
      msgEl.className = 'message-area success';
    } else {
      msgEl.textContent = result.error ?? 'Invalid move';
      msgEl.className = 'message-area error';
    }

    setTimeout(() => {
      msgEl.className = 'message-area';
      msgEl.textContent = '';
    }, 3500);
  }

  // ─── Helpers ─────────────────────────────────────────

  private getPremiumLabel(premium: string): string {
    switch (premium) {
      case 'tw': return 'TW';
      case 'dw': return 'DW';
      case 'tl': return 'TL';
      case 'dl': return 'DL';
      default: return '';
    }
  }

  private esc(s: string): string {
    const el = document.createElement('span');
    el.textContent = s;
    return el.innerHTML;
  }
}
