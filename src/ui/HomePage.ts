/**
 * HomePage — polished game landing screen.
 * New Game, Continue Game (if saved), How to Play, Settings.
 */

export interface HomeConfig {
  player1Name: string;
  player2Name: string;
}

export class HomePage {
  private root: HTMLElement;
  private onStartGame: (config: HomeConfig) => void;
  private onContinueGame: (() => void) | null;
  private config: HomeConfig;
  private hasSavedGame: boolean;

  constructor(
    root: HTMLElement,
    onStartGame: (config: HomeConfig) => void,
    onContinueGame: (() => void) | null = null,
    hasSavedGame = false
  ) {
    this.root = root;
    this.onStartGame = onStartGame;
    this.onContinueGame = onContinueGame;
    this.config = { player1Name: 'Player 1', player2Name: 'Player 2' };
    this.hasSavedGame = hasSavedGame;
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'home-page';

    // Background accent shapes
    page.innerHTML = `<div class="home-bg-shapes"><div class="bg-shape bg-shape-1"></div><div class="bg-shape bg-shape-2"></div></div>`;

    page.appendChild(this.createTitleSection());
    page.appendChild(this.createActions());
    page.appendChild(this.createSettingsPanel());
    page.appendChild(this.createHowToPlay());
    page.appendChild(this.createFooter());

    return page;
  }

  private createTitleSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'home-title-section';

    const logo = document.createElement('div');
    logo.className = 'home-logo';
    logo.textContent = '🔤';

    const title = document.createElement('h1');
    title.className = 'home-title';
    title.textContent = 'OpenScrabble';

    const subtitle = document.createElement('p');
    subtitle.className = 'home-subtitle';
    subtitle.textContent = 'Local two-player Scrabble';

    section.appendChild(logo);
    section.appendChild(title);
    section.appendChild(subtitle);
    return section;
  }

  private createActions(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'home-actions';

    const newGameBtn = document.createElement('button');
    newGameBtn.className = 'btn btn-primary home-btn home-btn-start';
    newGameBtn.textContent = 'New Game';
    newGameBtn.addEventListener('click', () => {
      this.onStartGame(this.config);
    });

    section.appendChild(newGameBtn);

    // Continue Game (only if saved state exists)
    if (this.hasSavedGame && this.onContinueGame) {
      const continueBtn = document.createElement('button');
      continueBtn.className = 'btn home-btn home-btn-continue';
      continueBtn.innerHTML = '▸ Continue Game';
      continueBtn.addEventListener('click', () => {
        this.onContinueGame!();
      });
      section.appendChild(continueBtn);
    }

    return section;
  }

  private createSettingsPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'home-settings-panel';

    const heading = document.createElement('div');
    heading.className = 'home-settings-heading';
    heading.textContent = 'Player Names';

    const row1 = document.createElement('div');
    row1.className = 'settings-row';

    const p1Label = document.createElement('span');
    p1Label.className = 'settings-row-label';
    p1Label.textContent = 'P1';

    const p1Input = document.createElement('input');
    p1Input.className = 'settings-input';
    p1Input.type = 'text';
    p1Input.placeholder = 'Player 1';
    p1Input.value = this.config.player1Name;
    p1Input.maxLength = 20;
    p1Input.addEventListener('input', () => {
      this.config.player1Name = p1Input.value || 'Player 1';
    });

    row1.appendChild(p1Label);
    row1.appendChild(p1Input);

    const row2 = document.createElement('div');
    row2.className = 'settings-row';

    const p2Label = document.createElement('span');
    p2Label.className = 'settings-row-label';
    p2Label.textContent = 'P2';

    const p2Input = document.createElement('input');
    p2Input.className = 'settings-input';
    p2Input.type = 'text';
    p2Input.placeholder = 'Player 2';
    p2Input.value = this.config.player2Name;
    p2Input.maxLength = 20;
    p2Input.addEventListener('input', () => {
      this.config.player2Name = p2Input.value || 'Player 2';
    });

    row2.appendChild(p2Label);
    row2.appendChild(p2Input);

    panel.appendChild(heading);
    panel.appendChild(row1);
    panel.appendChild(row2);

    // Start game from settings too
    const startBtn = document.createElement('button');
    startBtn.className = 'btn btn-primary home-btn';
    startBtn.style.marginTop = '12px';
    startBtn.textContent = 'Start Game';
    startBtn.addEventListener('click', () => {
      this.onStartGame(this.config);
    });
    panel.appendChild(startBtn);

    return panel;
  }

  private createHowToPlay(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'home-section';

    const toggle = document.createElement('button');
    toggle.className = 'btn home-section-toggle';
    toggle.innerHTML = '▸  How to Play';
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      toggle.innerHTML = content.classList.contains('open')
        ? '▾  How to Play'
        : '▸  How to Play';
    });

    const content = document.createElement('div');
    content.className = 'home-section-content';

    const rules = document.createElement('div');
    rules.className = 'rules-grid';

    const items = [
      ['🎯', 'Goal', 'Form words on the board for the highest score.'],
      ['⭐', 'First Word', 'Must cover the center square (★).'],
      ['👆', 'Play', 'Tap a tile, then tap a board cell. Or drag.'],
      ['✅', 'Submit', 'Review your word, then tap Submit Word.'],
      ['💎', 'Premiums', 'DL, TL, DW, TW squares boost your score.'],
      ['🎉', 'Bingo', 'Use all 7 tiles for +50 bonus points.'],
      ['🔄', 'Pass / Swap', 'Skip your turn or exchange tiles.'],
      ['🏁', 'End', 'Game ends when rack + bag empty, or 6 passes.'],
    ];

    for (const [emoji, label, desc] of items) {
      const item = document.createElement('div');
      item.className = 'rules-item';
      item.innerHTML = `
        <span class="rules-icon">${emoji}</span>
        <div class="rules-text">
          <strong>${label}</strong>
          <span>${desc}</span>
        </div>
      `;
      rules.appendChild(item);
    }

    content.appendChild(rules);
    panel.appendChild(toggle);
    panel.appendChild(content);
    return panel;
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'home-footer';
    footer.innerHTML = 'v0.1.3 — <a href="https://github.com/sparshsam/openscrabble" target="_blank" rel="noopener">GitHub</a>';
    return footer;
  }
}
