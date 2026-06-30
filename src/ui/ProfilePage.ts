/**
 * ProfilePage v0.4.1 — stats calculated from local game history.
 */

import { getCurrentUser, signOut } from '../auth/AuthService.js';
import { updateProfileUsername, loadPlayerSetup } from '../profile/ProfileService.js';
import { navigate } from '../lib/routes.js';
import { loadGuestProfile, saveGuestProfile } from '../auth/AuthService.js';
import { computeStats, loadAllGames } from '../lib/LocalGameStore.js';
import { showModal, showInfoModal } from './Modal.js';

export class ProfilePage {
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
    page.className = 'profile-page';

    const user = getCurrentUser();
    const stats = computeStats();
    const allGames = loadAllGames();
    const completed = allGames.filter((g) => g.status === 'completed');

    // Profile header
    const header = document.createElement('div');
    header.className = 'profile-header';

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.textContent = user?.username?.charAt(0).toUpperCase() || '?';
    header.appendChild(avatar);

    const nameSection = document.createElement('div');
    nameSection.className = 'profile-name-section';

    const nameDisplay = document.createElement('h2');
    nameDisplay.className = 'profile-name';
    nameDisplay.textContent = user?.username || 'Player';
    nameSection.appendChild(nameDisplay);

    const badge = document.createElement('span');
    badge.className = `profile-badge ${user?.isGuest ? 'profile-badge-guest' : 'profile-badge-signed'}`;
    badge.textContent = user?.isGuest ? 'Guest' : 'Signed In';
    nameSection.appendChild(badge);
    header.appendChild(nameSection);

    if (user?.isGuest) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn profile-edit-btn';
      editBtn.textContent = '✏ Edit Name';
      editBtn.addEventListener('click', () => this.showEditName());
      header.appendChild(editBtn);
    }

    page.appendChild(header);

    // Stats grid
    const statsSection = document.createElement('div');
    statsSection.className = 'profile-section';
    statsSection.innerHTML = `<div class="profile-section-heading">Stats</div>`;

    const statsGrid = document.createElement('div');
    statsGrid.className = 'profile-stats-grid';
    statsGrid.innerHTML = `
      <div class="profile-stat"><span class="profile-stat-value">${stats.gamesPlayed}</span><span class="profile-stat-label">Played</span></div>
      <div class="profile-stat"><span class="profile-stat-value">${stats.gamesWon}</span><span class="profile-stat-label">Won</span></div>
      <div class="profile-stat"><span class="profile-stat-value">${stats.averageScore}</span><span class="profile-stat-label">Avg Score</span></div>
      <div class="profile-stat"><span class="profile-stat-value">${stats.highestScore}</span><span class="profile-stat-label">Best Game</span></div>
    `;
    statsSection.appendChild(statsGrid);
    page.appendChild(statsSection);

    // Extended stats
    const extStats = document.createElement('div');
    extStats.className = 'profile-ext-stats';
    extStats.innerHTML = `
      <div class="profile-ext-stat"><span>Total Score</span><span>${stats.totalScore}</span></div>
      <div class="profile-ext-stat"><span>Total Moves</span><span>${stats.totalMoves}</span></div>
      <div class="profile-ext-stat"><span>Bingos</span><span>${stats.bingos}</span></div>
      ${stats.lastPlayedDate ? `<div class="profile-ext-stat"><span>Last Played</span><span>${new Date(stats.lastPlayedDate).toLocaleDateString()}</span></div>` : ''}
    `;
    statsSection.appendChild(extStats);
    page.appendChild(statsSection);

    // Best word
    if (stats.bestWord) {
      const bestSection = document.createElement('div');
      bestSection.className = 'profile-section';
      bestSection.innerHTML = `
        <div class="profile-section-heading">Best Word</div>
        <div class="profile-best-word">
          <span class="profile-best-word-text">${this.escHtml(stats.bestWord)}</span>
          <span class="profile-best-word-score">${stats.bestWordScore} pts</span>
        </div>
      `;
      page.appendChild(bestSection);
    }

    // Last few games
    if (completed.length > 0) {
      const recentSection = document.createElement('div');
      recentSection.className = 'profile-section';

      const recentHeading = document.createElement('div');
      recentHeading.className = 'profile-section-heading';
      recentHeading.textContent = 'Recent Games';
      recentSection.appendChild(recentHeading);

      const maxShow = Math.min(5, completed.length);
      for (let i = 0; i < maxShow; i++) {
        const game = completed[i]!;
        const item = document.createElement('div');
        item.className = 'profile-history-item';
        const dateStr = new Date(game.completedDate || game.lastPlayedDate).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        let resultLabel = game.scores.join('–');
        if (game.isTie) resultLabel += ' (Tie)';
        else if (game.winner) resultLabel += ` — ${this.escHtml(game.winner)}`;
        item.innerHTML = `
          <span class="profile-history-players">${this.escHtml(game.players.join(' vs '))}</span>
          <span class="profile-history-result">${resultLabel}</span>
        `;
        recentSection.appendChild(item);
      }

      if (completed.length > 5) {
        const viewAll = document.createElement('button');
        viewAll.className = 'btn profile-link-btn';
        viewAll.textContent = 'View all →';
        viewAll.addEventListener('click', () => navigate('history'));
        recentSection.appendChild(viewAll);
      }

      page.appendChild(recentSection);
    }

    // Sign out
    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'btn profile-signout-btn';
    signOutBtn.textContent = 'Sign Out';
    signOutBtn.addEventListener('click', () => {
      showModal(
        'Sign Out',
        'This will clear your local profile and return to the welcome screen.',
        'Sign Out',
        async () => {
          await signOut();
          localStorage.removeItem('openscrabble_onboarded');
          navigate('onboarding');
        }
      );
    });
    page.appendChild(signOutBtn);

    return page;
  }

  private showEditName(): void {
    const user = getCurrentUser();
    if (!user) return;

    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'app-modal-dialog';

    dialog.innerHTML = `
      <div class="app-modal-title">Edit Name</div>
      <div class="app-modal-text" style="margin-bottom:12px">
        <input type="text" id="edit-name-input" class="settings-input" value="${this.escHtml(user.username)}" maxlength="24" autofocus />
      </div>
      <div class="app-modal-actions">
        <button id="edit-name-cancel" class="btn">Cancel</button>
        <button id="edit-name-save" class="btn btn-primary">Save</button>
      </div>
    `;

    overlay.appendChild(dialog);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);

    const input = dialog.querySelector('#edit-name-input') as HTMLInputElement;
    const saveBtn = dialog.querySelector('#edit-name-save') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#edit-name-cancel') as HTMLButtonElement;

    input.focus();
    input.select();

    const save = () => {
      const val = input.value.trim();
      if (val.length > 0) {
        updateProfileUsername(val);
        const guest = loadGuestProfile();
        if (guest) {
          guest.username = val;
          guest.displayName = val;
          saveGuestProfile(guest);
        }
        overlay.remove();
        this.render();
      }
    };

    saveBtn.addEventListener('click', save);
    cancelBtn.addEventListener('click', () => overlay.remove());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') save();
    });
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
