import { WORD_SET } from '../data/wordList.js';

/**
 * Official Scrabble 2-letter word list (TWL/NASPA standard).
 * The main WORD_SET may contain spurious 2-letter abbreviations,
 * so any 2-letter word must pass this explicit check.
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

/**
 * Validates words against the built-in word list.
 * Pure function — no side effects, fully testable.
 *
 * For 2-letter words, validates against the official Scrabble list.
 * Longer words are checked against the full dictionary WORD_SET.
 */
export class WordValidator {
  /**
   * Check if a single word is valid.
   * Words are normalized to lowercase for lookup.
   * 2-letter words must be in the official Scrabble list.
   */
  static isValid(word: string): boolean {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized.length < 2) return false;
    // 2-letter words validated against official Scrabble list
    if (normalized.length === 2) {
      return OFFICIAL_TWO_LETTER.has(normalized);
    }
    return WORD_SET.has(normalized);
  }

  /**
   * Validate multiple words and return only the invalid ones with details.
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
   * Get the total word count in the dictionary.
   */
  static getDictionarySize(): number {
    return WORD_SET.size;
  }
}
