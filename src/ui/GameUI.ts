import type { GameState, PlacedTile, Tile, WordResult, GamePhase } from '../types.js';
import { Game } from '../game/Game.js';
import { getPremiumType } from '../game/Board.js';

/**
 * Full UI controller for OpenScrabble.
 * Manages DOM rendering, event handling, drag-and-drop, and tap-to-place interaction.
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

  constructor(root: HTMLElement, player1Name?: string, player2Name?: string) {
    this.root = root;
    this.game = new Game(player1Name, player2Name);
    this.render();
  }

  /** Full re-render */
  private render(): void {
    const state = this.game.getState();
    this.root.innerHTML = '';
    this.root.appendChild(this.createGameContainer(state));
  }

  /** Create the full game layout */
  private createGameContainer(state: GameState): HTMLElement {
    const container = document.createElement('div');
    container.className = 'game-container';

    // Header
    container.appendChild(this.createHeader());

    // Score display
    container.appendChild(this.createScoreDisplay(state));

    // Board
    container.appendChild(this.createBoard(state));

    // Actions bar (submit, pass, swap)
    container.appendChild(this.createActionsBar(state));

    // Tile rack
    container.appendChild(this.createRack(state));

    // Message area
    container.appendChild(this.createMessageArea());

    return container;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'game-header';
    header.innerHTML = `<h1>OpenScrabble</h1>
      <button class="btn btn-icon" data-action="reset" title="New Game">↻</button>`;
    header.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      if (confirm('Start a new game?')) {
        this.game = new Game(
          this.game.players[0]!.name,
          this.game.players[1]!.name
        );
        this.render();
      }
    });
    return header;
  }

  private createScoreDisplay(state: GameState): HTMLElement {
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score-display';

    for (let i = 0; i < 2; i++) {
      const player = state.players[i]!;
      const pDiv = document.createElement('div');
      pDiv.className = `player-score ${i === state.currentPlayerIndex ? 'active' : ''}`;
      pDiv.innerHTML = `
        <span class="player-name">${player.name}</span>
        <span class="player-score-value">${player.score}</span>
        <span class="tiles-left">${player.rack.filter((t) => t !== null).length}/7</span>
      `;
      scoreDiv.appendChild(pDiv);
    }

    return scoreDiv;
  }

  private createBoard(state: GameState): HTMLElement {
    const boardContainer = document.createElement('div');
    boardContainer.className = 'board-container';

    const boardEl = document.createElement('div');
    boardEl.className = 'board';

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = this.createCell(r, c, state);
        boardEl.appendChild(cell);
      }
    }

    boardContainer.appendChild(boardEl);

    // Touch/drag event listeners
    this.setupBoardDragHandlers(boardEl);

    return boardContainer;
  }

  private createCell(row: number, col: number, state: GameState): HTMLElement {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.row = String(row);
    cell.dataset.col = String(col);

    const tile = state.board[row]![col];

    // Premium square styling
    const premium = getPremiumType(row, col);
    if (premium && !tile) {
      cell.classList.add(`premium-${premium}`);
      cell.dataset.premium = premium;
      cell.textContent = this.getPremiumLabel(premium);
    }

    // Placed tile
    if (tile) {
      const isPending = this.game.getPendingTiles().some((t) => t.row === row && t.col === col);
      cell.classList.add('has-tile');
      if (isPending) cell.classList.add('pending');
      cell.textContent = tile.playedAs ?? tile.letter;
      cell.dataset.tileId = tile.id;
    }

    // Click to place selected tile
    cell.addEventListener('click', () => {
      if (this.game.phase !== 'placing') return;

      // If clicking on a pending tile, remove it
      if (this.game.getPendingTiles().some((t) => t.row === row && t.col === col)) {
        this.game.removeTile(row, col);
        this.render();
        return;
      }

      // If a tile is selected from rack, place it
      if (this.selectedTileId) {
        if (state.board[row]![col]) return; // occupied
        const success = this.game.placeTile(this.selectedTileId, row, col);
        if (success) {
          this.selectedTileId = null;
          this.render();
        }
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
      if (!tileId) return;
      if (this.game.phase !== 'placing') return;

      const moving = this.game.getPendingTiles().find((t) => t.id === tileId);
      if (moving) {
        this.game.movePendingTile(tileId, row, col);
      } else {
        this.game.placeTile(tileId, row, col);
      }
      this.render();
    });

    return cell;
  }

  /** Setup drag-and-drop from the rack */
  private setupBoardDragHandlers(boardEl: HTMLElement): void {
    // Touch drag for mobile
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
        const row = parseInt(cell.dataset.row!);
        const col = parseInt(cell.dataset.col!);
        if (this.game.getPendingTiles().find((t) => t.id === this.dragTileId)) {
          this.game.movePendingTile(this.dragTileId, row, col);
        } else {
          this.game.placeTile(this.dragTileId, row, col);
        }
      }

      this.dragClone?.remove();
      this.dragClone = null;
      this.dragTileId = null;
      this.render();
    });
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

  private createRack(state: GameState): HTMLElement {
    const rackContainer = document.createElement('div');
    rackContainer.className = 'rack-container';

    const player = state.players[state.currentPlayerIndex]!;
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
        slot.classList.add('has-tile');

        // Swap mode selection
        if (state.swapMode) {
          const isSelected = this.swapSelection.has(tile.id);
          slot.classList.toggle('selected', isSelected);
          slot.textContent = tile.letter || '?';
          slot.addEventListener('click', () => {
            if (this.swapSelection.has(tile.id)) {
              this.swapSelection.delete(tile.id);
            } else {
              this.swapSelection.add(tile.id);
            }
            this.render();
          });
        } else {
          slot.textContent = tile.letter || '?';
          if (tile.letter === '') {
            slot.classList.add('blank-tile');
          }
          slot.dataset.tileId = tile.id;

          // Click to select tile for placement
          slot.addEventListener('click', () => {
            if (this.game.phase !== 'placing') return;
            // If already selected, deselect
            if (this.selectedTileId === tile.id) {
              this.selectedTileId = null;
              this.render();
              return;
            }
            // Remove pending tile if it exists
            const pending = this.game.getPendingTiles().find((t) => t.id === tile.id);
            if (pending) {
              this.game.removeTile(pending.row, pending.col);
              this.selectedTileId = null;
              this.render();
              return;
            }
            this.selectedTileId = tile.id;
            this.render();
          });

          // Drag support
          slot.draggable = true;
          slot.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', tile.id);
            slot.classList.add('dragging');
          });
          slot.addEventListener('dragend', () => {
            slot.classList.remove('dragging');
          });

          // Touch drag support
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
      const submitBtn = document.createElement('button');
      submitBtn.className = 'btn btn-primary';
      submitBtn.textContent = 'Submit Word';
      submitBtn.disabled = this.game.getPendingTiles().length === 0;
      submitBtn.addEventListener('click', () => {
        const result = this.game.submitWord();
        this.showMessage(result);
        this.selectedTileId = null;
        this.render();
      });
      actions.appendChild(submitBtn);

      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn btn-secondary';
      clearBtn.textContent = 'Clear';
      clearBtn.disabled = this.game.getPendingTiles().length === 0;
      clearBtn.addEventListener('click', () => {
        this.game.clearPending();
        this.selectedTileId = null;
        this.render();
      });
      actions.appendChild(clearBtn);

      const passBtn = document.createElement('button');
      passBtn.className = 'btn';
      passBtn.textContent = 'Pass';
      passBtn.addEventListener('click', () => {
        this.game.passTurn();
        this.selectedTileId = null;
        this.render();
      });
      actions.appendChild(passBtn);

      const swapBtn = document.createElement('button');
      swapBtn.className = 'btn';
      swapBtn.textContent = 'Swap';
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
        this.game = new Game(
          this.game.players[0]!.name,
          this.game.players[1]!.name
        );
        this.render();
      });
      actions.appendChild(newGameBtn);
    }

    return actions;
  }

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
      msgEl.textContent = `${wordsText} → +${result.totalScore} pts`;
      msgEl.className = 'message-area success';
    } else {
      msgEl.textContent = result.error ?? 'Invalid move';
      msgEl.className = 'message-area error';
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      msgEl.className = 'message-area';
      msgEl.textContent = '';
    }, 3000);
  }
}
