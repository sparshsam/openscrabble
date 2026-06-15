/**
 * DictionaryLoader — lazy-loads the word list from its separate chunk.
 *
 * The large word array (~938 KB) lives in src/data/wordList.ts, which Vite
 * automatically code-splits when dynamically imported. This module handles
 * caching the loaded set so callers don't need to await more than once.
 */

type WordSet = ReadonlySet<string>;

let cachedSet: WordSet | null = null;
let loadPromise: Promise<WordSet> | null = null;

/**
 * Load the word set. Returns a cached copy on subsequent calls.
 * The 2-letter word list is always available; longer words come from this set.
 */
export async function loadWordSet(): Promise<WordSet> {
  if (cachedSet) return cachedSet;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const mod = await import('../data/wordList.js');
    cachedSet = mod.WORD_SET as WordSet;
    return cachedSet;
  })();

  return loadPromise;
}

/**
 * Check whether the word set has been loaded.
 */
export function isWordSetLoaded(): boolean {
  return cachedSet !== null;
}

/**
 * Get the cached word set synchronously if already loaded.
 */
export function getCachedWordSet(): WordSet | null {
  return cachedSet;
}
