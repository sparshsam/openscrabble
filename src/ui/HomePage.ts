/**
 * HomePage — first screen users see.
 * Title, New Local Game, How to Play, Settings, Stats placeholder.
 */

export interface HomeConfig {
  player1Name: string;
  player2Name: string;
}

export class HomePage {
  private root: HTMLElement;
  private onStartGame: (config: HomeConfig) => void;
  private config: HomeConfig;

  constructor(root: HTMLElement, onStartGame: (config: HomeConfig) => void) {
    this.root = root;
    this.onStartGame = onStartGame;
    this.config = { player1Name: 'Player 1', player2Name: 'Player 2' };
  }

  render(): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createPage());
  }

  private createPage(): HTMLElement {
    const page = document.createElement('div');
    page.className = 'home-page';

    page.appendChild(this.createTitle());
    page.appendChild(this.createActions());
    page.appendChild(this.createHowToPlay());
    page.appendChild(this.createSettings());
    page.appendChild(this.createFooter());

    return page;
  }

  private createTitle(): HTMLElement {
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
    newGameBtn.className = 'btn btn-primary home-btn';
    newGameBtn.textContent = 'New Local Game';
    newGameBtn.addEventListener('click', () => {
      this.onStartGame(this.config);
    });

    section.appendChild(newGameBtn);
    return section;
  }

  private createHowToPlay(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'home-section';

    const toggle = document.createElement('button');
    toggle.className = 'btn home-section-toggle';
    toggle.textContent = '▸  How to Play';
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      toggle.textContent = content.classList.contains('open') ? '▾  How to Play' : '▸  How to Play';
    });

    const content = document.createElement('div');
    content.className = 'home-section-content';
    content.innerHTML = `
      <div class="rules-list">
        <p><strong>Goal:</strong> Form words on the board for the highest score.</p>
        <p><strong>First word</strong> must cover the center square (★).</p>
        <p><strong>Each turn:</strong> Place tiles, then tap <em>Submit Word</em>.</p>
        <p><strong>Premium squares</strong> boost your score (DL, TL, DW, TW).</p>
        <p><strong>Bingo:</strong> Use all 7 tiles for +50 bonus points.</p>
        <p><strong>Pass</strong> to skip your turn. <strong>Swap</strong> to exchange tiles.</p>
        <p>Game ends when a player empties their rack with an empty bag, or after 6 consecutive passes.</p>
      </div>
    `;

    section.appendChild(toggle);
    section.appendChild(content);
    return section;
  }

  private createSettings(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'home-section';

    const toggle = document.createElement('button');
    toggle.className = 'btn home-section-toggle';
    toggle.textContent = '▸  Settings';
    toggle.addEventListener('click', () => {
      content.classList.toggle('open');
      toggle.textContent = content.classList.contains('open') ? '▾  Settings' : '▸  Settings';
    });

    const content = document.createElement('div');
    content.className = 'home-section-content';

    const p1Label = document.createElement('label');
    p1Label.className = 'settings-label';
    p1Label.textContent = 'Player 1';
    const p1Input = document.createElement('input');
    p1Input.className = 'settings-input';
    p1Input.type = 'text';
    p1Input.value = this.config.player1Name;
    p1Input.maxLength = 20;
    p1Input.addEventListener('input', () => {
      this.config.player1Name = p1Input.value || 'Player 1';
    });

    const p2Label = document.createElement('label');
    p2Label.className = 'settings-label';
    p2Label.textContent = 'Player 2';
    const p2Input = document.createElement('input');
    p2Input.className = 'settings-input';
    p2Input.type = 'text';
    p2Input.value = this.config.player2Name;
    p2Input.maxLength = 20;
    p2Input.addEventListener('input', () => {
      this.config.player2Name = p2Input.value || 'Player 2';
    });

    content.appendChild(p1Label);
    content.appendChild(p1Input);
    content.appendChild(p2Label);
    content.appendChild(p2Input);

    section.appendChild(toggle);
    section.appendChild(content);
    return section;
  }

  private createFooter(): HTMLElement {
    const footer = document.createElement('div');
    footer.className = 'home-footer';
    footer.textContent = 'v0.1.1';
    return footer;
  }
}
