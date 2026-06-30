/**
 * OnboardingPage — first-time setup flow (v0.4.2).
 *
 * Steps:
 * 1. Welcome screen — enter username
 * 2. Auth choice — Continue as Guest or Sign in with Google
 *
 * No Player 2/3/4 setup — that happens in New Game flow.
 */

import { saveGuestProfile, markOnboarded, signInWithGoogle, isSupabaseConfigured } from '../auth/AuthService.js';
import { navigate } from '../lib/routes.js';

export type OnboardingResult = 'guest' | 'google';

export class OnboardingPage {
  private root: HTMLElement;
  private username = '';
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
        <p class="onboarding-hint" id="onboarding-hint">You can change this later in Profile.</p>
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
      this.finishOnboarding();
    });

    const googleBtn = page.querySelector('#onboarding-google');
    if (googleBtn) {
      googleBtn.addEventListener('click', async () => {
        const started = await signInWithGoogle();
        if (!started) {
          this.finishOnboarding();
        }
      });
    }
  }

  private finishOnboarding(): void {
    const guestId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    saveGuestProfile({
      id: guestId,
      username: this.username,
      displayName: this.username,
      isGuest: true,
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
