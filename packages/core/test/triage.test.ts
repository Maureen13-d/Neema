import { describe, expect, it } from 'vitest';
import { evaluateTriage } from '../src/triage.js';
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

describe('evaluateTriage', () => {
  it('returns GREEN when nothing concerning', () => {
    const result = evaluateTriage(baseInput());
    expect(result.level).toBe('GREEN');
    expect(result.firedRules).toContain('R12_NOTHING_CONCERNING');
  });

  it('returns UNKNOWN when band signal is invalid and no other inputs', () => {
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
    expect(result.messageKey).toBe('unknown_check_band');
  });

  it('raises RED for severe BP (R1)', () => {
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

  it('raises YELLOW for raised BP then RED with warning symptom (R2/R3)', () => {
    const yellow = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 146,
            diastolic: 92,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
      }),
    );
    expect(yellow.level).toBe('YELLOW');
    expect(yellow.firedRules).toContain('R2_RAISED_BP');
    expect(yellow.recheckInMinutes).toBeDefined();

    const red = evaluateTriage(
      baseInput({
        bp: [
          {
            id: '1',
            tsMs: 1,
            systolic: 146,
            diastolic: 92,
            enteredBy: 'mother',
            source: 'home_cuff',
          },
        ],
        symptoms: [
          {
            id: 's1',
            tsMs: 2,
            codes: ['headache', 'blurred_vision'],
            inputMethod: 'tap',
          },
        ],
      }),
    );
    expect(red.level).toBe('RED');
    expect(red.firedRules).toContain('R3_RAISED_BP_WITH_SYMPTOM');
  });

  it('raises RED for heavy bleeding (R5)', () => {
    const result = evaluateTriage(
      baseInput({
        symptoms: [{ id: 's', tsMs: 1, codes: ['heavy_bleeding'], inputMethod: 'tap' }],
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R5_HEAVY_BLEEDING');
  });

  it('raises RED on SOS (R9)', () => {
    const result = evaluateTriage(baseInput({ sosActive: true }));
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R9_SOS');
  });

  it('escalates postpartum fever + fast pulse to RED (R7)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const vitals: VitalsMinute[] = [];
    for (let i = 0; i < 12; i++) {
      vitals.push({
        tsMs: now - (11 - i) * 60_000,
        hrMean: 118,
        hrMin: 115,
        hrMax: 120,
        tempMeanC: 38.4,
        validFraction: 1,
      });
    }
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        stage: 'postpartum',
        vitals,
        markedResting: true,
      }),
    );
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R7_FEVER_FAST_PULSE_POSTPARTUM');
  });

  it('allows baseline z-score only to escalate to YELLOW (R8)', () => {
    const result = evaluateTriage(
      baseInput({
        baselineZ: { hr: 3.2, temp: null },
        markedResting: true,
        vitals: Array.from({ length: 12 }, (_, i) => ({
          tsMs: Date.UTC(2026, 10, 26, 2, 0, 0) - (11 - i) * 60_000,
          hrMean: 110,
          hrMin: 108,
          hrMax: 112,
          tempMeanC: 36.7,
          validFraction: 1,
        })),
      }),
    );
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R8_PULSE_ABOVE_BASELINE');
  });

  it('raises RED when raised BP persists on recheck (R4)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const result = evaluateTriage(
      baseInput({
        nowMs: now,
        bp: [
          {
            id: '1',
            tsMs: now - 45 * 60_000,
            systolic: 146,
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

  it('raises YELLOW for sustained fever (R6)', () => {
    const now = Date.UTC(2026, 10, 26, 2, 0, 0);
    const vitals: VitalsMinute[] = [];
    for (let i = 0; i < 12; i++) {
      vitals.push({
        tsMs: now - (11 - i) * 60_000,
        hrMean: 80,
        hrMin: 78,
        hrMax: 82,
        tempMeanC: 38.2,
        validFraction: 1,
      });
    }
    const result = evaluateTriage(baseInput({ nowMs: now, stage: 'pregnancy', vitals }));
    expect(result.level).toBe('YELLOW');
    expect(result.firedRules).toContain('R6_FEVER');
  });

  it('raises YELLOW for reduced baby movement at >=28 weeks (R10)', () => {
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

  it('never treats UNKNOWN as GREEN when signal is bad', () => {
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
    expect(result.level).not.toBe('GREEN');
    expect(result.level).toBe('UNKNOWN');
  });

  it('keeps RED when SOS fires even if vitals look fine', () => {
    const result = evaluateTriage(baseInput({ sosActive: true }));
    expect(result.level).toBe('RED');
    expect(result.firedRules).toContain('R9_SOS');
  });
});
