import './ui/styles.css';
import { GameUI } from './ui/GameUI.js';

function init(): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Root element #app not found');
    return;
  }

  // Read player names from URL params or use defaults
  const params = new URLSearchParams(window.location.search);
  const p1 = params.get('p1') || 'Player 1';
  const p2 = params.get('p2') || 'Player 2';

  new GameUI(root, p1, p2);
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
