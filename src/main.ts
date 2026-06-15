import './ui/styles.css';
import { HomePage } from './ui/HomePage.js';
import { GameUI } from './ui/GameUI.js';
import { GamePersistence } from './game/Persistence.js';
import { loadWordSet, isWordSetLoaded } from './game/DictionaryLoader.js';

type Screen = 'home' | 'game';

function init(): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  let currentComponent: HomePage | GameUI | null = null;

  function showHome(): void {
    // Preload dictionary in background while user is on home page
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const hasSaved = GamePersistence.hasSavedGame();
    const home = new HomePage(
      root!,
      (config) => {
        // Starting a new game — check if overwriting saved game
        if (hasSaved && !confirm('Start a new game? Your saved game will be lost.')) {
          return;
        }
        GamePersistence.clear();
        showGame(config.player1Name, config.player2Name);
      },
      () => {
        // Continue saved game
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
    // Kick off dictionary load in background
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const gameUI = new GameUI(root!, undefined, () => {
      showHome();
    });
    currentComponent = gameUI;
  }

  function showGameFrom(game: import('./game/Game.js').Game): void {
    // Kick off dictionary load in background
    if (!isWordSetLoaded()) {
      loadWordSet();
    }
    const gameUI = new GameUI(root!, game, () => {
      showHome();
    });
    currentComponent = gameUI;
  }

  // URL param direct entry?game=1
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
