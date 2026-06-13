import { WORD_SET } from '../data/wordList.js';

/**
 * Validates words against the built-in word list.
 * Pure function — no side effects, fully testable.
 */
export class WordValidator {
  /**
   * Check if a single word is valid.
   * Words are normalized to lowercase for lookup.
   */
  static isValid(word: string): boolean {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, '');
    if (normalized.length < 2) return false;
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
