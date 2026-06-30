/**
 * NewGameSetupPage — local game setup before starting.
 *
 * User enters player names:
 * - P1: defaults to current guest/profile username or editable
 * - P2: editable, required
 * - P3: optional
 * - P4: optional
 *
 * On start, creates a new game record in LocalGameStore and routes to #game.
 */

import { getCurrentUser } from '../auth/AuthService.js';
import { navigate } from '../lib/routes.js';
import { createActiveGameRecord } from '../lib/LocalGameStore.js';
import { GamePersistence } from '../game/Persistence.js';

export class NewGameSetupPage {
  private root: HTMLElement;
  private playerNames: string[] = ['', '', ''];
  private playerCount = 2;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const user = getCurrentUser();
    const defaultP1 = user?.username || 'Player 1';
    this.playerNames[0] = defaultP1;
    this.playerNames[1] = 'Player 2';

    const page = document.createElement('div');
    page.className = 'onboarding-page new-game-page';

    const card = document.createElement('div');
    card.className = 'onboarding-card';

    card.innerHTML = `
      <h2 class="onboarding-title" style="font-size:var(--text-xl)">New Game</h2>
      <p class="onboarding-subtitle">Set up players for this game.</p>
      <div class="onboarding-players">
        <div class="onboarding-player-row">
          <span class="onboarding-player-badge">P1</span>
          <input type="text" id="ng-p1" class="settings-input" placeholder="Player 1" maxlength="20" value="${this.escHtml(defaultP1)}" />
        </div>
        <div class="onboarding-player-row">
          <span class="onboarding-player-badge">P2</span>
          <input type="text" id="ng-p2" class="settings-input" placeholder="Player 2" maxlength="20" value="Player 2" />
          <button id="ng-add-p3" class="btn btn-icon onboarding-add-btn" title="Add Player 3">+</button>
        </div>
      </div>
      <div id="ng-extra-players"></div>
      <button id="ng-start" class="btn btn-primary onboarding-btn">Start Game</button>
      <button id="ng-cancel" class="btn onboarding-cancel-btn">Cancel</button>
    `;

    page.appendChild(card);
    this.root.appendChild(page);

    const p1Input = page.querySelector('#ng-p1') as HTMLInputElement;
    const p2Input = page.querySelector('#ng-p2') as HTMLInputElement;

    p1Input.addEventListener('input', () => {
      this.playerNames[0] = p1Input.value || defaultP1;
    });
    p2Input.addEventListener('input', () => {
      this.playerNames[1] = p2Input.value || 'Player 2';
    });

    // Add Player 3 button
    const addBtn = page.querySelector('#ng-add-p3');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.playerCount < 4) {
          this.playerCount++;
          this.renderExtraPlayers();
        }
      });
    }

    // Start
    const startBtn = page.querySelector('#ng-start') as HTMLButtonElement;
    startBtn.addEventListener('click', () => this.startGame());

    // Cancel
    const cancelBtn = page.querySelector('#ng-cancel') as HTMLButtonElement;
    cancelBtn.addEventListener('click', () => navigate('hub'));

    setTimeout(() => p1Input.focus(), 100);

    return page;
  }

  private renderExtraPlayers(): void {
    const container = document.getElementById('ng-extra-players');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 2; i < this.playerCount; i++) {
      const idx = i; // index in playerNames array (2 = P3, 3 = P4)
      const label = `P${i + 1}`;
      const row = document.createElement('div');
      row.className = 'onboarding-player-row';
      row.innerHTML = `
        <span class="onboarding-player-badge">${label}</span>
        <input type="text" class="settings-input ng-extra-input" placeholder="Player ${i + 1}" maxlength="20" value="${this.escHtml(this.playerNames[idx] || 'Player ' + (i + 1))}" />
        <button class="btn btn-icon onboarding-remove-btn" title="Remove Player ${i + 1}">×</button>
      `;

      const input = row.querySelector('.ng-extra-input') as HTMLInputElement;
      input.addEventListener('input', () => {
        this.playerNames[idx] = input.value || `Player ${i + 1}`;
      });

      const removeBtn = row.querySelector('.onboarding-remove-btn') as HTMLButtonElement;
      removeBtn.addEventListener('click', () => {
        this.playerNames[idx] = '';
        this.playerCount--;
        this.renderExtraPlayers();
      });

      container.appendChild(row);
    }
  }

  private startGame(): void {
    const p1 = (document.getElementById('ng-p1') as HTMLInputElement)?.value?.trim() || this.playerNames[0] || 'Player 1';
    const p2 = (document.getElementById('ng-p2') as HTMLInputElement)?.value?.trim() || this.playerNames[1] || 'Player 2';

    const players: string[] = [p1, p2];
    for (let i = 2; i < this.playerCount; i++) {
      const name = this.playerNames[i]?.trim();
      if (name) players.push(name);
    }

    console.log('[NewGameSetup] startGame with players:', players);
    // Create game record and save key
    const record = createActiveGameRecord(players);
    console.log('[NewGameSetup] created record:', record.id);
    GamePersistence.clear(); // clear old single-save key
    navigate('game', { gameId: record.id });
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
