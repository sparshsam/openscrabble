/**
 * HubPage v0.4.2 — multi-game hub.
 *
 * Shows:
 *   - Welcome header
 *   - New Game button
 *   - Running Games list (active games)
 *   - Recent Completed Games
 *   - Quick links
 */

import { getCurrentUser } from '../auth/AuthService.js';
import { navigate } from '../lib/routes.js';
import { loadAllGames, getActiveGames } from '../lib/LocalGameStore.js';

export class HubPage {
  private root: HTMLElement;
  private onNewGame: () => void;
  private onResumeGame: (gameId: string) => void;

  constructor(
    root: HTMLElement,
    onNewGame: () => void,
    onResumeGame: (gameId: string) => void
  ) {
    this.root = root;
    this.onNewGame = onNewGame;
    this.onResumeGame = onResumeGame;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'hub-page';

    page.appendChild(this.createHeader());
    page.appendChild(this.createNewGameButton());
    const runningGames = this.createRunningGames();
    if (runningGames) page.appendChild(runningGames);
    const recentCompleted = this.createRecentCompleted();
    if (recentCompleted) page.appendChild(recentCompleted);
    page.appendChild(this.createQuickLinks());

    return page;
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div');
    header.className = 'hub-header';

    const user = getCurrentUser();
    const name = user?.username || 'Player';
    const allGames = loadAllGames();
    const completed = allGames.filter((g) => g.status === 'completed');

    header.innerHTML = `
      <h1 class="hub-title">OpenScrabble</h1>
      <p class="hub-subtitle">Welcome back, ${this.escHtml(name)}</p>
      <p class="hub-meta">${completed.length} game${completed.length !== 1 ? 's' : ''} played</p>
    `;

    return header;
  }

  private createNewGameButton(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'hub-actions';

    const btn = document.createElement('button');
    btn.className = 'btn hub-new-game-btn';
    btn.innerHTML = '🎮 New Game';
    btn.addEventListener('click', () => this.onNewGame());
    section.appendChild(btn);

    return section;
  }

  private createRunningGames(): HTMLElement | null {
    const active = getActiveGames();
    if (active.length === 0) return null;

    const section = document.createElement('div');
    section.className = 'hub-section';

    const heading = document.createElement('div');
    heading.className = 'hub-section-title';
    heading.textContent = 'Running Games';
    section.appendChild(heading);

    for (const game of active) {
      const item = document.createElement('div');
      item.className = 'hub-running-item';
      const dateStr = new Date(game.lastPlayedDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      item.innerHTML = `
        <div class="hub-running-info">
          <span class="hub-running-players">${this.escHtml(game.players.join(' vs '))}</span>
          <span class="hub-running-meta">Turn ${game.totalTurns + 1} · ${dateStr}</span>
        </div>
        <span class="hub-running-arrow">▶</span>
      `;
      item.addEventListener('click', () => {
        this.onResumeGame(game.id);
      });
      section.appendChild(item);
    }

    return section;
  }

  private createRecentCompleted(): HTMLElement | null {
    const allGames = loadAllGames();
    const completed = allGames.filter((g) => g.status === 'completed' || g.status === 'abandoned');
    if (completed.length === 0) return null;

    const section = document.createElement('div');
    section.className = 'hub-section';

    const heading = document.createElement('div');
    heading.className = 'hub-section-title';
    heading.textContent = 'Recent Games';
    section.appendChild(heading);

    const maxShow = Math.min(3, completed.length);
    for (let i = 0; i < maxShow; i++) {
      const game = completed[i]!;
      const dateStr = new Date(game.lastPlayedDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      let resultText = '';
      if (game.isTie) resultText = 'Tie';
      else if (game.winner) resultText = `${this.escHtml(game.winner)} won`;
      else resultText = `${game.scores.join('–')}`;

      const item = document.createElement('div');
      item.className = 'hub-recent-item';
      item.innerHTML = `
        <div class="hub-recent-info">
          <span class="hub-recent-players">${this.escHtml(game.players.join(' vs '))}</span>
          <span class="hub-recent-date">${dateStr}</span>
        </div>
        <span class="hub-recent-result">${resultText}</span>
      `;
      section.appendChild(item);
    }

    if (completed.length > 3) {
      const viewAll = document.createElement('button');
      viewAll.className = 'btn hub-view-all-btn';
      viewAll.textContent = 'View all →';
      viewAll.addEventListener('click', () => navigate('history'));
      section.appendChild(viewAll);
    }

    return section;
  }

  private createQuickLinks(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'hub-quick-links';

    const links: { label: string; icon: string; action: () => void }[] = [
      { label: 'Profile & Stats', icon: '👤', action: () => navigate('profile') },
      { label: 'Dictionary & Rules', icon: '📖', action: () => rulesPanel.classList.toggle('open') },
      { label: 'Settings', icon: '⚙', action: () => navigate('settings') },
    ];

    for (const link of links) {
      const btn = document.createElement('button');
      btn.className = 'btn hub-quick-link';
      btn.innerHTML = `<span class="hub-ql-icon">${link.icon}</span><span class="hub-ql-label">${link.label}</span>`;
      btn.addEventListener('click', link.action);
      section.appendChild(btn);
    }

    const rulesPanel = document.createElement('div');
    rulesPanel.className = 'hub-rules-panel';
    rulesPanel.innerHTML = `
      <div class="rules-grid">
        <div class="rules-item"><span class="rules-icon">🎯</span><div class="rules-text"><strong>Goal</strong><span>Form words on the board for the highest score.</span></div></div>
        <div class="rules-item"><span class="rules-icon">⭐</span><div class="rules-text"><strong>First Word</strong><span>Must cover the center square (★).</span></div></div>
        <div class="rules-item"><span class="rules-icon">👆</span><div class="rules-text"><strong>Play</strong><span>Tap a tile, then tap a board cell.</span></div></div>
        <div class="rules-item"><span class="rules-icon">✅</span><div class="rules-text"><strong>Submit</strong><span>Review your word, then tap Submit Word.</span></div></div>
        <div class="rules-item"><span class="rules-icon">💎</span><div class="rules-text"><strong>Premiums</strong><span>DL, TL, DW, TW squares boost your score.</span></div></div>
        <div class="rules-item"><span class="rules-icon">🎉</span><div class="rules-text"><strong>Bingo</strong><span>Use all 7 tiles for +50 bonus points.</span></div></div>
        <div class="rules-item"><span class="rules-icon">🔄</span><div class="rules-text"><strong>Pass / Swap</strong><span>Skip your turn or exchange tiles.</span></div></div>
        <div class="rules-item"><span class="rules-icon">🏁</span><div class="rules-text"><strong>End</strong><span>Game ends when rack + bag empty, or 6 passes.</span></div></div>
      </div>
    `;
    section.appendChild(rulesPanel);

    return section;
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
