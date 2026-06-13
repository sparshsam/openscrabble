import type { GameState, PlacedTile, Tile, WordResult } from '../types.js';
import { Game } from '../game/Game.js';
import { GamePersistence } from '../game/Persistence.js';
import { getPremiumType } from '../game/Board.js';

/**
 * GameUI — renders the full game screen with live feedback,
 * tile scores, validation preview, and mobile-first layout.
 * Automatically saves state to localStorage after every action.
 */
export class GameUI {
  private game: Game;
  private root: HTMLElement;
  private selectedTileId: string | null = null;
  private dragTileId: string | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private dragClone: HTMLElement | null = null;
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
    this.setupBoardDragHandlers(boardEl);

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

    // Click events — tap-to-place and tap-to-move
    cell.addEventListener('click', () => {
      if (this.game.phase !== 'placing') return;

      if (isPending) {
        // Tapping a pending tile: if it's already selected, remove it back to rack
        // Otherwise, select it so next tap moves it
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

    // Drag events
    cell.addEventListener('dragover', (e) => {
      e.preventDefault();
      cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => {
      cell.classList.remove('drag-over');
    });
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      const tileId = e.dataTransfer?.getData('text/plain') || this.dragTileId;
      if (!tileId || this.game.phase !== 'placing') return;

      const moving = this.game.getPendingTiles().find((t) => t.id === tileId);
      if (moving) {
        this.game.movePendingTile(tileId, row, col);
      } else {
        this.game.placeTile(tileId, row, col);
      }
      this.save();
      this.render();
    });

    return cell;
  }

  private setupBoardDragHandlers(boardEl: HTMLElement): void {
    boardEl.addEventListener('touchmove', (e: Event) => {
      const touch = (e as TouchEvent).touches[0];
      if (!touch || !this.dragClone) return;
      this.dragClone.style.left = `${touch.clientX - this.dragOffsetX}px`;
      this.dragClone.style.top = `${touch.clientY - this.dragOffsetY}px`;
    }, { passive: true });

    boardEl.addEventListener('touchend', (e: Event) => {
      if (!this.dragTileId) return;
      const touch = (e as TouchEvent).changedTouches[0];
      if (!touch) return;

      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      const cell = target?.closest('.cell') as HTMLElement;
      if (cell) {
        const r = parseInt(cell.dataset.row!);
        const c = parseInt(cell.dataset.col!);
        if (this.game.getPendingTiles().find((t) => t.id === this.dragTileId)) {
          this.game.movePendingTile(this.dragTileId, r, c);
        } else {
          this.game.placeTile(this.dragTileId, r, c);
        }
      }

      this.dragClone?.remove();
      this.dragClone = null;
      this.dragTileId = null;
      this.save();
      this.render();
    });
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

          slot.addEventListener('click', () => {
            if (this.game.phase !== 'placing') return;
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

          slot.draggable = true;
          slot.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', tile.id);
            slot.classList.add('dragging');
          });
          slot.addEventListener('dragend', () => slot.classList.remove('dragging'));

          slot.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            if (!touch) return;
            this.dragTileId = tile.id;
            const rect = slot.getBoundingClientRect();
            this.dragOffsetX = touch.clientX - rect.left;
            this.dragOffsetY = touch.clientY - rect.top;
            this.dragClone = slot.cloneNode(true) as HTMLElement;
            this.dragClone.className = 'tile-drag-clone';
            this.dragClone.style.position = 'fixed';
            this.dragClone.style.left = `${touch.clientX - this.dragOffsetX}px`;
            this.dragClone.style.top = `${touch.clientY - this.dragOffsetY}px`;
            this.dragClone.style.width = `${rect.width}px`;
            this.dragClone.style.height = `${rect.height}px`;
            this.dragClone.style.zIndex = '1000';
            this.dragClone.style.pointerEvents = 'none';
            this.dragClone.textContent = tile.letter || '?';
            document.body.appendChild(this.dragClone);
          }, { passive: true });
        }
      } else {
        slot.classList.add('empty');
      }

      rack.appendChild(slot);
    }

    rackContainer.appendChild(rack);
    return rackContainer;
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

      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary';
      submitBtn.textContent = 'Submit Word';
      submitBtn.disabled = pendingCount === 0;
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
