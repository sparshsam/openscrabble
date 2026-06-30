import { describe, it, expect, beforeAll } from 'vitest';
import { WordValidator } from '../src/game/WordValidator.js';
import { WORD_SET } from '../src/data/wordList.js';
import { loadWordSet, isWordSetLoaded } from '../src/game/DictionaryLoader.js';

describe('WordValidator', () => {
  beforeAll(async () => {
    if (!isWordSetLoaded()) {
      await loadWordSet();
    }
  });
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

  // ─── 2-Letter Word Validation ──────────────

  it('accepts all official Scrabble 2-letter words', () => {
    const officialTwoLetter = [
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
    ];
    for (const w of officialTwoLetter) {
      expect(WordValidator.isValid(w)).toBe(true);
    }
  });

  it('rejects invalid 2-letter combinations', () => {
    const invalidTwoLetter = [
      'zx','qw','jx','qz','qy','zv','zj','jq','vq','wq',
      'wz','xq','xz','xk','zq','bb','bd','bf','bg','bh',
      'bj','bk','bm','bn','bp','bq','bt','bv','bw','bx',
      'xx','yy','zz','zs','zn','zo','zb','zc','zd','zf',
      'fs','gs','hs','js','ks','ls',
    ];
    for (const w of invalidTwoLetter) {
      expect(WordValidator.isValid(w)).toBe(false);
    }
  });

  // Specific regression: EW is a valid official Scrabble word
  it('accepts EW as a valid 2-letter word', () => {
    expect(WordValidator.isValid('EW')).toBe(true);
    expect(WordValidator.isValid('ew')).toBe(true);
  });

  it('accepts OK as a valid 2-letter word', () => {
    expect(WordValidator.isValid('OK')).toBe(true);
    expect(WordValidator.isValid('ok')).toBe(true);
  });

  it('accepts KO as a valid 2-letter word', () => {
    expect(WordValidator.isValid('KO')).toBe(true);
    expect(WordValidator.isValid('ko')).toBe(true);
  });

  // ─── v0.4.5 Dictionary Patch ──────────────────────────

  it('accepts LOONIE (v0.4.5 patch: missing SOWPODS word)', () => {
    expect(WordValidator.isValid('LOONIE')).toBe(true);
    expect(WordValidator.isValid('loonie')).toBe(true);
  });

  it('accepts TOONIE (v0.4.5 patch: Canadianism)', () => {
    expect(WordValidator.isValid('toonie')).toBe(true);
  });

  it('accepts POUTINE (v0.4.5 patch: common Collins word)', () => {
    expect(WordValidator.isValid('poutine')).toBe(true);
  });

  it('still rejects known invalid words after dictionary patch', () => {
    expect(WordValidator.isValid('xyzw')).toBe(false);
    expect(WordValidator.isValid('qzzq')).toBe(false);
    expect(WordValidator.isValid('asdfgh')).toBe(false);
  });
});
