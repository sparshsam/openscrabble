/**
 * main.ts — App entry point for OpenScrabble v0.4.3.
 *
 * Multi-game persistence with robust routing:
 *   - #game?gameId=<id>  loads a specific saved game
 *   - #new-game          opens the player setup page
 *   - Stale records cleaned on hub render
 *   - Legacy openscrabble_save supported for backward compat
 */

import './ui/styles.css';
import type { Screen } from './lib/routes.js';
import { initRouter, navigate, parseHash } from './lib/routes.js';
import { hasOnboarded, restoreSession } from './auth/AuthService.js';
import { initSupabase } from './lib/supabase.js';
import { GameUI } from './ui/GameUI.js';
import { HubPage } from './ui/HubPage.js';
import { NewGameSetupPage } from './ui/NewGameSetupPage.js';
import { OnboardingPage } from './ui/OnboardingPage.js';
import { ProfilePage } from './ui/ProfilePage.js';
import { HistoryPage } from './ui/HistoryPage.js';
import { SettingsPage } from './ui/SettingsPage.js';
import { AppShell } from './lib/AppShell.js';
import { GamePersistence } from './game/Persistence.js';
import { loadWordSet, isWordSetLoaded } from './game/DictionaryLoader.js';
import { Game } from './game/Game.js';
import { createActiveGameRecord, getGameById, updateGameRecord, touchActiveGame, loadAllGames, saveAllGames } from './lib/LocalGameStore.js';
import pkg from '../package.json';

let appShell: AppShell | null = null;
let gameUI: GameUI | null = null;
let currentScreen: Screen | null = null;
let currentComponent: any = null;

/* ─── Theme Toggle ────────────────────────────── */

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

/* ─── Stale Record Cleanup ───────────────────── */

function cleanStaleRecords(): void {
  const all = loadAllGames();
  const filtered = all.filter((g) => {
    // Remove "Player 1 vs Player 2" records that have no actual save data
    if (g.players.length === 2 &&
        g.players[0] === 'Player 1' &&
        g.players[1] === 'Player 2' &&
        g.totalTurns === 0) {
      // Check if there's actual save data
      const saveKey = g.saveKey || `openscrabble_save_${g.id}`;
      if (!localStorage.getItem(saveKey) && !localStorage.getItem('openscrabble_save')) {
        return false; // stale, remove
      }
    }
    return true;
  });
  if (filtered.length !== all.length) {
    saveAllGames(filtered);
  }
}

/* ─── App ────────────────────────────────────── */

async function init(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  // Clean stale records from previous versions
  cleanStaleRecords();

  const themeToggle = createThemeToggle();
  document.body.prepend(themeToggle);

  initSupabase();
  await restoreSession();

  appShell = new AppShell(root);

  initRouter((screen: Screen, params) => {
    renderScreen(screen, params);
  });

  const onboarded = hasOnboarded();
  const { screen: hashScreen } = parseHash();
  const screen = onboarded
    ? (hashScreen === 'onboarding' ? 'hub' : hashScreen)
    : 'onboarding';

  renderScreen(screen, {});
}

function renderScreen(screen: Screen, params: Record<string, any>): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('[renderScreen] #app not found');
    return;
  }

  console.log('[renderScreen] screen:', screen, 'params:', JSON.stringify(params));
  currentScreen = screen;
  currentComponent = null;
  root.innerHTML = '';

  switch (screen) {
    case 'onboarding': {
      const onboarding = new OnboardingPage(root, () => {
        navigate('hub');
      });
      onboarding.render();
      currentComponent = onboarding;
      break;
    }
    case 'new-game': {
      const setup = new NewGameSetupPage(root);
      setup.render();
      currentComponent = setup;
      break;
    }
    case 'game': {
      showGame(params, root);
      break;
    }
    case 'hub': {
      showHub(root);
      break;
    }
    case 'profile': {
      showProfile(root);
      break;
    }
    case 'history': {
      showHistory(root);
      break;
    }
    case 'settings': {
      showSettings(root);
      break;
    }
  }
}

/* ─── Screen Renders ──────────────────────────── */

function showHub(root: HTMLElement): void {
  if (!isWordSetLoaded()) loadWordSet();

  const content = document.createElement('div');
  const hub = new HubPage(
    content,
    () => {
      // New Game → route through the proper #new-game path
      navigate('new-game');
    },
    (gameId: string) => {
      // Resume game → route to specific gameId
      navigate('game', { gameId });
    }
  );
  hub.render();
  appShell?.render('hub', content);
  currentComponent = hub;
}

function showGame(params: Record<string, any>, root: HTMLElement): void {
  if (!isWordSetLoaded()) loadWordSet();

  const gameId = params.gameId as string | undefined;

  if (gameId) {
    // Load by gameId from per-game save
    const data = GamePersistence.load(gameId);
    if (data) {
      console.log('[showGame] loaded save for gameId:', gameId);
      const game = GamePersistence.restoreGame(data);
      gameUI = new GameUI(root, game, () => {
        navigate('hub');
      }, (scores, turnNumber) => {
        touchActiveGame(gameId, scores, turnNumber);
      });
      currentComponent = gameUI;
      return;
    }

    // Fallback: check legacy key
    const legacyData = GamePersistence.load();
    if (legacyData) {
      // Only use legacy if it matches the game record's player names
      const record = getGameById(gameId);
      if (record) {
        console.log('[showGame] loaded legacy save for gameId:', gameId);
        const game = GamePersistence.restoreGame(legacyData);
        gameUI = new GameUI(root, game, () => {
          navigate('hub');
        }, (scores, turnNumber) => {
          touchActiveGame(gameId, scores, turnNumber);
        });
        currentComponent = gameUI;
        return;
      }
    }

    // No save found — check if metadata record exists (new game)
    const record = getGameById(gameId);
    if (record && record.status === 'active') {
      console.log('[showGame] no save found, creating initial state from metadata record:', gameId, record.players);
      // Create game from the record's player names
      const game = new Game(record.players[0] || 'Player 1', record.players[1] || 'Player 2');
      // Save it immediately so it becomes resumable
      GamePersistence.save(game, gameId);
      gameUI = new GameUI(root, game, () => {
        navigate('hub');
      }, (scores, turnNumber) => {
        touchActiveGame(gameId, scores, turnNumber);
      });
      currentComponent = gameUI;
      return;
    }

    // No save and no metadata — mark as abandoned and redirect
    if (record && record.status === 'active') {
      updateGameRecord(gameId, { status: 'abandoned', completedDate: new Date().toISOString() });
    }
    console.warn('[showGame] invalid gameId, redirecting to hub:', gameId);
    navigate('hub');
    return;
  }

  // No gameId — go to hub (new game must go through #new-game)
  console.warn('[showGame] no gameId provided, redirecting to hub');
  navigate('hub');
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
function checkLegacyUrl(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('game') && urlParams.get('game') === '1') {
    navigate('game', { p1: urlParams.get('p1') || 'Player 1', p2: urlParams.get('p2') || 'Player 2' });
    return true;
  }
  return false;
}

/* ─── Bootstrap ────────────────────────────────── */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (!checkLegacyUrl()) init();
  });
} else {
  if (!checkLegacyUrl()) init();
}
