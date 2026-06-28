import './ui/styles.css';
import { HomePage } from './ui/HomePage.js';
import { GameUI } from './ui/GameUI.js';
import { GamePersistence } from './game/Persistence.js';
import { loadWordSet, isWordSetLoaded } from './game/DictionaryLoader.js';

type Screen = 'home' | 'game';

/* ─── Theme Toggle ───────────────────────────── */

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

function createThemeToggle(): HTMLElement {
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Toggle dark/light mode');

  const saved = getSavedTheme();
  if (saved) {
    applyTheme(saved);
  } else {
    // If no saved preference, check actual system state
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  }
  // Set initial icon based on effective theme
  const effectiveTheme = document.documentElement.getAttribute('data-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  updateToggleIcon(toggle, effectiveTheme);

  toggle.addEventListener('click', () => {
    const next = cycleTheme();
    updateToggleIcon(toggle, next);
  });

  return toggle;
}

/* ─── Standalone Modal (for use outside GameUI) ─── */

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

function init(): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  // Theme toggle — prepend to body so it sits at the edge
  const themeToggle = createThemeToggle();
  document.body.prepend(themeToggle);

  let currentComponent: HomePage | GameUI | null = null;

  function showHome(): void {
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const hasSaved = GamePersistence.hasSavedGame();
    const home = new HomePage(
      root!,
      (config) => {
        if (hasSaved) {
          showModal(
            'New Game',
            'Start a new game? Your saved game will be lost.',
            'New Game',
            () => {
              GamePersistence.clear();
              showGame(config.player1Name, config.player2Name);
            }
          );
          return;
        }
        GamePersistence.clear();
        showGame(config.player1Name, config.player2Name);
      },
      () => {
        const data = GamePersistence.load();
        if (data) {
          const game = GamePersistence.restoreGame(data);
          showGameFrom(game);
        }
      },
      hasSaved
    );
    currentComponent = home;
    home.render();
  }

  function showGame(p1: string, p2: string): void {
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const gameUI = new GameUI(root!, undefined, () => {
      showHome();
    });
    currentComponent = gameUI;
  }

  function showGameFrom(game: import('./game/Game.js').Game): void {
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const gameUI = new GameUI(root!, game, () => {
      showHome();
    });
    currentComponent = gameUI;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.has('game') && params.get('game') === '1') {
    const p1 = params.get('p1') || 'Player 1';
    const p2 = params.get('p2') || 'Player 2';
    showGame(p1, p2);
  } else {
    showHome();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
