/**
 * Simple hash-based router for OpenScrabble.
 * Screens are identified by hash fragments:
 *   #hub         — Main dashboard
 *   #game        — Game screen (with optional ?saved param)
 *   #profile     — Profile / stats
 *   #history     — Recent games
 *   #settings    — Settings
 *   #onboarding  — First-time setup
 *
 * State
 * ─────
 * Changes from the hub trigger immediate render. The hub view passes
 * callbacks for New Game → hash changes, Continue Game → hash changes,
 * and other screens → hash changes.
 *
 * Params
 * ──────
 * ?saved — load the saved game (triggered by Continue Game)
 * ?p1=...&p2=... — pre-filled player names (legacy support)
 */

export type Screen =
  | 'hub'
  | 'game'
  | 'new-game'
  | 'profile'
  | 'history'
  | 'settings'
  | 'onboarding';

export interface RouteParams {
  saved?: boolean;
  p1?: string;
  p2?: string;
  gameId?: string;
}

let _onRouteChange: ((screen: Screen, params: RouteParams) => void) | null = null;

export function initRouter(onRouteChange: (screen: Screen, params: RouteParams) => void): void {
  _onRouteChange = onRouteChange;
  window.addEventListener('hashchange', handleHashChange);
}

export function destroyRouter(): void {
  window.removeEventListener('hashchange', handleHashChange);
  _onRouteChange = null;
}

function handleHashChange(): void {
  const { screen, params } = parseHash();
  console.log('[router] hashchange →', screen, params);
  _onRouteChange?.(screen, params);
}

/**
 * Navigate to a screen via hash.
 */
export function navigate(screen: Screen, params: RouteParams = {}): void {
  const hash = buildHash(screen, params);
  console.log('[router] navigate →', screen, params, 'hash:', hash);
  if (window.location.hash !== `#${hash}`) {
    window.location.hash = hash;
  } else {
    // Same hash — still fire the callback (for New Game when already on #game)
    _onRouteChange?.(screen, params);
  }
}

/**
 * Parse the current URL hash into a screen + params.
 */
export function parseHash(): { screen: Screen; params: RouteParams } {
  const hash = window.location.hash.replace(/^#/, '');
  const [base, ...rest] = hash.split('?');
  const queryStr = rest.join('?');
  const params: RouteParams = {};

  if (queryStr) {
    const searchParams = new URLSearchParams(queryStr);
    if (searchParams.has('saved')) params.saved = true;
    if (searchParams.has('gameId')) params.gameId = searchParams.get('gameId')!;
    if (searchParams.has('p1')) params.p1 = searchParams.get('p1')!;
    if (searchParams.has('p2')) params.p2 = searchParams.get('p2')!;
  }

  // Also check legacy URL search params (for direct ?game=1 links)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('game') && base !== 'game') {
    params.p1 = urlParams.get('p1') || params.p1;
    params.p2 = urlParams.get('p2') || params.p2;
    return { screen: 'game', params };
  }

  switch (base) {
    case 'game':
      return { screen: 'game', params };
    case 'new-game':
      return { screen: 'new-game', params };
    case 'profile':
      return { screen: 'profile', params };
    case 'history':
      return { screen: 'history', params };
    case 'settings':
      return { screen: 'settings', params };
    case 'onboarding':
      return { screen: 'onboarding', params };
    case 'hub':
    default:
      return { screen: 'hub', params };
  }
}

export function buildHash(screen: Screen, params: RouteParams): string {
  const parts: string[] = [screen];
  const query: string[] = [];
  if (params.saved) query.push('saved');
  if (params.gameId) query.push(`gameId=${encodeURIComponent(params.gameId)}`);
  if (params.p1) query.push(`p1=${encodeURIComponent(params.p1)}`);
  if (params.p2) query.push(`p2=${encodeURIComponent(params.p2)}`);
  if (query.length > 0) parts.push('?' + query.join('&'));
  return parts.join('');
}

/**
 * Get the initial screen on page load — checks onboarding status.
 */
export function getInitialScreen(hasOnboarded: boolean): Screen {
  if (!hasOnboarded) return 'onboarding';
  const { screen } = parseHash();
  if (screen === 'onboarding') return 'hub';
  return screen;
}
