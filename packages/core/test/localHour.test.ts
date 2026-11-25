import { describe, expect, it } from 'vitest';
import { localHour } from '../src/triage.js';

describe('localHour', () => {
  it('uses UTC when no zone is provided', () => {
    const noonUtc = Date.UTC(2026, 10, 26, 12, 0, 0);
    expect(localHour(noonUtc)).toBe(12);
  });

  it('converts to Africa/Nairobi (UTC+3)', () => {
    const noonUtc = Date.UTC(2026, 10, 26, 12, 0, 0);
    expect(localHour(noonUtc, 'Africa/Nairobi')).toBe(15);
  });
});
