/**
 * SettingsPage v0.4.1 — organized sections with safe modals.
 *
 * Sections:
 *   - Profile (edit name, sign out)
 *   - Gameplay (player names, default settings)
 *   - Appearance (theme)
 *   - Data (reset onboarding, clear history, clear save)
 */

import { getCurrentUser, signOut } from '../auth/AuthService.js';
import { loadPlayerSetup, savePlayerSetup } from '../profile/ProfileService.js';
import { GamePersistence } from '../game/Persistence.js';
import { clearAllGameRecords } from '../lib/LocalGameStore.js';
import { navigate } from '../lib/routes.js';
import { showModal, showInfoModal } from './Modal.js';
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

    // ── Profile Section ──
    page.appendChild(this.createProfileSection());

    // ── Gameplay Section ──
    page.appendChild(this.createGameplaySection());

    // ── Appearance Section ──
    const appearanceSection = document.createElement('div');
    appearanceSection.className = 'settings-section';
    appearanceSection.innerHTML = `<div class="settings-section-heading">Appearance</div>`;
    appearanceSection.appendChild(this.createThemeToggle());
    page.appendChild(appearanceSection);

    // ── Data Section ──
    page.appendChild(this.createDataSection());

    // ── About ──
    const aboutSection = document.createElement('div');
    aboutSection.className = 'settings-section';
    aboutSection.innerHTML = `
      <div class="settings-section-heading">About</div>
      <div class="settings-about">
        <p>OpenScrabble v${pkg.version}</p>
        <p>Local two-player Scrabble game.</p>
        <p class="settings-about-link"><a href="https://github.com/sparshsam/openscrabble" target="_blank" rel="noopener">GitHub</a></p>
      </div>
    `;
    page.appendChild(aboutSection);

    return page;
  }

  private createProfileSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-heading">Profile</div>`;

    const user = getCurrentUser();
    const row1 = document.createElement('div');
    row1.className = 'settings-action-row';
    row1.innerHTML = `
      <span class="settings-action-label">Username</span>
      <span class="settings-action-value">${this.escHtml(user?.username || 'Player')}</span>
    `;
    row1.addEventListener('click', () => navigate('profile'));
    section.appendChild(row1);

    const badge = document.createElement('div');
    badge.className = 'settings-action-row';
    badge.innerHTML = `
      <span class="settings-action-label">Status</span>
      <span class="settings-action-value settings-status-badge">${user?.isGuest ? 'Guest' : 'Signed In'}</span>
    `;
    section.appendChild(badge);

    return section;
  }

  private createGameplaySection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `<div class="settings-section-heading">Gameplay</div>`;
    section.appendChild(this.createPlayerNameEditor());
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

    // Clear history
    const clearHistoryBtn = document.createElement('button');
    clearHistoryBtn.className = 'btn settings-action-btn';
    clearHistoryBtn.textContent = 'Clear Game History';
    clearHistoryBtn.addEventListener('click', () => {
      showModal(
        'Clear History',
        'Remove all game history records. This cannot be undone.',
        'Clear',
        () => {
          clearAllGameRecords();
          showInfoModal('Done', 'Game history cleared.');
        }
      );
    });
    section.appendChild(clearHistoryBtn);

    // Clear save
    const clearSaveBtn = document.createElement('button');
    clearSaveBtn.className = 'btn settings-action-btn';
    clearSaveBtn.textContent = 'Clear Current Save';
    clearSaveBtn.addEventListener('click', () => {
      showModal(
        'Clear Save',
        'Remove the current saved game? Any unsaved progress will be lost.',
        'Clear Save',
        () => {
          GamePersistence.clear();
          showInfoModal('Done', 'Saved game cleared.');
        }
      );
    });
    section.appendChild(clearSaveBtn);

    return section;
  }

  private createThemeToggle(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'settings-theme-row';

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'system';
    const label = document.createElement('span');
    label.className = 'settings-theme-label';
    label.textContent = 'Theme';

    const select = document.createElement('select');
    select.className = 'settings-select';
    select.innerHTML = `
      <option value="system" ${currentTheme === 'system' || (!currentTheme) ? 'selected' : ''}>System</option>
      <option value="light" ${currentTheme === 'light' ? 'selected' : ''}>Light</option>
      <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''}>Dark</option>
    `;
    select.addEventListener('change', () => {
      const val = select.value;
      const html = document.documentElement;
      if (val === 'system') {
        html.removeAttribute('data-theme');
        localStorage.removeItem('openscrabble-theme');
      } else {
        html.setAttribute('data-theme', val);
        localStorage.setItem('openscrabble-theme', val);
      }
    });

    container.appendChild(label);
    container.appendChild(select);
    return container;
  }

  private createPlayerNameEditor(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'settings-players';

    const setup = loadPlayerSetup();
    const user = getCurrentUser();

    const row1 = document.createElement('div');
    row1.className = 'settings-player-row';
    row1.innerHTML = `
      <span class="settings-player-badge">P1</span>
      <input type="text" id="settings-p1" class="settings-input" value="${this.escHtml(user?.username || setup.player1Name)}" maxlength="20" />
    `;
    container.appendChild(row1);

    const row2 = document.createElement('div');
    row2.className = 'settings-player-row';
    row2.innerHTML = `
      <span class="settings-player-badge">P2</span>
      <input type="text" id="settings-p2" class="settings-input" value="${this.escHtml(setup.player2Name)}" maxlength="20" />
    `;
    container.appendChild(row2);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'btn btn-primary settings-save-btn';
    saveBtn.textContent = 'Save Names';
    saveBtn.addEventListener('click', () => {
      const p1Input = document.getElementById('settings-p1') as HTMLInputElement;
      const p2Input = document.getElementById('settings-p2') as HTMLInputElement;
      savePlayerSetup({
        player1Name: p1Input?.value?.trim() || setup.player1Name,
        player2Name: p2Input?.value?.trim() || setup.player2Name,
        playerCount: 2,
      });
      saveBtn.textContent = '✓ Saved!';
      setTimeout(() => { saveBtn.textContent = 'Save Names'; }, 2000);
    });
    container.appendChild(saveBtn);

    return container;
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}
