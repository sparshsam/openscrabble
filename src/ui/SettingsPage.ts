/**
 * SettingsPage v0.4.3 — with data repair actions.
 *
 * Sections:
 *   - Profile (username, status, edit name)
 *   - Appearance (segmented theme toggle)
 *   - Data (reset onboarding, clear running games, clear all local data, clear saves)
 *   - About
 */

import { getCurrentUser, signOut } from '../auth/AuthService.js';
import { GamePersistence } from '../game/Persistence.js';
import { clearAllGameRecords, loadAllGames, saveAllGames } from '../lib/LocalGameStore.js';
import { navigate } from '../lib/routes.js';
import { showModal, showInfoModal } from './Modal.js';
import { loadGuestProfile, saveGuestProfile } from '../auth/AuthService.js';
import pkg from '../../package.json';

export class SettingsPage {
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
    page.className = 'settings-page';

    const heading = document.createElement('h2');
    heading.className = 'settings-heading';
    heading.textContent = 'Settings';
    page.appendChild(heading);

    page.appendChild(this.createProfileSection());
    page.appendChild(this.createAppearanceSection());
    page.appendChild(this.createDataSection());
    page.appendChild(this.createAboutSection());

    return page;
  }

  private createProfileSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-heading">Profile</div>`;

    const user = getCurrentUser();

    const nameRow = document.createElement('div');
    nameRow.className = 'settings-action-row';
    nameRow.innerHTML = `
      <span class="settings-action-label">Username</span>
      <span class="settings-action-value">${this.escHtml(user?.username || 'Player')}</span>
    `;
    nameRow.addEventListener('click', () => this.showEditName());
    section.appendChild(nameRow);

    const badge = document.createElement('div');
    badge.className = 'settings-action-row';
    badge.innerHTML = `
      <span class="settings-action-label">Status</span>
      <span class="settings-action-value"><span class="settings-status-badge">${user?.isGuest ? 'Guest' : 'Signed In'}</span></span>
    `;
    section.appendChild(badge);

    return section;
  }

  private createAppearanceSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-heading">Appearance</div>`;

    const container = document.createElement('div');
    container.className = 'settings-theme-row';

    const label = document.createElement('span');
    label.className = 'settings-theme-label';
    label.textContent = 'Theme';

    const current = document.documentElement.getAttribute('data-theme');
    const effective = current || 'system';

    const toggle = document.createElement('div');
    toggle.className = 'theme-segmented';

    const options = [
      { value: 'system', label: 'System' },
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
    ];

    for (const opt of options) {
      const btn = document.createElement('button');
      btn.className = `theme-seg-btn${opt.value === effective ? ' theme-seg-active' : ''}`;
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        toggle.querySelectorAll('.theme-seg-btn').forEach((b) => b.classList.remove('theme-seg-active'));
        btn.classList.add('theme-seg-active');

        const html = document.documentElement;
        if (opt.value === 'system') {
          html.removeAttribute('data-theme');
          localStorage.removeItem('openscrabble-theme');
        } else {
          html.setAttribute('data-theme', opt.value);
          localStorage.setItem('openscrabble-theme', opt.value);
        }
      });
      toggle.appendChild(btn);
    }

    container.appendChild(label);
    container.appendChild(toggle);
    section.appendChild(container);

    return section;
  }

  private createDataSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-heading">Data</div>`;

    // Reset onboarding
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn settings-action-btn';
    resetBtn.textContent = 'Reset Welcome Screen';
    resetBtn.addEventListener('click', () => {
      showModal(
        'Reset Welcome',
        'This will show the onboarding flow again on next visit.',
        'Reset',
        () => {
          localStorage.removeItem('openscrabble_onboarded');
          localStorage.removeItem('openscrabble_guest_profile');
          navigate('onboarding');
        }
      );
    });
    section.appendChild(resetBtn);

    // Clear Running Games
    const clearRunningBtn = document.createElement('button');
    clearRunningBtn.className = 'btn settings-action-btn';
    clearRunningBtn.textContent = 'Clear Running Games';
    clearRunningBtn.addEventListener('click', () => {
      showModal(
        'Clear Running Games',
        'Remove all active games and their saves? This cannot be undone.',
        'Clear All',
        () => {
          const all = loadAllGames();
          const kept = all.filter((g) => g.status !== 'active');
          saveAllGames(kept);
          // Remove saves for active games
          for (const game of all) {
            if (game.status === 'active') {
              const key = game.saveKey || `openscrabble_save_${game.id}`;
              localStorage.removeItem(key);
            }
          }
          showInfoModal('Done', 'All running games cleared.');
        }
      );
    });
    section.appendChild(clearRunningBtn);

    // Clear game history
    const clearHistoryBtn = document.createElement('button');
    clearHistoryBtn.className = 'btn settings-action-btn';
    clearHistoryBtn.textContent = 'Clear Game History';
    clearHistoryBtn.addEventListener('click', () => {
      showModal(
        'Clear History',
        'Remove all completed game history. Active games are kept.',
        'Clear',
        () => {
          const all = loadAllGames();
          const kept = all.filter((g) => g.status === 'active');
          saveAllGames(kept);
          showInfoModal('Done', 'Game history cleared.');
        }
      );
    });
    section.appendChild(clearHistoryBtn);

    // Clear all saves
    const clearSavesBtn = document.createElement('button');
    clearSavesBtn.className = 'btn settings-action-btn';
    clearSavesBtn.textContent = 'Clear All Saved Games';
    clearSavesBtn.addEventListener('click', () => {
      showModal(
        'Clear Saves',
        'Remove all saved game state. Game records are kept but cannot be resumed.',
        'Clear All',
        () => {
          GamePersistence.clearAll();
          showInfoModal('Done', 'All saved games cleared.');
        }
      );
    });
    section.appendChild(clearSavesBtn);

    // Clear All Local Data
    const clearAllBtn = document.createElement('button');
    clearAllBtn.className = 'btn settings-action-btn settings-action-btn-danger';
    clearAllBtn.textContent = 'Clear All Local Data';
    clearAllBtn.addEventListener('click', () => {
      showModal(
        'Clear All Data',
        'Remove ALL local data: games, history, saves, profile, and settings. This cannot be undone.',
        'Clear Everything',
        () => {
          clearAllGameRecords();
          GamePersistence.clearAll();
          localStorage.removeItem('openscrabble_onboarded');
          localStorage.removeItem('openscrabble_guest_profile');
          localStorage.removeItem('openscrabble-theme');
          navigate('onboarding');
        }
      );
    });
    section.appendChild(clearAllBtn);

    return section;
  }

  private createAboutSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-heading">About</div>
      <div class="settings-about">
        <p>OpenScrabble v${pkg.version}</p>
        <p>Local two-player Scrabble game.</p>
        <p class="settings-about-link"><a href="https://github.com/sparshsam/openscrabble" target="_blank" rel="noopener">GitHub</a></p>
      </div>
    `;
    return section;
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
