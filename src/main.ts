import './ui/styles.css';
import { HomePage } from './ui/HomePage.js';
import { GameUI } from './ui/GameUI.js';

type Screen = 'home' | 'game';

function init(): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  let currentScreen: Screen = 'home';
  let currentComponent: HomePage | GameUI | null = null;

  function showHome(): void {
    currentScreen = 'home';
    const home = new HomePage(root!, (config) => {
      showGame(config.player1Name, config.player2Name);
    });
    currentComponent = home;
    home.render();
  }

  function showGame(p1: string, p2: string): void {
    currentScreen = 'game';
    const game = new GameUI(root!, p1, p2, () => {
      showHome();
    });
    currentComponent = game;
  }

  // Check URL params for direct game entry
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
