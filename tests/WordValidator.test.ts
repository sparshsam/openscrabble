import { describe, it, expect } from 'vitest';
import { WordValidator } from '../src/game/WordValidator.js';
import { WORD_SET } from '../src/data/wordList.js';

describe('WordValidator', () => {
  it('recognizes valid words', () => {
    expect(WordValidator.isValid('cat')).toBe(true);
    expect(WordValidator.isValid('dog')).toBe(true);
    expect(WordValidator.isValid('hello')).toBe(true);
    expect(WordValidator.isValid('world')).toBe(true);
    expect(WordValidator.isValid('game')).toBe(true);
  });

  it('rejects invalid words', () => {
    expect(WordValidator.isValid('xyzw')).toBe(false);
    expect(WordValidator.isValid('qzzq')).toBe(false);
    expect(WordValidator.isValid('asdfgh')).toBe(false);
  });

  it('rejects single-letter inputs', () => {
    expect(WordValidator.isValid('a')).toBe(false);
    expect(WordValidator.isValid('i')).toBe(false);
    // Two-letter words should work (e.g., 'aa', 'ab')
    expect(WordValidator.isValid('aa')).toBe(true);
  });

  it('handles uppercase and mixed case', () => {
    expect(WordValidator.isValid('CAT')).toBe(true);
    expect(WordValidator.isValid('Dog')).toBe(true);
    expect(WordValidator.isValid('HeLLo')).toBe(true);
  });

  it('strips non-alpha characters', () => {
    expect(WordValidator.isValid("cat's")).toBe(true);  // cats after stripping
    expect(WordValidator.isValid('hello!')).toBe(true);
  });

  it('finds invalid words from a list', () => {
    const result = WordValidator.findInvalid(['cat', 'xyzw', 'dog', 'qzzq', 'hello']);
    expect(result.length).toBe(2);
    expect(result[0]!.word).toBe('xyzw');
    expect(result[1]!.word).toBe('qzzq');
  });

  it('returns empty array for all-valid list', () => {
    const result = WordValidator.findInvalid(['cat', 'dog', 'hello']);
    expect(result.length).toBe(0);
  });

  it('allValid returns true only when all words valid', () => {
    expect(WordValidator.allValid(['cat', 'dog'])).toBe(true);
    expect(WordValidator.allValid(['cat', 'xyzw'])).toBe(false);
  });

  it('dictionary contains expected word count', () => {
    expect(WordValidator.getDictionarySize()).toBeGreaterThan(50000);
    expect(WordValidator.getDictionarySize()).toBe(WORD_SET.size);
  });

  it('contains common Scrabble words', () => {
    const commonWords = [
      'cat', 'dog', 'hat', 'run', 'big', 'word', 'game', 'board',
      'tile', 'pick', 'rack', 'pass', 'swap', 'score', 'point',
      'apple', 'bread', 'chair', 'dance', 'eagle', 'flame', 'blue',
      'red', 'play', 'hand', 'turn', 'move', 'form', 'list', 'zero',
      'best', 'back', 'font', 'exit', 'quit', 'open', 'save', 'type',
    ];
    for (const w of commonWords) {
      expect(WordValidator.isValid(w)).toBe(true);
    }
  });
});
