/**
 * main.ts — App entry point for OpenScrabble v0.4.0.
 *
 * Features:
 * - Hash routing (#hub, #game, #profile, #history, #settings, #onboarding)
 * - First-time onboarding flow
 * - Guest/local-first auth with optional Supabase
 * - Main hub dashboard
 * - Existing game screen preserved
 * - Bottom navigation shell
 */

import './ui/styles.css';
import type { Screen } from './lib/routes.js';
import { initRouter, destroyRouter, navigate, parseHash, getInitialScreen } from './lib/routes.js';
import { hasOnboarded, restoreSession, getCurrentUser } from './auth/AuthService.js';
import { initSupabase } from './lib/supabase.js';
import { HomePage } from './ui/HomePage.js';
import { GameUI } from './ui/GameUI.js';
import { HubPage } from './ui/HubPage.js';
import { OnboardingPage } from './ui/OnboardingPage.js';
import { ProfilePage } from './ui/ProfilePage.js';
import { HistoryPage } from './ui/HistoryPage.js';
import { SettingsPage } from './ui/SettingsPage.js';
import { AppShell } from './lib/AppShell.js';
import { GamePersistence } from './game/Persistence.js';
import { loadWordSet, isWordSetLoaded } from './game/DictionaryLoader.js';
import { Game } from './game/Game.js';
import { createActiveGameRecord, getActiveGames } from './lib/LocalGameStore.js';
import pkg from '../package.json';

let appShell: AppShell | null = null;
let hubPage: HubPage | null = null;
let gameUI: GameUI | null = null;
let currentScreen: Screen | null = null;
let currentComponent: any = null;

/* ─── Theme Toggle (moved to dedicated module for reuse) ── */

function getSavedTheme(): string | null {
  return localStorage.getItem('openscrabble-theme');
}

function applyTheme(theme: string): void {
  const html = document.documentElement;
  if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark');
  } else if (theme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }
}

function createSunIcon(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
}

function createMoonIcon(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
}

function updateToggleIcon(btn: HTMLElement, theme: string): void {
  if (theme === 'light') {
    btn.innerHTML = createSunIcon();
  } else {
    btn.innerHTML = createMoonIcon();
  }
}

function cycleTheme(): string {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  if (current === 'light') {
    applyTheme('dark');
    localStorage.setItem('openscrabble-theme', 'dark');
    return 'dark';
  } else {
    applyTheme('light');
    localStorage.setItem('openscrabble-theme', 'light');
    return 'light';
  }
}

export function createThemeToggle(): HTMLElement {
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Toggle dark/light mode');

  const saved = getSavedTheme();
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  const effectiveTheme = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  updateToggleIcon(toggle, effectiveTheme);

  toggle.addEventListener('click', () => {
    const next = cycleTheme();
    updateToggleIcon(toggle, next);
  });

  return toggle;
}

/* ─── Modal ────────────────────────────────────── */

function showModal(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void
): void {
  const old = document.getElementById('app-modal');
  if (old) old.remove();

  const overlay = document.createElement('div');
  overlay.id = 'app-modal';
  overlay.className = 'app-modal-overlay';

  const dialog = document.createElement('div');
  dialog.className = 'app-modal-dialog';

  const titleEl = document.createElement('div');
  titleEl.className = 'app-modal-title';
  titleEl.textContent = title;

  const textEl = document.createElement('div');
  textEl.className = 'app-modal-text';
  textEl.textContent = message;

  const actions = document.createElement('div');
  actions.className = 'app-modal-actions';

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => overlay.remove());

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-primary';
  confirmBtn.textContent = confirmLabel;
  confirmBtn.addEventListener('click', () => {
    overlay.remove();
    onConfirm();
  });

  actions.appendChild(cancelBtn);
  actions.appendChild(confirmBtn);
  dialog.appendChild(titleEl);
  dialog.appendChild(textEl);
  dialog.appendChild(actions);
  overlay.appendChild(dialog);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
  cancelBtn.focus();
}

/* ─── App ────────────────────────────────────── */

