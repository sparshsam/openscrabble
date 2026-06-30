import type { GameState, PlacedTile, Tile, WordResult } from '../types.js';
import { Game } from '../game/Game.js';
import { GamePersistence } from '../game/Persistence.js';
import { getPremiumType } from '../game/Board.js';
import { type WordDefinition, fetchDefinition } from '../game/WordDefinitions.js';
import { WordValidator } from '../game/WordValidator.js';
import { resignGame, finalizeGame, removeGameRecord } from '../lib/LocalGameStore.js';
import { navigate } from '../lib/routes.js';

/**
 * Add a hold/long-press listener to an element.
 * Fires the callback when the element is held for 500ms.
 */
function addHoldListener(el: HTMLElement, callback: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let triggered = false;

  el.addEventListener('pointerdown', () => {
    triggered = false;
    timer = setTimeout(() => {
      triggered = true;
      callback();
    }, 500);
  });

  el.addEventListener('pointerup', () => {
    if (timer) clearTimeout(timer);
  });

  el.addEventListener('pointerleave', () => {
    if (timer) clearTimeout(timer);
  });

  el.addEventListener('pointercancel', () => {
    if (timer) clearTimeout(timer);
  });
}

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
  private gameId: string | null = null;
  private selectedTile: Selection | null = null;
  private swapSelection: Set<string> = new Set();
  private onBackToHome: (() => void) | null = null;
  private onAutoSave: ((scores: number[], turnNumber: number) => void) | null = null;

  constructor(
    root: HTMLElement,
    game?: Game,
    onBackToHome?: () => void,
    onAutoSave?: (scores: number[], turnNumber: number) => void,
    gameId?: string
  ) {
    this.root = root;
    this.game = game ?? new Game();
    this.gameId = gameId ?? null;
    this.onBackToHome = onBackToHome ?? null;
    this.onAutoSave = onAutoSave ?? null;
    try {
      this.render();
    } catch (e) {
      console.error('[GameUI] render failed:', e);
      showGameError(root, 'Failed to render game board. Please try starting a new game.');
    }
  }

  private save(): void {
    if (this.gameId) {
      GamePersistence.save(this.game, this.gameId);
    } else {
      GamePersistence.save(this.game);
    }
    if (this.onAutoSave) {
      const state = this.game.getState();
      this.onAutoSave(
        state.players.map((p) => p.score),
        state.turnNumber
      );
    }
  }

  private render(): void {
    // Clean up any leftover blank picker overlay
    const oldPicker = document.getElementById('blank-picker-overlay');
    if (oldPicker) oldPicker.remove();
    const state = this.game.getState();
    this.root.innerHTML = '';
    this.root.appendChild(this.createGameContainer(state));

    // Auto-scroll board into view when tiles are placed
    const pendingCount = this.game.getPendingTiles().length;
    if (pendingCount > 0) {
      const boardEl = this.root.querySelector('.board-container');
      if (boardEl) {
        setTimeout(() => {
          boardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
      }
    }
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
    container.appendChild(this.createMessageArea());

    container.appendChild(this.createRack(state));
    container.appendChild(this.createActionsBar(state));
    container.appendChild(this.createLastMoveSummary());

    return container;
  }

  // ─── In-App Modal ────────────────────────────────────

  private showConfirmModal(
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void
  ): void {
    // Remove any existing modal
    const old = document.getElementById('app-modal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'app-modal';
    overlay.className = 'app-modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'app-modal-dialog';

    const titleEl = document.createElement('div');
    titleEl.className = 'app-modal-title';
    titleEl.textContent = title;

    const textEl = document.createElement('div');
    textEl.className = 'app-modal-text';
    textEl.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'app-modal-actions';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => overlay.remove());

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-primary';
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });

    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);
    dialog.appendChild(titleEl);
    dialog.appendChild(textEl);
    dialog.appendChild(actions);
    overlay.appendChild(dialog);

    // Click overlay background to dismiss
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    document.body.appendChild(overlay);

    // Focus the cancel button
    cancelBtn.focus();
  }

  // ─── Header ──────────────────────────────────────────

  private createHeader(state: GameState): HTMLElement {
    const header = document.createElement('header');
    header.className = 'game-header';

    const title = document.createElement('span');
    title.className = 'game-header-title';
    title.textContent = 'OpenScrabble';
    title.addEventListener('click', () => {
      this.save();
      this.onBackToHome?.();
    });

    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'header-actions';

    const turnSpan = document.createElement('span');
    turnSpan.className = 'turn-indicator';
    turnSpan.textContent = `Turn ${state.turnNumber}`;
    actions.appendChild(turnSpan);

    // Reset (new game) — uses app modal, no browser confirm
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn btn-icon';
    resetBtn.textContent = '↻';
    resetBtn.title = 'New Game';
    resetBtn.addEventListener('click', () => {
      this.showConfirmModal(
        'New Game',
        'Start a new game? Your current game will be lost.',
        'New Game',
        () => {
          GamePersistence.clear();
          this.game = new Game(
            this.game.players[0]!.name,
            this.game.players[1]!.name
          );
          this.selectedTile = null;
          this.render();
        }
      );
    });
    actions.appendChild(resetBtn);

    // Home — saves silently, no warning needed
    const homeBtn = document.createElement('button');
    homeBtn.className = 'btn btn-icon';
    homeBtn.textContent = '⌂';
    homeBtn.title = 'Home';
    homeBtn.addEventListener('click', () => {
      this.save();
      this.onBackToHome?.();
    });
    actions.appendChild(homeBtn);

    header.appendChild(actions);
    return header;
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
    if (premium && !(row === 7 && col === 7)) {
      cell.classList.add(`premium-${premium}`);
      cell.dataset.premium = premium;
      if (!tile) {
        cell.textContent = this.getPremiumLabel(premium);
      }
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

      // Premium badge on tile (bottom-left)
      if (premium) {
        const premiumBadge = document.createElement('span');
        premiumBadge.className = 'tile-premium';
        premiumBadge.textContent = this.getPremiumLabel(premium);
        cell.appendChild(premiumBadge);
      }

      // Point badge (bottom-right)
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

  private createLastMoveSummary(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'last-move-summary';

    const records = this.game.moveRecords;
    if (records.length === 0) {
      container.style.display = 'none';
      return container;
    }

    const last = records[records.length - 1]!;
    const words = last.words.map((w) =>
      `<span class="last-move-word" data-word="${w.word}">"${w.word}" (+${w.score})</span>`
    ).join(' + ');

    container.innerHTML = `
      <span class="last-move-label">Last Move</span>
      <span class="last-move-detail">${words} → <strong>+${last.totalScore}</strong></span>
    `;

    // Make words tappable for definitions
    container.querySelectorAll('.last-move-word').forEach((el) => {
      const word = (el as HTMLElement).dataset.word!;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showWordDetails(word);
      });
    });

    return container;
  }

  private createRack(state: GameState): HTMLElement {
    const rackContainer = document.createElement('div');
    rackContainer.className = 'rack-container';

    const player = state.players[state.currentPlayerIndex]!;
    const pendingTileIds = new Set(this.game.getPendingTiles().map((t) => t.id));
    const hasPending = this.game.getPendingTiles().length > 0;

    // ── Rack Header ──
    const rackHeader = document.createElement('div');
    rackHeader.className = 'rack-header';

    const label = document.createElement('div');
    label.className = 'rack-label';
    label.textContent = `${player.name}'s Rack`;
    rackHeader.appendChild(label);

    // Clear All button inside rack (only visible when tiles are placed)
    if (hasPending) {
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn rack-clear-btn';
      clearBtn.innerHTML = '✕ Clear';
      clearBtn.title = 'Return all pending tiles to rack';
      clearBtn.addEventListener('click', () => {
        this.game.clearPending();
        this.selectedTile = null;
        this.save();
        this.render();
      });
      rackHeader.appendChild(clearBtn);
    }

    // Bag info + toggle
    const bagInfo = document.createElement('button');
    bagInfo.className = 'btn rack-bag-info';
    bagInfo.innerHTML = `<span class="bag-dot">●</span> ${state.bag.length}`;
    bagInfo.title = 'Show remaining tiles';
    bagInfo.addEventListener('click', () => {
      bagView.classList.toggle('open');
    });
    rackHeader.appendChild(bagInfo);

    rackContainer.appendChild(rackHeader);

    // ── Rack Tiles ──
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

    // ── Bag View (collapsible) ──
    const bagView = document.createElement('div');
    bagView.className = 'bag-view';
    bagView.id = 'bag-view-panel';

    const cats = this.game.bag.getLetterCategoryCounts();
    const counts = this.game.bag.getRemainingLetterCounts();

    // Category row
    const catRow = document.createElement('div');
    catRow.className = 'bag-category-row';
    catRow.innerHTML = `
      <span class="bag-cat"><span class="bag-cat-dot bag-vowel">●</span> Vowels ${cats.vowels}</span>
      <span class="bag-cat"><span class="bag-cat-dot bag-consonant">●</span> Consonants ${cats.consonants}</span>
      <span class="bag-cat"><span class="bag-cat-dot bag-blank">●</span> Blanks ${cats.blanks}</span>
    `;
    bagView.appendChild(catRow);

    // Letter grid
    const letterGrid = document.createElement('div');
    letterGrid.className = 'bag-letter-grid';
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (const ch of letters) {
      const remaining = counts.get(ch) || 0;
      const cell = document.createElement('span');
      cell.className = `bag-letter-cell${remaining === 0 ? ' bag-letter-empty' : ''}`;
      cell.innerHTML = `${ch}<span class="bag-letter-count">${remaining}</span>`;
      letterGrid.appendChild(cell);
    }
    bagView.appendChild(letterGrid);

    rackContainer.appendChild(bagView);
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
      const wordSpans = preview.words.map((w) => {
        const span = document.createElement('span');
        span.className = 'preview-word';
        span.textContent = `"${w.word}" (+${w.score})`;
        span.addEventListener('click', () => this.showWordDetails(w.word));
        // Long-press / tap-hold
        addHoldListener(span, () => this.showWordDetails(w.word));
        return span;
      });
      for (let i = 0; i < wordSpans.length; i++) {
        if (i > 0) bar.appendChild(document.createTextNode(', '));
        bar.appendChild(wordSpans[i]!);
      }
      const pendingCount = this.game.getPendingTiles().length;
      const bingoNote = pendingCount >= 7 ? ' 🎉 Bingo!' : '';
      const totalSpan = document.createElement('span');
      totalSpan.textContent = ` → ${preview.totalScore} pts${bingoNote}`;
      bar.appendChild(totalSpan);
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

      // ── Redesigned Submit Button ──
      const submitWrapper = document.createElement('div');
      submitWrapper.className = 'submit-wrapper';

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-submit';
      submitBtn.disabled = pendingCount === 0 || isMoveInvalid;
      if (pendingCount > 0 && !isMoveInvalid) {
        submitBtn.innerHTML = `<span class="submit-icon">✓</span><span class="submit-label">Submit Word</span><span class="submit-score">${preview!.totalScore} pts</span>`;
      } else if (isMoveInvalid) {
        submitBtn.innerHTML = `<span class="submit-icon">✕</span><span class="submit-label">Fix Word</span>`;
        submitBtn.title = preview?.error ?? 'Fix the word before submitting';
      } else {
        submitBtn.innerHTML = `<span class="submit-icon">▸</span><span class="submit-label">Place tiles</span>`;
      }
      submitBtn.addEventListener('click', () => {
        const result = this.game.submitWord();
        this.selectedTile = null;
        this.save();
        this.render();
        this.showMessage(result);
      });
      submitWrapper.appendChild(submitBtn);
      actions.appendChild(submitWrapper);

      // ── More Actions Drawer ──
      const moreContainer = document.createElement('div');
      moreContainer.className = 'more-actions-container';

      const moreToggle = document.createElement('button');
      moreToggle.className = 'btn btn-more-toggle';
      moreToggle.textContent = '··· More';
      moreToggle.addEventListener('click', () => {
        moreDrawer.classList.toggle('open');
        moreToggle.classList.toggle('open');
      });
      moreContainer.appendChild(moreToggle);

      const moreDrawer = document.createElement('div');
      moreDrawer.className = 'more-actions-drawer';

      // Undo Last
      const undoBtn = document.createElement('button');
      undoBtn.className = 'btn btn-drawer';
      undoBtn.textContent = 'Undo Last';
      undoBtn.disabled = pendingCount === 0;
      undoBtn.addEventListener('click', () => {
        this.game.undoLastPendingTile();
        this.selectedTile = null;
        this.save();
        this.render();
      });
      moreDrawer.appendChild(undoBtn);

      // Pass
      const passBtn = document.createElement('button');
      passBtn.className = 'btn btn-drawer';
      passBtn.textContent = 'Pass';
      passBtn.addEventListener('click', () => {
        this.game.passTurn();
        this.selectedTile = null;
        this.save();
        this.render();
        moreDrawer.classList.remove('open');
        moreToggle.classList.remove('open');
      });
      moreDrawer.appendChild(passBtn);

      // Swap
      const swapBtn = document.createElement('button');
      swapBtn.className = 'btn btn-drawer';
      swapBtn.textContent = 'Swap';
      swapBtn.disabled = state.bag.length === 0;
      swapBtn.addEventListener('click', () => {
        this.game.enterSwapMode();
        this.render();
        moreDrawer.classList.remove('open');
        moreToggle.classList.remove('open');
      });
      moreDrawer.appendChild(swapBtn);

      // Undo Move
      const canUndo = state.moveHistory.length > 0 && pendingCount === 0;
      const undoMoveBtn = document.createElement('button');
      undoMoveBtn.className = 'btn btn-drawer';
      undoMoveBtn.textContent = 'Undo Move';
      undoMoveBtn.disabled = !canUndo;
      undoMoveBtn.title = canUndo ? 'Undo last submitted move' : pendingCount > 0 ? 'Clear pending tiles first' : '';
      undoMoveBtn.addEventListener('click', () => {
        this.showConfirmModal(
          'Undo Move',
          'Undo the last submitted move? This will restore the board to before it was played.',
          'Undo',
          () => {
            this.game.undoMove();
            this.selectedTile = null;
            this.save();
            this.render();
            moreDrawer.classList.remove('open');
            moreToggle.classList.remove('open');
          }
        );
      });
      moreDrawer.appendChild(undoMoveBtn);

      // Move History
      if (state.moveHistory.length > 0) {
        const historyBtn = document.createElement('button');
        historyBtn.className = 'btn btn-drawer';
        historyBtn.textContent = `History (${state.moveHistory.length})`;
        historyBtn.addEventListener('click', () => {
          this.showMoveHistory();
          moreDrawer.classList.remove('open');
          moreToggle.classList.remove('open');
        });
        moreDrawer.appendChild(historyBtn);
      }

      // Resign / Quit
      const hasMoves = this.game.moveRecords.length > 0;
      const resignBtn = document.createElement('button');
      resignBtn.className = 'btn btn-drawer btn-drawer-danger';
      resignBtn.textContent = hasMoves ? 'Resign' : 'Quit Game';
      resignBtn.title = hasMoves
        ? 'Forfeit this game — opponent wins'
        : 'Remove this game — no moves recorded, no penalty';
      resignBtn.addEventListener('click', () => {
        this.confirmQuit(hasMoves);
        moreDrawer.classList.remove('open');
        moreToggle.classList.remove('open');
      });
      moreDrawer.appendChild(resignBtn);

      moreContainer.appendChild(moreDrawer);
      actions.appendChild(moreContainer);

    } else if (state.phase === 'gameover') {
      const summary = this.game.getSummary();
      const winner = summary.winner;

      // ── Result Screen Container ──
      const resultScreen = document.createElement('div');
      resultScreen.className = 'game-result-screen';
      actions.appendChild(resultScreen);

      // ── Winner Card ──
      const winnerCard = document.createElement('div');
      winnerCard.className = 'result-winner-card';
      if (winner) {
        winnerCard.innerHTML = `
          <div class="result-crown">👑</div>
          <div class="result-winner-name">${this.esc(winner.name)}</div>
          <div class="result-winner-score">${winner.score} pts</div>
          <div class="result-subtitle">Winner</div>
        `;
      } else {
        winnerCard.innerHTML = `
          <div class="result-crown">🤝</div>
          <div class="result-winner-name">Tie Game</div>
          <div class="result-winner-score">${summary.finalScores[0]} – ${summary.finalScores[1]}</div>
          <div class="result-subtitle">Nobody wins</div>
        `;
      }
      resultScreen.appendChild(winnerCard);

      // ── End Reason Badge ──
      const endReasonText = this.game.endReason === 'resign'
        ? `Resigned — ${state.players[state.currentPlayerIndex]!.name} resigned`
        : 'Game completed';
      const reasonBadge = document.createElement('div');
      reasonBadge.className = 'result-end-reason';
      reasonBadge.textContent = endReasonText;
      resultScreen.appendChild(reasonBadge);

      // ── Final Scores ──
      const scoresSection = document.createElement('div');
      scoresSection.className = 'result-scores-section';
      scoresSection.innerHTML = `
        <div class="result-section-title">Final Scores</div>
        <div class="result-score-row">
          <span class="result-score-name">${this.esc(state.players[0]!.name)}</span>
          <span class="result-score-value">${summary.finalScores[0]}</span>
        </div>
        <div class="result-score-row">
          <span class="result-score-name">${this.esc(state.players[1]!.name)}</span>
          <span class="result-score-value">${summary.finalScores[1]}</span>
        </div>
      `;
      resultScreen.appendChild(scoresSection);

      // ── Game Stats ──
      const statsSection = document.createElement('div');
      statsSection.className = 'result-stats-section';
      statsSection.innerHTML = `
        <div class="result-stat-row">
          <span>Total Turns</span><span>${summary.totalTurns}</span>
        </div>
        <div class="result-stat-row">
          <span>Best Word</span><span>${summary.bestWord ? `"${summary.bestWord.word}" (${summary.bestWord.score})` : '—'}</span>
        </div>
      `;
      resultScreen.appendChild(statsSection);

      // ── Actions ──
      const resultActions = document.createElement('div');
      resultActions.className = 'result-actions';

      const rematchBtn = document.createElement('button');
      rematchBtn.className = 'btn btn-primary result-btn';
      rematchBtn.textContent = '🔄 Rematch';
      rematchBtn.addEventListener('click', () => {
        GamePersistence.clear();
        if (this.gameId) {
          const s = this.game.getState();
          const scores = s.players.map((p) => p.score);
          const bestWord = this.game.getSummary().bestWord;
          finalizeGame(this.gameId, scores, winner?.name ?? null, !winner, s.turnNumber, bestWord?.word ?? null, bestWord?.score ?? 0, s.turnNumber, 0);
        }
        this.game = new Game(
          this.game.players[0]!.name,
          this.game.players[1]!.name
        );
        this.game.endReason = 'normal';
        this.render();
      });
      resultActions.appendChild(rematchBtn);

      const hubBtn = document.createElement('button');
      hubBtn.className = 'btn result-btn';
      hubBtn.textContent = '🏠 Home';
      hubBtn.addEventListener('click', () => {
        GamePersistence.clear();
        if (this.gameId) {
          const s = this.game.getState();
          const scores = s.players.map((p) => p.score);
          const bestWord = this.game.getSummary().bestWord;
          finalizeGame(this.gameId, scores, winner?.name ?? null, !winner, s.turnNumber, bestWord?.word ?? null, bestWord?.score ?? 0, s.turnNumber, 0);
        }
        this.onBackToHome?.();
      });
      resultActions.appendChild(hubBtn);

      // Show Full History button
      if (summary.moveHistory.length > 0) {
        const historyBtn = document.createElement('button');
        historyBtn.className = 'btn result-btn result-btn-secondary';
        historyBtn.textContent = `📋 Full History (${summary.moveHistory.length})`;
        historyBtn.addEventListener('click', () => {
          this.showMoveHistory();
        });
        resultActions.appendChild(historyBtn);
      }

      resultScreen.appendChild(resultActions);
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
      msgEl.innerHTML = `${wordsText} → +${result.totalScore} pts${bingoNote}`;
      msgEl.className = 'message-area success';
    } else {
      const errorText = result.error ?? 'Invalid move';
      // Add dictionary source context to error
      msgEl.innerHTML = `✕ ${errorText} <span class="msg-dict-source">(Collins UK-style)</span>`;
      msgEl.className = 'message-area error';
    }

    setTimeout(() => {
      msgEl.className = 'message-area';
      msgEl.innerHTML = '';
    }, 6000);
  }

  // ─── Word Details ────────────────────────────────────

  private showWordDetails(word: string): void {
    // Remove existing word details overlay
    const old = document.getElementById('word-details-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'word-details-overlay';
    overlay.className = 'blank-picker-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'blank-picker-dialog';
    dialog.style.textAlign = 'left';

    const title = document.createElement('div');
    title.className = 'blank-picker-title';
    title.textContent = word.toUpperCase();
    dialog.appendChild(title);

    const isValid = WordValidator.isValid(word);
    const validBadge = document.createElement('div');
    validBadge.style.cssText = `display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;margin:4px 0 10px;${
      isValid ? 'color:#2d7a3a;background:#e4f3e4' : 'color:#b32d2d;background:#fce8e8'
    }`;
    validBadge.textContent = isValid ? '✓ Valid word' : '✕ Not in dictionary';
    dialog.appendChild(validBadge);

    // Dictionary source
    const sourceLabel = document.createElement('div');
    sourceLabel.style.cssText = 'font-size:0.65rem;color:var(--text-tertiary);margin-bottom:10px;';
    sourceLabel.textContent = 'Dictionary: Collins UK-style';
    dialog.appendChild(sourceLabel);

    const content = document.createElement('div');
    content.className = 'blank-picker-subtitle';
    content.style.cssText = 'margin-bottom:0;';

    if (isValid) {
      content.textContent = 'Loading definition…';
      dialog.appendChild(content);

      fetchDefinition(word).then((def) => {
        if (!def || def.meanings.length === 0) {
          content.textContent = 'Definition not available for this word.';
          return;
        }
        content.innerHTML = '';
        for (const m of def.meanings) {
          const item = document.createElement('div');
          item.style.cssText = 'margin-bottom:8px;font-size:0.82rem;line-height:1.4;';
          const pos = document.createElement('span');
          pos.style.cssText = 'font-weight:600;color:var(--accent);font-size:0.7rem;text-transform:uppercase;';
          pos.textContent = m.partOfSpeech;
          item.appendChild(pos);
          const defText = document.createElement('div');
          defText.textContent = m.definition;
          item.appendChild(defText);
          if (m.example) {
            const ex = document.createElement('div');
            ex.style.cssText = 'font-style:italic;color:var(--text-tertiary);font-size:0.75rem;margin-top:2px;';
            ex.textContent = `"${m.example}"`;
            item.appendChild(ex);
          }
          content.appendChild(item);
        }
      });
    } else {
      content.textContent = 'This word is not in the dictionary. Check spelling or try a different word.';
      dialog.appendChild(content);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary blank-picker-cancel';
    closeBtn.style.marginTop = '14px';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => overlay.remove());
    dialog.appendChild(closeBtn);

    overlay.appendChild(dialog);
    // Click overlay background to close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  // ─── Move History ───────────────────────────────────

  private showMoveHistory(): void {
    const old = document.getElementById('word-details-overlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'word-details-overlay';
    overlay.className = 'blank-picker-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'blank-picker-dialog';
    dialog.style.cssText = 'text-align:left;max-width:380px;max-height:80dvh;overflow-y:auto;';

    const title = document.createElement('div');
    title.className = 'blank-picker-title';
    title.textContent = 'Move History';
    dialog.appendChild(title);

    const records = this.game.moveRecords;
    if (records.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'blank-picker-subtitle';
      empty.textContent = 'No moves yet.';
      dialog.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'history-modal-list';

      for (const rec of records) {
        const item = document.createElement('div');
        item.className = 'history-list-item';

        const header = document.createElement('div');
        header.className = 'history-item-header';
        header.innerHTML = `<span class="history-item-turn">T${rec.turnNumber} · ${this.esc(rec.playerName)}</span><span class="history-item-score">${rec.totalScore > 0 ? '+' : ''}${rec.totalScore}</span>`;
        item.appendChild(header);

        if (rec.words.length > 0) {
          const wordsDiv = document.createElement('div');
          wordsDiv.className = 'history-item-words';
          for (const w of rec.words) {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'history-item-word';
            wordSpan.textContent = `"${w.word}" (+${w.score})`;
            wordSpan.addEventListener('click', () => this.showWordDetails(w.word));
            wordsDiv.appendChild(wordSpan);
          }
          item.appendChild(wordsDiv);
        } else {
          const desc = document.createElement('div');
          desc.className = 'history-item-desc';
          desc.textContent = rec.moveDescription;
          item.appendChild(desc);
        }

        const cumScore = document.createElement('div');
        cumScore.className = 'history-item-total';
        cumScore.textContent = `Total: ${rec.cumulativeScore} pts`;
        item.appendChild(cumScore);

        list.appendChild(item);
      }
      dialog.appendChild(list);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn btn-secondary blank-picker-cancel';
    closeBtn.style.marginTop = '10px';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => overlay.remove());
    dialog.appendChild(closeBtn);

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
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

  private confirmQuit(hasMoves: boolean): void {
    const state = this.game.getState();
    const playerName = state.players[state.currentPlayerIndex]!.name;

    if (hasMoves) {
      // Resign — opponent wins
      this.showConfirmModal(
        'Resign Game',
        `${playerName}, are you sure you want to resign? The other player will win.`,
        'Resign',
        () => {
          this.game.endReason = 'resign';
          this.save();
          if (this.gameId) {
            const s = this.game.getState();
            resignGame(
              this.gameId,
              s.players.map((p) => p.score),
              s.turnNumber,
              s.currentPlayerIndex,
              s.players.map((p) => p.name)
            );
          }
          navigate('hub');
        }
      );
    } else {
      // Quit — no moves made, just delete the record
      this.showConfirmModal(
        'Quit Game',
        `${playerName}, quit this game? No moves have been made — no loss recorded.`,
        'Quit',
        () => {
          if (this.gameId) {
            // Remove the game record entirely
            removeGameRecord(this.gameId);
            // Also remove any save data
            GamePersistence.clear(this.gameId);
          }
          navigate('hub');
        }
      );
    }
  }

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

/**
 * showGameError — dev-facing visible error panel.
 * Renders inside the given root element with a clear error message and retry link.
 */
function showGameError(root: HTMLElement, message: string): void {
  root.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'game-error-panel';
  container.innerHTML = `
    <div class="game-error-icon">⚠️</div>
    <h2 class="game-error-title">Something went wrong</h2>
    <p class="game-error-message">${message}</p>
    <button class="btn btn-primary" onclick="window.location.hash='#hub'">Back to Hub</button>
  `;
  root.appendChild(container);
}
