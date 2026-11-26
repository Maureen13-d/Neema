import { describe, expect, it } from 'vitest';
import { evaluateTriage } from '../src/triage.js';
import type { TriageInput, VitalsMinute } from '../src/types.js';

const NOW = Date.UTC(2026, 10, 26, 2, 0, 0); // 05:00 Nairobi; rest context comes from markedResting

function minutes(count: number, hr: number, temp: number, endMs = NOW - 60_000): VitalsMinute[] {
  return Array.from({ length: count }, (_, i) => ({
    tsMs: endMs - (count - 1 - i) * 60_000,
    hrMean: hr,
    hrMin: hr - 2,
    hrMax: hr + 2,
    tempMeanC: temp,
    validFraction: 1,
  }));
}

function input(over: Partial<TriageInput>): TriageInput {
  return {
    nowMs: NOW,
    stage: 'postpartum',
    vitals: minutes(5, 74, 36.6),
    bp: [],
    symptoms: [],
    sosActive: false,
    markedResting: true,
    baselineZ: { hr: null, temp: null },
    ...over,
  };
}

describe('triage time windows', () => {
  it('treats stale band data as UNKNOWN, never GREEN (R11)', () => {
    const result = evaluateTriage(input({ vitals: minutes(5, 74, 36.6, NOW - 20 * 60_000) }));
    expect(result.level).toBe('UNKNOWN');
    expect(result.firedRules).toContain('R11_SIGNAL_INVALID');
  });

  it('does not confirm fever from two hot minutes (needs readings 10 minutes apart)', () => {
    const vitals = [...minutes(8, 76, 36.6, NOW - 3 * 60_000), ...minutes(2, 76, 38.4)];
    const result = evaluateTriage(input({ vitals }));
    expect(result.firedRules).not.toContain('R6_FEVER');
    expect(result.level).toBe('GREEN');
  });

  it('confirms fever once hot readings span 10 minutes (R6)', () => {
    const result = evaluateTriage(input({ stage: 'pregnancy', gestationWeeks: 30, vitals: minutes(10, 80, 38.2) }));
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R6_FEVER');
  });

  it('does not escalate to R7 when the fast pulse lasts only a few minutes', () => {
    const vitals = minutes(10, 90, 38.4).map((m, i) => (i >= 7 ? { ...m, hrMean: 120 } : m));
    const result = evaluateTriage(input({ vitals }));
    expect(result.firedRules).toContain('R6_FEVER');
    expect(result.firedRules).not.toContain('R7_FEVER_FAST_PULSE_POSTPARTUM');
    expect(result.level).toBe('YELLOW');
  });

  it('ignores one invalid minute inside a sustained fever window', () => {
    const vitals = minutes(11, 118, 38.4).map((m, i) => (i === 4 ? { ...m, tempMeanC: null, hrMean: null } : m));
    const result = evaluateTriage(input({ vitals }));
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R7_FEVER_FAST_PULSE_POSTPARTUM');
  });

  it('does not apply the postpartum fast-pulse rule in pregnancy', () => {
    const result = evaluateTriage(input({ stage: 'pregnancy', gestationWeeks: 30, vitals: minutes(12, 118, 38.4) }));
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).not.toContain('R7_FEVER_FAST_PULSE_POSTPARTUM');
  });

  it('fires R8 from resting baseline z without a sustained-minute gate (brief)', () => {
    // Brief §7.2: R8 is resting HR z ≥ 2. Sustained-window logic was removed with the nested config.
    const result = evaluateTriage(
      input({ baselineZ: { hr: 3.1, temp: null }, vitals: minutes(3, 104, 36.6) }),
    );
    expect(result.firedRules).toContain('R8_PULSE_ABOVE_BASELINE');
    expect(result.level).toBe('YELLOW');
  });

  it('keeps a raised-BP YELLOW even when band data is stale', () => {
    const result = evaluateTriage(
      input({
        vitals: [],
        bp: [{ id: 'b', tsMs: NOW - 60_000, systolic: 146, diastolic: 92, enteredBy: 'mother', source: 'home_cuff' }],
      }),
    );
    expect(result.level).toBe('YELLOW');
  });
});
