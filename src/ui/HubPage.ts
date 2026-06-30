/**
 * HubPage v0.4.1 — polished mobile-first game hub.
 *
 * Sections:
 *   - Welcome header with player name
 *   - Continue Game card (if active save exists)
 *   - New Game button
 *   - Recent Games summary (last 3 completed)
 *   - Quick links: Profile, Dictionary & Rules, Settings
 */

import { GamePersistence } from '../game/Persistence.js';
import { getCurrentUser } from '../auth/AuthService.js';
import { navigate } from '../lib/routes.js';
import { loadPlayerSetup } from '../profile/ProfileService.js';
import { loadAllGames, getActiveGames } from '../lib/LocalGameStore.js';
import { showModal } from './Modal.js';

export class HubPage {
  private root: HTMLElement;
  private onNewGame: (p1: string, p2: string) => void;
  private onContinueGame: () => void;

  constructor(
    root: HTMLElement,
    onNewGame: (p1: string, p2: string) => void,
    onContinueGame: () => void
  ) {
    this.root = root;
    this.onNewGame = onNewGame;
    this.onContinueGame = onContinueGame;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'hub-page';

    page.appendChild(this.createHeader());
    page.appendChild(this.createActions());
    const recentGames = this.createRecentGames();
    if (recentGames) page.appendChild(recentGames);
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

  private createActions(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'hub-actions';

    const hasSaved = GamePersistence.hasSavedGame();
    const activeGames = getActiveGames();
    const setup = loadPlayerSetup();

    // ── Continue Game Card ──
    if (hasSaved && activeGames.length > 0) {
      const active = activeGames[0]!;
      const continueCard = document.createElement('div');
      continueCard.className = 'hub-continue-card';
      continueCard.innerHTML = `
        <div class="hub-continue-info">
          <span class="hub-continue-label">Continue Game</span>
          <span class="hub-continue-players">${this.escHtml(active.players.join(' vs '))}</span>
          <span class="hub-continue-turns">Turn ${active.totalTurns + 1}</span>
        </div>
        <span class="hub-continue-arrow">▶</span>
      `;
      continueCard.addEventListener('click', () => {
        this.onContinueGame();
      });
      section.appendChild(continueCard);
    } else if (hasSaved) {
      // Save exists but no game store record — fallback
      const continueCard = document.createElement('div');
      continueCard.className = 'hub-continue-card';
      continueCard.innerHTML = `
        <div class="hub-continue-info">
          <span class="hub-continue-label">Continue Game</span>
          <span class="hub-continue-players">Saved game available</span>
        </div>
        <span class="hub-continue-arrow">▶</span>
      `;
      continueCard.addEventListener('click', () => {
        this.onContinueGame();
      });
      section.appendChild(continueCard);
    } else {
      // No save — empty state
      const emptyCard = document.createElement('div');
      emptyCard.className = 'hub-continue-card hub-continue-empty';
      emptyCard.innerHTML = `
        <div class="hub-continue-info">
          <span class="hub-continue-label">No Game in Progress</span>
          <span class="hub-continue-players">Start a new game below</span>
        </div>
      `;
      section.appendChild(emptyCard);
    }

    // ── New Game Button ──
    const newGameBtn = document.createElement('button');
    newGameBtn.className = 'btn hub-new-game-btn';
    newGameBtn.innerHTML = '🎮 New Game';
    newGameBtn.addEventListener('click', () => {
      if (hasSaved) {
        showModal(
          'New Game',
          'Start a new game? Your saved game will be lost.',
          'New Game',
          () => {
            GamePersistence.clear();
            navigate('game', { p1: setup.player1Name, p2: setup.player2Name });
          }
        );
        return;
      }
      navigate('game', { p1: setup.player1Name, p2: setup.player2Name });
    });
    section.appendChild(newGameBtn);

    // ── Quick Play — use saved player names ──
    const quickPlay = document.createElement('button');
    quickPlay.className = 'btn hub-quick-play-btn';
    quickPlay.innerHTML = `<span class="hub-qp-label">${this.escHtml(setup.player1Name)} vs ${this.escHtml(setup.player2Name)}</span><span class="hub-qp-arrow">→</span>`;
    quickPlay.addEventListener('click', () => {
      if (hasSaved) {
        showModal(
          'New Game',
          'Start a new game? Your saved game will be lost.',
          'New Game',
          () => {
            GamePersistence.clear();
            navigate('game', { p1: setup.player1Name, p2: setup.player2Name });
          }
        );
        return;
      }
      navigate('game', { p1: setup.player1Name, p2: setup.player2Name });
    });
    section.appendChild(quickPlay);

    // ── Player names edit inline hint ──
    const editHint = document.createElement('button');
    editHint.className = 'btn hub-edit-names-btn';
    editHint.textContent = '✏ Change player names';
    editHint.addEventListener('click', () => navigate('settings'));
    section.appendChild(editHint);

    return section;
  }

  private createRecentGames(): HTMLElement | null {
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

    const links: { label: string; icon: string; screen: string }[] = [
      { label: 'Profile & Stats', icon: '👤', screen: 'profile' },
      { label: 'Dictionary & Rules', icon: '📖', screen: '' }, // toggle inline
      { label: 'Settings', icon: '⚙', screen: 'settings' },
    ];

    for (const link of links) {
      const btn = document.createElement('button');
      btn.className = 'btn hub-quick-link';
      btn.innerHTML = `<span class="hub-ql-icon">${link.icon}</span><span class="hub-ql-label">${link.label}</span>`;
      if (link.screen === 'settings' || link.screen === 'profile') {
        btn.addEventListener('click', () => navigate(link.screen as any));
      } else {
        btn.addEventListener('click', () => {
          rulesPanel.classList.toggle('open');
        });
      }
      section.appendChild(btn);
    }

    // Inline rules accordion
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
