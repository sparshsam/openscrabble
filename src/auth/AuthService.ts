/**
 * AuthService — handles authentication flows.
 * Supports Google OAuth (via Supabase) and guest mode.
 *
 * Guest mode requires no backend and works fully offline.
 * Signed-in mode can sync data later when Supabase is configured.
 */

import { getSupabase, isSupabaseConfigured } from '../lib/supabase.js';
import type { AppUser } from '../types.js';

export { isSupabaseConfigured };

const STORAGE_KEY_GUEST = 'openscrabble_guest_profile';

let _currentUser: AppUser | null = null;

export function getCurrentUser(): AppUser | null {
  return _currentUser;
}

export function setCurrentUser(user: AppUser | null): void {
  _currentUser = user;
}

/**
 * Load a guest profile from localStorage.
 */
export function loadGuestProfile(): AppUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUEST);
    if (!raw) return null;
    return JSON.parse(raw) as AppUser;
  } catch {
    return null;
  }
}

/**
 * Save a guest profile to localStorage.
 */
export function saveGuestProfile(user: AppUser): void {
  try {
    localStorage.setItem(STORAGE_KEY_GUEST, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to save guest profile:', e);
  }
}

/**
 * Clear guest profile.
 */
export function clearGuestProfile(): void {
  localStorage.removeItem(STORAGE_KEY_GUEST);
}

/**
 * Check if the user has completed onboarding (has a profile).
 */
export function hasOnboarded(): boolean {
  const guest = loadGuestProfile();
  if (guest) return true;
  // Also check if they have a localStorage onboarding flag
  return localStorage.getItem('openscrabble_onboarded') === 'true';
}

/**
 * Mark onboarding as complete.
 */
export function markOnboarded(): void {
  localStorage.setItem('openscrabble_onboarded', 'true');
}

/**
 * Initiate Google sign-in via Supabase.
 * Returns true if the flow was started, false if Supabase is not configured.
 */
export async function signInWithGoogle(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });

  if (error) {
    console.warn('Google sign-in error:', error.message);
    return false;
  }
  return true;
}

/**
 * Sign out — clears Supabase session and guest profile.
 */
export async function signOut(): Promise<void> {
  clearGuestProfile();
  _currentUser = null;
  const supabase = await getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
}

/**
 * Restore a prior session (Supabase or guest).
 */
export async function restoreSession(): Promise<AppUser | null> {
  // First try Supabase session
  const supabase = await getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {
      const user: AppUser = {
        id: data.session.user.id,
        username: data.session.user.user_metadata?.preferred_username || data.session.user.email?.split('@')[0] || 'Player',
        displayName: data.session.user.user_metadata?.full_name || data.session.user.user_metadata?.preferred_username || 'Player',
        avatarUrl: data.session.user.user_metadata?.avatar_url || data.session.user.user_metadata?.picture,
        isGuest: false,
      };
      _currentUser = user;
      return user;
    }
  }

  // Fall back to guest profile
  const guest = loadGuestProfile();
  if (guest) {
    _currentUser = guest;
    return guest;
  }

  return null;
}
