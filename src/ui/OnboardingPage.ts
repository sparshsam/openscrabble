/**
 * OnboardingPage — first-time setup flow.
 *
 * Steps:
 * 1. Welcome screen — enter username
 * 2. Auth choice — Continue as Guest or Sign in with Google
 * 3. Local player setup — optional Player 2, Player 3, Player 4
 */

import { saveGuestProfile, markOnboarded, signInWithGoogle, isSupabaseConfigured } from '../auth/AuthService.js';
import { savePlayerSetup } from '../profile/ProfileService.js';
import { navigate } from '../lib/routes.js';

export type OnboardingResult = 'guest' | 'google';

export class OnboardingPage {
  private root: HTMLElement;
  private currentStep = 1;
  private username = '';
  private playerNames: string[] = ['Player 2', '', ''];
  private playerCount = 2;
  private onComplete: (result: OnboardingResult) => void;

  constructor(root: HTMLElement, onComplete: (result: OnboardingResult) => void) {
    this.root = root;
    this.onComplete = onComplete;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createStep1());
  }

  // ─── Step 1: Username ───────────────────────────────

  private createStep1(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'onboarding-page';

    page.innerHTML = `
      <div class="onboarding-card">
        <div class="onboarding-logo">
          <img src="/favicon.svg" alt="OpenScrabble" width="64" height="64" />
        </div>
        <h1 class="onboarding-title">Welcome to OpenScrabble</h1>
        <p class="onboarding-subtitle">Local two-player Scrabble. Pick a username to get started.</p>
        <div class="onboarding-field">
          <input type="text" id="onboarding-username" class="settings-input" placeholder="Your username" maxlength="24" autofocus />
        </div>
        <p class="onboarding-hint" id="onboarding-hint">You can change this later.</p>
        <button id="onboarding-next" class="btn btn-primary onboarding-btn">Continue</button>
      </div>
    `;

    const input = page.querySelector('#onboarding-username') as HTMLInputElement;
    const nextBtn = page.querySelector('#onboarding-next') as HTMLButtonElement;

    const tryNext = () => {
      const val = input.value.trim();
      if (val.length < 1) {
        const hint = page.querySelector('#onboarding-hint');
        if (hint) hint.textContent = 'Please enter a username.';
        return;
      }
      this.username = val;
      this.currentStep = 2;
      this.renderStep2();
    };

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryNext();
    });
    nextBtn.addEventListener('click', tryNext);

    setTimeout(() => input.focus(), 100);
    return page;
  }

  // ─── Step 2: Auth Choice ────────────────────────────

  private renderStep2(): void {
    const supabaseAvail = isSupabaseConfigured();
    this.root.innerHTML = '';

    const page = document.createElement('div');
    page.className = 'onboarding-page';

    const card = document.createElement('div');
    card.className = 'onboarding-card';

    card.innerHTML = `
      <div class="onboarding-logo">
        <img src="/favicon.svg" alt="OpenScrabble" width="64" height="64" />
      </div>
      <h2 class="onboarding-title" style="font-size:var(--text-2xl)">Hello, ${this.escHtml(this.username)}!</h2>
      <p class="onboarding-subtitle">How would you like to play?</p>
      <div class="onboarding-choices">
        <button id="onboarding-guest" class="btn onboarding-choice-btn">
          <span class="onboarding-choice-icon">👤</span>
          <span class="onboarding-choice-label">Continue as Guest</span>
          <span class="onboarding-choice-desc">Play locally, no account needed</span>
        </button>
        ${supabaseAvail ? `
        <button id="onboarding-google" class="btn onboarding-choice-btn">
          <span class="onboarding-choice-icon">🔑</span>
          <span class="onboarding-choice-label">Sign in with Google</span>
          <span class="onboarding-choice-desc">Save games to the cloud</span>
        </button>
        ` : ''}
      </div>
    `;

    page.appendChild(card);
    this.root.appendChild(page);

    page.querySelector('#onboarding-guest')?.addEventListener('click', () => {
      this.currentStep = 3;
      this.renderStep3();
    });

    const googleBtn = page.querySelector('#onboarding-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        const started = await signInWithGoogle();
        if (!started) {
          // Fall back to guest
          this.currentStep = 3;
          this.renderStep3();
        }
        // If Google sign-in started, the page will redirect
      });
    }
  }

  // ─── Step 3: Player Setup ───────────────────────────

  private renderStep3(): void {
    this.root.innerHTML = '';

    const page = document.createElement('div');
    page.className = 'onboarding-page';

    const card = document.createElement('div');
    card.className = 'onboarding-card';

    card.innerHTML = `
      <h2 class="onboarding-title" style="font-size:var(--text-xl)">Local Players</h2>
      <p class="onboarding-subtitle">Set up players for your local games. You can change names later.</p>
      <div class="onboarding-players">
        <div class="onboarding-player-row">
          <span class="onboarding-player-badge">You</span>
          <span class="onboarding-player-name">${this.escHtml(this.username)}</span>
        </div>
        <div class="onboarding-player-row">
          <span class="onboarding-player-badge">P2</span>
          <input type="text" id="op-p2" class="settings-input" placeholder="Player 2" maxlength="20" value="${this.escHtml(this.playerNames[0] ?? '')}" />
          <button id="op-p2-add" class="btn btn-icon onboarding-add-btn" title="Add Player 3">+</button>
        </div>
      </div>
      <div id="onboarding-extra-players"></div>
      <button id="onboarding-finish" class="btn btn-primary onboarding-btn">Start Playing</button>
    `;

    page.appendChild(card);
    this.root.appendChild(page);

    const p2Input = page.querySelector('#op-p2') as HTMLInputElement;
    p2Input.addEventListener('input', () => {
      this.playerNames[0] = p2Input.value || 'Player 2';
    });

    // Add Player 3 button
    const addBtn = page.querySelector('#op-p2-add');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        if (this.playerCount < 4) {
          this.playerCount++;
          this.renderExtraPlayers();
        }
      });
    }

    // Finish
    const finishBtn = page.querySelector('#onboarding-finish') as HTMLButtonElement;
    finishBtn.addEventListener('click', () => this.finishOnboarding());

    // Render existing extra players
    this.renderExtraPlayers();

    setTimeout(() => p2Input.focus(), 100);
  }

  private renderExtraPlayers(): void {
    const container = document.getElementById('onboarding-extra-players');
    if (!container) return;

    container.innerHTML = '';
    for (let i = 2; i < this.playerCount; i++) {
      const idx = i - 1; // index in playerNames array (0 = P2, 1 = P3, 2 = P4)
      const row = document.createElement('div');
      row.className = 'onboarding-player-row';
      row.innerHTML = `
        <span class="onboarding-player-badge">P${i + 1}</span>
        <input type="text" class="settings-input op-extra-input" placeholder="Player ${i + 1}" maxlength="20" value="${this.escHtml(this.playerNames[idx] || '')}" />
        <button class="btn btn-icon onboarding-remove-btn" title="Remove Player ${i + 1}">×</button>
      `;

      const input = row.querySelector('.op-extra-input') as HTMLInputElement;
      input.addEventListener('input', () => {
        this.playerNames[idx] = input.value || '';
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

  private finishOnboarding(): void {
    // Determine effective P2 name
    const p2Name = this.playerNames[0]?.trim() || 'Player 2';

    // Save guest profile
    const guestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    saveGuestProfile({
      id: guestId,
      username: this.username,
      displayName: this.username,
      isGuest: true,
    });

    // Save player setup
    const players: string[] = [this.username, p2Name];
    for (let i = 1; i < this.playerCount - 1; i++) {
      const name = this.playerNames[i]?.trim();
      if (name) players.push(name);
    }

    savePlayerSetup({
      player1Name: this.username,
      player2Name: p2Name,
      playerCount: players.length,
    });

    markOnboarded();
    this.onComplete('guest');
  }

  private escHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }
}

// UUID v4 fallback
function generateId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
