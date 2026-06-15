import type { GameState, PlacedTile, Tile, WordResult } from '../types.js';
import { Game } from '../game/Game.js';
import { GamePersistence } from '../game/Persistence.js';
import { getPremiumType } from '../game/Board.js';

/** What tile the player has currently selected for tap-to-place. */
interface Selection {
  tileId: string;
  /** Where the tile currently sits. */
  source: 'rack' | 'board';
  /** Board position if source === 'board'. */
  boardRow?: number;
  boardCol?: number;
}

/**
 * GameUI — renders the full game screen with live feedback,
 * tile scores, validation preview.
 *
 * Input model: tap-first (reliable on both phone and desktop).
 * - Tap/click a rack tile → select it.
 * - Tap/click an empty board square → place the selected tile.
 * - Tap/click a pending board tile → select it.
 * - Tap/click another empty board square → move it.
 * - Tap/click a selected pending tile again → return it to rack.
 *
 * Automatically saves state to localStorage after every action.
 */
export class GameUI {
  private game: Game;
  private root: HTMLElement;
  private selectedTile: Selection | null = null;
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
    // Clean up any leftover blank picker overlay
    const oldPicker = document.getElementById('blank-picker-overlay');
    if (oldPicker) oldPicker.remove();
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
      this.selectedTile = null;
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
    const isLocked = tile !== null && !isPending; // submitted tile, cannot move
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
        // Highlight if this is the currently selected pending tile
        if (this.selectedTile?.tileId === tile.id && this.selectedTile.source === 'board') {
          cell.classList.add('selected');
        }
      }
      if (isLocked) {
        cell.classList.add('locked');
      }
      cell.dataset.tileId = tile.id;
      cell.textContent = tile.playedAs ?? tile.letter;

      // Point badge
      const badge = document.createElement('span');
      badge.className = 'tile-points';
      badge.textContent = String(tile.points);
      cell.appendChild(badge);

      // × remove button on selected pending tile
      if (isPending && this.selectedTile?.tileId === tile.id && this.selectedTile.source === 'board') {
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tile-remove-btn';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.game.removeTile(row, col);
          this.selectedTile = null;
          this.save();
          this.render();
        });
        cell.appendChild(removeBtn);
      }
    }

    // ── Click / Tap handler ──────────────────────────
    cell.addEventListener('click', () => {
      if (!this.game || this.game.phase !== 'placing') return;

      if (isLocked) {
        // Locked/submitted tile — do nothing
        return;
      }

      if (isPending) {
        // Pending board tile tapped
        if (this.selectedTile?.tileId === tile!.id) {
          // Already selected → return it to rack
          this.game.removeTile(row, col);
          this.selectedTile = null;
        } else {
          // Select this pending tile for moving
          this.selectedTile = { tileId: tile!.id, source: 'board', boardRow: row, boardCol: col };
        }
        this.save();
        this.render();
        return;
      }

      // Empty cell tapped while a tile is selected
      if (this.selectedTile && !tile) {
        const sel = this.selectedTile;
        if (sel.source === 'board') {
          // Move pending tile to new cell
          this.game.movePendingTile(sel.tileId, row, col);
          this.selectedTile = null;
        } else {
          // Place rack tile on board
          this.game.placeTile(sel.tileId, row, col);
          this.selectedTile = null;
          // If the placed tile is a blank needing a letter, show the picker
          if (this.game.isPendingBlank(sel.tileId)) {
            this.save();
            this.render();
            this.showBlankPicker(sel.tileId);
            return;
          }
        }
        this.save();
        this.render();
      }
    });

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
          // Normal rack tile — available for selection
          const isThisSelected = this.selectedTile?.tileId === tile.id && this.selectedTile.source === 'rack';

          slot.textContent = tile.letter || '?';
          if (tile.points > 0) {
            const badge = document.createElement('span');
            badge.className = 'tile-points';
            badge.textContent = String(tile.points);
            slot.appendChild(badge);
          }
          if (tile.letter === '') slot.classList.add('blank-tile');
          slot.dataset.tileId = tile.id;
          if (isThisSelected) {
            slot.classList.add('is-selected');
          }

          // ── Click / Tap handler ──
          slot.addEventListener('click', () => {
            if (this.game.phase !== 'placing') return;
            if (state.swapMode) return;

            if (this.selectedTile?.tileId === tile.id && this.selectedTile.source === 'rack') {
              // Deselect
              this.selectedTile = null;
            } else {
              // Select this rack tile for placing
              this.selectedTile = { tileId: tile.id, source: 'rack' };
            }
            this.render();
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
      const wordsDisplay = preview.words.map((w) => `"${w.word}" (+${w.score})`).join(', ');
      const pendingCount = this.game.getPendingTiles().length;
      const bingoNote = pendingCount >= 7 ? ' 🎉 Bingo!' : '';
      bar.textContent = `${wordsDisplay} → ${preview.totalScore} pts${bingoNote}`;
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
        this.selectedTile = null;
        this.save();
        this.render();
        // Show message after render so it persists on the fresh message element
        this.showMessage(result);
      });
      actions.appendChild(submitBtn);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-secondary';
      clearBtn.textContent = 'Clear All';
      clearBtn.disabled = pendingCount === 0;
      clearBtn.addEventListener('click', () => {
        this.game.clearPending();
        this.selectedTile = null;
        this.save();
        this.render();
      });
      actions.appendChild(clearBtn);

      const undoBtn = document.createElement('button');
      undoBtn.className = 'btn';
      undoBtn.textContent = 'Undo Last';
      undoBtn.disabled = pendingCount === 0;
      undoBtn.addEventListener('click', () => {
        this.game.undoLastPendingTile();
        this.selectedTile = null;
        this.save();
        this.render();
      });
      actions.appendChild(undoBtn);

      const passBtn = document.createElement('button');
      passBtn.className = 'btn';
      passBtn.textContent = 'Pass';
      passBtn.addEventListener('click', () => {
        this.game.passTurn();
        this.selectedTile = null;
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
    }, 6000);
  }

  // ─── Blank Tile Letter Picker ────────────────────────

  private showBlankPicker(tileId: string): void {
    const old = document.getElementById('blank-picker-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'blank-picker-overlay';
    overlay.className = 'blank-picker-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'blank-picker-dialog';

    const title = document.createElement('div');
    title.className = 'blank-picker-title';
    title.textContent = 'Assign Letter';
    dialog.appendChild(title);

    const subtitle = document.createElement('div');
    subtitle.className = 'blank-picker-subtitle';
    subtitle.textContent = 'What letter should this blank tile represent?';
    dialog.appendChild(subtitle);

    const grid = document.createElement('div');
    grid.className = 'blank-picker-grid';

    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      const btn = document.createElement('button');
      btn.className = 'blank-picker-btn';
      btn.textContent = letter;
      btn.addEventListener('click', () => {
        this.game.assignBlankLetter(tileId, letter);
        this.save();
        overlay.remove();
        this.render();
      });
      grid.appendChild(btn);
    }

    dialog.appendChild(grid);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary blank-picker-cancel';
    cancelBtn.textContent = 'Cancel (return tile to rack)';
    cancelBtn.addEventListener('click', () => {
      const pending = this.game.getPendingTiles();
      for (const p of pending) {
        if (p.id === tileId) {
          this.game.removeTile(p.row, p.col);
          break;
        }
      }
      overlay.remove();
      this.save();
      this.render();
    });
    dialog.appendChild(cancelBtn);

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
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
