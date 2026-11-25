/**
 * Scripted demo scenarios A–D from the project documentation.
 * Produces identical triage inputs so the stage story works without hardware.
 */

import type {
  BpReading,
  SymptomReport,
  TriageInput,
  TriageLevel,
  VitalsMinute,
} from './types.js';

export type DemoScenarioId = 'A' | 'B_yellow' | 'B_settled' | 'C' | 'D';

export interface DemoScenario {
  id: DemoScenarioId;
  title: string;
  /** Expected triage level after evaluateTriage. */
  expectedLevel: TriageLevel;
  /** Expected rule ids that should appear (subset match). */
  expectedRules: string[];
  buildInput(nowMs?: number): TriageInput;
}

function minute(tsMs: number, hr: number, temp: number): VitalsMinute {
  return {
    tsMs,
    hrMean: hr,
    hrMin: hr - 2,
    hrMax: hr + 2,
    tempMeanC: temp,
    validFraction: 1,
  };
}

function bp(id: string, tsMs: number, systolic: number, diastolic: number): BpReading {
  return {
    id,
    tsMs,
    systolic,
    diastolic,
    enteredBy: 'mother',
    source: 'home_cuff',
  };
}

function symptoms(id: string, tsMs: number, codes: SymptomReport['codes']): SymptomReport {
  return { id, tsMs, codes, inputMethod: 'tap' };
}

function restingBase(nowMs: number, over: Partial<TriageInput>): TriageInput {
  return {
    nowMs,
    stage: 'pregnancy',
    gestationWeeks: 32,
    vitals: [minute(nowMs - 60_000, 74, 36.6)],
    bp: [],
    symptoms: [],
    sosActive: false,
    markedResting: true,
    baselineZ: { hr: null, temp: null },
    ...over,
  };
}

/** Scenario A: good night — GREEN. */
export const scenarioA: DemoScenario = {
  id: 'A',
  title: 'Good night',
  expectedLevel: 'GREEN',
  expectedRules: ['R12_NOTHING_CONCERNING'],
  buildInput(nowMs = Date.now()) {
    const vitals = [70, 72, 74, 76, 78].map((hr, i) =>
      minute(nowMs - (4 - i) * 60_000, hr, 36.4 + i * 0.05),
    );
    return restingBase(nowMs, { vitals });
  },
};

/** Scenario B warning: raised BP, no symptoms — YELLOW. */
export const scenarioBYellow: DemoScenario = {
  id: 'B_yellow',
  title: 'Warning that needs recheck',
  expectedLevel: 'YELLOW',
  expectedRules: ['R2_RAISED_BP'],
  buildInput(nowMs = Date.now()) {
    return restingBase(nowMs, {
      bp: [bp('b1', nowMs - 60_000, 146, 92)],
    });
  },
};

/** Scenario B settled: recheck BP normal — GREEN. */
export const scenarioBSettled: DemoScenario = {
  id: 'B_settled',
  title: 'Warning that settles',
  expectedLevel: 'GREEN',
  expectedRules: ['R12_NOTHING_CONCERNING'],
  buildInput(nowMs = Date.now()) {
    return restingBase(nowMs, {
      bp: [
        bp('b1', nowMs - 50 * 60_000, 146, 92),
        bp('b2', nowMs - 60_000, 138, 88),
      ],
    });
  },
};

/** Scenario C: emergency BP + symptoms — RED. */
export const scenarioC: DemoScenario = {
  id: 'C',
  title: 'Emergency',
  expectedLevel: 'RED',
  expectedRules: ['R1_SEVERE_BP'],
  buildInput(nowMs = Date.now()) {
    return restingBase(nowMs, {
      bp: [bp('c1', nowMs - 30_000, 168, 112)],
      symptoms: [symptoms('s1', nowMs - 20_000, ['headache', 'blurred_vision'])],
    });
  },
};

/** Scenario D: postpartum fever + fast pulse — RED. */
export const scenarioD: DemoScenario = {
  id: 'D',
  title: 'Postpartum infection (band-driven)',
  expectedLevel: 'RED',
  expectedRules: ['R7_FEVER_FAST_PULSE_POSTPARTUM'],
  buildInput(nowMs = Date.now()) {
    const vitals: VitalsMinute[] = [];
    for (let i = 0; i < 12; i++) {
      vitals.push(minute(nowMs - (11 - i) * 60_000, 118, 38.4));
    }
    return {
      nowMs,
      stage: 'postpartum',
      vitals,
      bp: [],
      symptoms: [],
      sosActive: false,
      markedResting: true,
      baselineZ: { hr: null, temp: null },
    };
  },
};

/** All demo scenarios used by tests and the harness. */
export const DEMO_SCENARIOS: DemoScenario[] = [
  scenarioA,
  scenarioBYellow,
  scenarioBSettled,
  scenarioC,
  scenarioD,
];

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  const found = DEMO_SCENARIOS.find((s) => s.id === id);
  if (!found) throw new Error(`Unknown demo scenario: ${id}`);
  return found;
}
