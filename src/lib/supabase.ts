/**
 * Supabase client factory.
 * Gracefully degrades when VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.
 * The app works fully in guest/offline mode without Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _initialized = false;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseConfig() !== null;
}

export function isSupabaseInitialized(): boolean {
  return _initialized;
}

/**
 * Initialize and return the Supabase client.
 * Returns null if not configured.
 */
export async function initSupabase(): Promise<SupabaseClient | null> {
  if (_client) return _client;
  const config = getSupabaseConfig();
  if (!config) {
    _initialized = true;
    return null;
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    _initialized = true;
    return _client;
  } catch (e) {
    console.warn('Failed to initialize Supabase client:', e);
    _initialized = true;
    return null;
  }
}

export async function getSupabase(): Promise<SupabaseClient | null> {
  if (!_client) {
    return await initSupabase();
  }
  return _client;
}
