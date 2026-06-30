/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseHash, buildHash, getInitialScreen } from '../src/lib/routes.js';

describe('route parsing', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('parses #hub', () => {
    window.location.hash = '#hub';
    const { screen, params } = parseHash();
    expect(screen).toBe('hub');
    expect(params).toEqual({});
  });

  it('parses #game?gameId=abc-123', () => {
    window.location.hash = '#game?gameId=abc-123';
    const { screen, params } = parseHash();
    expect(screen).toBe('game');
    expect(params.gameId).toBe('abc-123');
  });

  it('parses #new-game', () => {
    window.location.hash = '#new-game';
    const { screen } = parseHash();
    expect(screen).toBe('new-game');
  });

  it('parses #profile', () => {
    window.location.hash = '#profile';
    const { screen } = parseHash();
    expect(screen).toBe('profile');
  });

  it('parses #history', () => {
    window.location.hash = '#history';
    const { screen } = parseHash();
    expect(screen).toBe('history');
  });

  it('parses #settings', () => {
    window.location.hash = '#settings';
    const { screen } = parseHash();
    expect(screen).toBe('settings');
  });

  it('parses #onboarding', () => {
    window.location.hash = '#onboarding';
    const { screen } = parseHash();
    expect(screen).toBe('onboarding');
  });

  it('defaults unknown hash to hub', () => {
    window.location.hash = '#unknown';
    const { screen } = parseHash();
    expect(screen).toBe('hub');
  });

  it('parses empty hash as hub', () => {
    window.location.hash = '';
    const { screen } = parseHash();
    expect(screen).toBe('hub');
  });

  it('parses gameId from buildHash round-trip', () => {
    const hash = buildHash('game', { gameId: 'test-uuid-123' });
    window.location.hash = `#${hash}`;
    const { screen, params } = parseHash();
    expect(screen).toBe('game');
    expect(params.gameId).toBe('test-uuid-123');
  });

  it('handles UUID gameId', () => {
    const hash = buildHash('game', { gameId: '550e8400-e29b-41d4-a716-446655440000' });
    window.location.hash = `#${hash}`;
    const { screen, params } = parseHash();
    expect(screen).toBe('game');
    expect(params.gameId).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});

describe('buildHash', () => {
  it('builds simple screen hash', () => {
    expect(buildHash('hub', {})).toBe('hub');
  });

  it('builds game hash with gameId', () => {
    expect(buildHash('game', { gameId: 'test-id' })).toBe('game?gameId=test-id');
  });

  it('builds new-game hash', () => {
    expect(buildHash('new-game', {})).toBe('new-game');
  });
});
