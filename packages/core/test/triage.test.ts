import { describe, expect, it } from 'vitest';
import { evaluateTriage, getDefaultTriageConfig } from '../src/triage.js';
import type { TriageInput, VitalsMinute } from '../src/types.js';

function baseInput(over: Partial<TriageInput> = {}): TriageInput {
  const now = Date.UTC(2026, 10, 26, 2, 0, 0);
  const vitals: VitalsMinute[] = [
    {
      tsMs: now - 60_000,
      hrMean: 74,
      hrMin: 70,
      hrMax: 78,
      tempMeanC: 36.6,
      validFraction: 1,
    },
  ];
  return {
    nowMs: now,
    stage: 'pregnancy',
    gestationWeeks: 32,
    vitals,
    bp: [],
    symptoms: [],
    sosActive: false,
    markedResting: true,
    baselineZ: { hr: null, temp: null },
    ...over,
  };
}

function feverWindow(now: number, hr: number, temp: number): VitalsMinute[] {
  const vitals: VitalsMinute[] = [];
  for (let i = 0; i < 12; i++) {
    vitals.push({
      tsMs: now - (11 - i) * 60_000,
      hrMean: hr,
      hrMin: hr - 2,
      hrMax: hr + 2,
      tempMeanC: temp,
      validFraction: 1,
    });
  }
  return vitals;
}

describe('evaluateTriage', () => {
  it('returns GREEN when nothing concerning (R12)', () => {
    const result = evaluateTriage(baseInput());
    expect(result.level).toBe('GREEN');
    expect(result.firedRules).toContain('R12_NOTHING_CONCERNING');
  });

  it('returns UNKNOWN when no vitals, BP, or symptoms (R11)', () => {
    const result = evaluateTriage(
      baseInput({
        vitals: [
          {
            tsMs: 1,
            hrMean: null,
            hrMin: null,
            hrMax: null,
            tempMeanC: null,
            validFraction: 0,
          },
        ],
      }),
    );
    expect(result.level).toBe('UNKNOWN');
    expect(result.firedRules).toContain('R11_SIGNAL_INVALID');
    expect(result.level).not.toBe('GREEN');
  });

  it('raises RED for severe BP 162/112 (R1)', () => {
    const result = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 162,
            diastolic: 112,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R1_SEVERE_BP');
  });

  it('raises YELLOW for BP 142/92 alone with recheck (R2)', () => {
    const result = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 142,
            diastolic: 92,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R2_RAISED_BP');
    expect(result.recheckInMinutes).toBe(getDefaultTriageConfig().recheckMinutes);
  });

  it('raises RED for raised BP plus headache (R3)', () => {
    const result = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 142,
            diastolic: 92,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
        symptoms: [
          { id: 's1', tsMs: 2, codes: ['headache'], inputMethod: 'tap' },
        ],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R3_RAISED_BP_WITH_SYMPTOM');
  });

  it('raises RED for two raised BPs 20 minutes apart (R4)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        bp: [
          {
            id: '1',
            tsMs: now - 20 * 60_000,
            systolic: 142,
            diastolic: 92,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
          {
            id: '2',
            tsMs: now - 5_000,
            systolic: 144,
            diastolic: 91,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R4_RAISED_BP_PERSISTS');
  });

  it('raises RED for heavy bleeding with normal vitals (R5)', () => {
    const result = evaluateTriage(
      baseInput({
        symptoms: [{ id: 's', tsMs: 1, codes: ['heavy_bleeding'], inputMethod: 'tap' }],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R5_HEAVY_BLEEDING');
  });

  it('raises YELLOW for temp 38.3 over window in pregnancy (R6)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({ nowMs: now, stage: 'pregnancy', vitals: feverWindow(now, 80, 38.3) }),
    );
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R6_FEVER');
  });

  it('raises RED for postpartum fever + resting HR 108 (R7)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        stage: 'postpartum',
        vitals: feverWindow(now, 108, 38.3),
        markedResting: true,
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R7_FEVER_FAST_PULSE_POSTPARTUM');
  });

  it('raises YELLOW for resting HR z 2.4 (R8)', () => {
    const result = evaluateTriage(
      baseInput({
        baselineZ: { hr: 2.4, temp: null },
        markedResting: true,
      }),
    );
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R8_PULSE_ABOVE_BASELINE');
  });

  it('raises RED for shock index 1.1 with fresh BP (R13)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        markedResting: true,
        vitals: feverWindow(now, 110, 36.6),
        bp: [
          {
            id: '1',
            tsMs: now - 5 * 60_000,
            systolic: 100,
            diastolic: 60,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R13_SHOCK_INDEX');
  });

  it('does not fire R13 when BP is 45 minutes old', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        markedResting: true,
        vitals: feverWindow(now, 110, 36.6),
        bp: [
          {
            id: '1',
            tsMs: now - 45 * 60_000,
            systolic: 100,
            diastolic: 60,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.firedRules).not.toContain('R13_SHOCK_INDEX');
  });

  it('raises RED on SOS (R9)', () => {
    const result = evaluateTriage(baseInput({ sosActive: true }));
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R9_SOS');
  });

  it('does not fire R10 when postpartum', () => {
    const result = evaluateTriage(
      baseInput({
        stage: 'postpartum',
        symptoms: [
          { id: 's', tsMs: 1, codes: ['baby_moving_less'], inputMethod: 'tap' },
        ],
      }),
    );
    expect(result.firedRules).not.toContain('R10_REDUCED_BABY_MOVEMENT');
  });

  it('raises YELLOW for reduced baby movement in pregnancy (R10)', () => {
    const result = evaluateTriage(
      baseInput({
        gestationWeeks: 30,
        symptoms: [
          { id: 's', tsMs: 1, codes: ['baby_moving_less'], inputMethod: 'tap' },
        ],
      }),
    );
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R10_REDUCED_BABY_MOVEMENT');
  });

  it('raises at least YELLOW when signal lost but headache present (R14)', () => {
    const result = evaluateTriage(
      baseInput({
        vitals: [
          {
            tsMs: 1,
            hrMean: null,
            hrMin: null,
            hrMax: null,
            tempMeanC: null,
            validFraction: 0,
          },
        ],
        symptoms: [{ id: 's', tsMs: 2, codes: ['headache'], inputMethod: 'tap' }],
      }),
    );
    expect(['YELLOW', 'RED']).toContain(result.level);
    expect(result.firedRules).toContain('R14_SIGNAL_LOST_WITH_SYMPTOMS');
  });

  it('lets highest level win when R1 and R2 both apply', () => {
    const result = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 168,
            diastolic: 112,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R1_SEVERE_BP');
  });

  it('is pure: same input twice gives identical output', () => {
    const input = baseInput({
      bp: [
        {
          id: '1',
          tsMs: 1,
          systolic: 142,
          diastolic: 92,
          enteredBy: 'mother',
          source: 'home_cuff',
        },
      ],
    });
    expect(evaluateTriage(input)).toEqual(evaluateTriage(input));
  });
});