async function init(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  // Theme toggle — prepend to body
  const themeToggle = createThemeToggle();
  document.body.prepend(themeToggle);

  // Initialize Supabase (non-blocking, will fail gracefully)
  initSupabase();

  // Restore session (guest or Supabase)
  await restoreSession();

  // Initialize app shell
  appShell = new AppShell(root);

  // Initialize router
  initRouter((screen: Screen, params) => {
    renderScreen(screen, params);
  });

  // Determine initial screen
  const onboarded = hasOnboarded();
  const initial = getInitialScreen(onboarded);

  // Adjust initial to hub if not explicitly routed
  const { screen: hashScreen } = parseHash();
  const screen = onboarded
    ? (hashScreen === 'onboarding' ? 'hub' : hashScreen)
    : 'onboarding';

  renderScreen(screen, {});
}

function renderScreen(screen: Screen, params: Record<string, any>): void {
  const root = document.getElementById('app');
  if (!root) return;

  currentScreen = screen;
  currentComponent = null;

  // Clear existing content
  root.innerHTML = '';

  if (screen === 'onboarding') {
    // Full-screen onboarding, no shell
    const onboarding = new OnboardingPage(root, () => {
      navigate('hub');
    });
    onboarding.render();
    currentComponent = onboarding;
  } else if (screen === 'game') {
    // Game screen — direct render, no bottom nav
    showGame(params, root);
  } else if (screen === 'hub') {
    // Hub dashboard — in shell
    showHub(root);
  } else if (screen === 'profile') {
    // Profile screen — in shell
    showProfile(root);
  } else if (screen === 'history') {
    // History screen — in shell
    showHistory(root);
  } else if (screen === 'settings') {
    // Settings screen — in shell
    showSettings(root);
  }
}

/* ─── Screen Renders ──────────────────────────── */

function showHub(root: HTMLElement): void {
  if (!isWordSetLoaded()) {
    loadWordSet();
  }

  hubPage = new HubPage(
    document.createElement('div'),
    (p1: string, p2: string) => {
      GamePersistence.clear();
      navigate('game', { p1, p2 });
    },
    () => {
      navigate('game', { saved: true });
    }
  );
  hubPage.render();

  appShell?.render('hub', root.lastChild as HTMLElement || document.createElement('div'));
  // Since AppShell replaces root content, we pass the hub's content differently
  // Re-do: render hub directly inside shell
  root.innerHTML = '';
  const content = document.createElement('div');
  hubPage = new HubPage(content, (p1: string, p2: string) => {
    GamePersistence.clear();
    navigate('game', { p1, p2 });
  }, () => {
    navigate('game', { saved: true });
  });
  hubPage.render();
  appShell?.render('hub', content);
  currentComponent = hubPage;
}

function showGame(params: Record<string, any>, root: HTMLElement): void {
  if (!isWordSetLoaded()) {
    loadWordSet();
  }

  const p1 = (params.p1 as string) || 'Player 1';
  const p2 = (params.p2 as string) || 'Player 2';

  if (params.saved) {
    const data = GamePersistence.load();
    if (data) {
      const game = GamePersistence.restoreGame(data);
      gameUI = new GameUI(root, game, () => {
        navigate('hub');
      });
    } else {
      gameUI = new GameUI(root, undefined, () => {
        navigate('hub');
      });
    }
  } else {
    // Create game store record
    createActiveGameRecord([p1, p2]);
    gameUI = new GameUI(root, undefined, () => {
      navigate('hub');
    });
  }
  currentComponent = gameUI;
}

function showProfile(root: HTMLElement): void {
  const content = document.createElement('div');
  const profile = new ProfilePage(content);
  profile.render();
  appShell?.render('profile', content);
  currentComponent = profile;
}

function showHistory(root: HTMLElement): void {
  const content = document.createElement('div');
  const history = new HistoryPage(content);
  history.render();
  appShell?.render('history', content);
  currentComponent = history;
}

function showSettings(root: HTMLElement): void {
  const content = document.createElement('div');
  const settings = new SettingsPage(content);
  settings.render();
  appShell?.render('settings', content);
  currentComponent = settings;
}

// ─── Legacy URL param support ─────────────────────
// Support ?game=1&p1=X&p2=Y for direct links
function checkLegacyUrl(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('game') && urlParams.get('game') === '1') {
    const p1 = urlParams.get('p1') || 'Player 1';
    const p2 = urlParams.get('p2') || 'Player 2';
    navigate('game', { p1, p2 });
    return true;
  }
  return false;
}

/* ─── Bootstrap ────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!checkLegacyUrl()) {
      init();
    }
  });
} else {
  if (!checkLegacyUrl()) {
    init();
  }
}
