import { getCachedWordSet } from './DictionaryLoader.js';

/**
 * Official Scrabble 2-letter word list (TWL/NASPA standard).
 * Always available — no lazy loading needed.
 */
const OFFICIAL_TWO_LETTER = new Set([
  'aa','ab','ad','ae','ag','ah','ai','al','am','an','ar','as','at','aw','ax','ay',
  'ba','be','bi','bo','by',
  'ch',
  'da','de','do',
  'ed','ef','eh','el','em','en','er','es','et','ew','ex',
  'fa','fe',
  'gi','go',
  'ha','he','hi','hm','ho',
  'id','if','in','is','it',
  'jo',
  'ka','ki','ko',
  'la','li','lo',
  'ma','me','mi','mm','mo','mu','my',
  'na','ne','no','nu',
  'od','oe','of','oh','oi','ok','om','on','op','or','os','ow','ox','oy',
  'pa','pe','pi','po',
  'qi',
  're',
  'sh','si','so',
  'ta','te','ti','to',
  'uh','um','un','up','us','ut',
  'we','wo',
  'xi','xu',
  'ya','ye','yo',
  'za',
]);

// v0.4.6: Rejected words — words present in the bundled dictionary that should
// not be accepted under Collins UK English-style dictionary enforcement.
// These may be fringe inclusions from the SOWPODS-derived source that don't
// belong in a standard Collins UK play dictionary.
const REJECTED_WORDS = new Set([
  "kil",   // not valid in standard Collins UK Scrabble play
]);

/**
 * Validates words against the built-in word list.
 * 2-letter words are validated immediately against the official list.
 * Longer words require the full dictionary to be loaded (via DictionaryLoader).
 */
export class WordValidator {
  /**
   * Check if a single word is valid.
   * Words are normalized to lowercase for lookup.
   * 2-letter words must be in the official Scrabble list.
   * Longer words check the loaded dictionary set.
   */
  static isValid(word: string): boolean {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized.length < 2) return false;
    // 2-letter words validated against official Scrabble list
    if (normalized.length === 2) {
      return OFFICIAL_TWO_LETTER.has(normalized);
    }
    // v0.4.6: Reject words in the rejection list (Collins enforcement)
    if (REJECTED_WORDS.has(normalized)) return false;
    // Longer words: check cached dictionary set (may return false if not yet loaded)
    const wordSet = getCachedWordSet();
    if (!wordSet) return false;
    return wordSet.has(normalized);
  }

  /**
   * Validate multiple words and return only the invalid ones.
   */
  static findInvalid(words: string[]): { word: string; index: number }[] {
    const invalid: { word: string; index: number }[] = [];
    for (let i = 0; i < words.length; i++) {
      const w = words[i]!;
      if (!this.isValid(w)) {
        invalid.push({ word: w, index: i });
      }
    }
    return invalid;
  }

  /**
   * Validate all words; returns true only if every word is valid.
   */
  static allValid(words: string[]): boolean {
    return words.every((w) => this.isValid(w));
  }

  /**
   * Get the total word count in the dictionary (0 if not yet loaded).
   */
  static getDictionarySize(): number {
    const wordSet = getCachedWordSet();
    return wordSet?.size ?? 0;
  }
}
