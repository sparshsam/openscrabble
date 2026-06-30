/**
 * HistoryPage v0.4.1 — real game history from LocalGameStore.
 *
 * Shows:
 *   - Active games (in progress)
 *   - Completed games (finished)
 *   - Abandoned games
 *   - Empty state when no games exist
 */

import { loadAllGames, clearAllGameRecords, updateGameRecord } from '../lib/LocalGameStore.js';
import { GamePersistence } from '../game/Persistence.js';
import { navigate } from '../lib/routes.js';
import { showModal } from './Modal.js';
import type { GameRecord } from '../types.js';

export class HistoryPage {
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'history-page';

    const heading = document.createElement('h2');
    heading.className = 'history-heading';
    heading.textContent = 'Game History';
    page.appendChild(heading);

    const allGames = loadAllGames();

    if (allGames.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'history-empty';
      empty.innerHTML = `
        <div class="empty-state-icon">🎮</div>
        <p class="empty-state-text">No games yet</p>
        <p class="empty-state-hint">Start a new game to see your history here.</p>
      `;
      page.appendChild(empty);
    } else {
      const active = allGames.filter((g) => g.status === 'active');
      const completed = allGames.filter((g) => g.status === 'completed');
      const abandoned = allGames.filter((g) => g.status === 'abandoned');

      if (active.length > 0) {
        page.appendChild(this.createSection('Active Games', active));
      }
      if (completed.length > 0) {
        page.appendChild(this.createSection('Completed', completed));
      }
      if (abandoned.length > 0) {
        page.appendChild(this.createSection('Abandoned', abandoned));
      }

      // Clear all
      const clearBtn = document.createElement('button');
      clearBtn.className = 'btn history-clear-btn';
      clearBtn.textContent = 'Clear All History';
      clearBtn.addEventListener('click', () => {
        showModal(
          'Clear History',
          'Remove all game history? This cannot be undone.',
          'Clear All',
          () => {
            clearAllGameRecords();
            this.render();
          }
        );
      });
      page.appendChild(clearBtn);
    }

    return page;
  }

  private createSection(title: string, games: GameRecord[]): HTMLElement {
    const section = document.createElement('div');
    section.className = 'history-section';

    const sectionTitle = document.createElement('div');
    sectionTitle.className = 'history-section-title';
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    const list = document.createElement('div');
    list.className = 'history-list';

    for (const game of games) {
      const item = document.createElement('div');
      item.className = 'history-item';

      const dateStr = new Date(game.lastPlayedDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      let resultBadge = '';
      if (game.status === 'active') {
        resultBadge = '<span class="history-badge history-badge-active">In Progress</span>';
      } else if (game.isTie) {
        resultBadge = '<span class="history-badge history-badge-tie">Tie</span>';
      } else if (game.winner) {
        resultBadge = `<span class="history-badge history-badge-winner">${this.escHtml(game.winner)} won</span>`;
      }

      item.innerHTML = `
        <div class="history-item-top">
          <span class="history-players">${this.escHtml(game.players.join(' vs '))}</span>
          ${resultBadge}
        </div>
        <div class="history-item-details">
          <span class="history-scores">${game.scores.join(' – ')}</span>
          <span class="history-turns">${game.totalTurns} turn${game.totalTurns !== 1 ? 's' : ''}</span>
        </div>
        <div class="history-item-footer">
          <span class="history-date">${dateStr}</span>
          ${game.bestWord ? `<span class="history-best-word">Best: ${this.escHtml(game.bestWord)} (${game.bestWordScore})</span>` : ''}
        </div>
      `;

      // Click to continue (for active games)
      if (game.status === 'active') {
        item.classList.add('history-item-clickable');
        item.addEventListener('click', () => {
          // Try loading the save
          const saveKey = game.saveKey || 'openscrabble_save';
          const saveData = localStorage.getItem(saveKey);
          if (saveData) {
            navigate('game', { saved: true, gameId: game.id });
          } else {
            // Save was lost — mark as abandoned
            updateGameRecord(game.id, { status: 'abandoned', completedDate: new Date().toISOString() });
            this.render();
          }
        });
      }

      list.appendChild(item);
    }

    section.appendChild(list);
    return section;
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
