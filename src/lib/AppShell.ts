/**
 * AppShell — top-level navigation container.
 *
 * Renders a page-specific header and a bottom navigation bar.
 * Only shown on hub/profile/history/settings screens (not game/onboarding).
 */

import type { Screen } from './routes.js';
import { navigate } from './routes.js';
import { getCurrentUser } from '../auth/AuthService.js';

export class AppShell {
  private root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  /**
   * Render the shell wrapping content, with a bottom nav.
   */
  render(currentScreen: Screen, contentEl: HTMLElement): void {
    this.root.innerHTML = '';
    this.root.appendChild(this.createShell(currentScreen, contentEl));
  }

  private createShell(currentScreen: Screen, contentEl: HTMLElement): HTMLElement {
    const shell = document.createElement('div');
    shell.className = 'app-shell';

    // Page content
    const main = document.createElement('main');
    main.className = 'app-main';
    main.appendChild(contentEl);
    shell.appendChild(main);

    // Bottom navigation (only on main screens)
    if (currentScreen !== 'onboarding' && currentScreen !== 'game') {
      shell.appendChild(this.createBottomNav(currentScreen));
    }

    return shell;
  }

  private createBottomNav(currentScreen: Screen): HTMLElement {
    const nav = document.createElement('nav');
    nav.className = 'app-bottom-nav';

    const items: { screen: Screen; label: string; icon: string }[] = [
      { screen: 'hub', label: 'Play', icon: this.navIcon('play') },
      { screen: 'history', label: 'History', icon: this.navIcon('history') },
      { screen: 'profile', label: 'Profile', icon: this.navIcon('profile') },
      { screen: 'settings', label: 'Settings', icon: this.navIcon('settings') },
    ];

    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = `nav-btn${currentScreen === item.screen ? ' nav-btn-active' : ''}`;
      btn.innerHTML = `${item.icon}<span class="nav-label">${item.label}</span>`;
      btn.addEventListener('click', () => navigate(item.screen));
      nav.appendChild(btn);
    }

    return nav;
  }

  private navIcon(name: string): string {
    const icons: Record<string, string> = {
      play: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
      history: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      profile: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
      settings: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
    };
    return icons[name] || '';
  }
}
