import { describe, expect, it } from 'vitest';
import { evaluateTriage } from '../src/triage.js';
import { DEMO_SCENARIOS } from '../src/demoScenarios.js';

describe('demo scenarios A–D', () => {
  for (const scenario of DEMO_SCENARIOS) {
    it(`${scenario.id}: ${scenario.title} → ${scenario.expectedLevel}`, () => {
      const result = evaluateTriage(scenario.buildInput(Date.UTC(2026, 10, 26, 2, 0, 0)));
      expect(result.level).toBe(scenario.expectedLevel);
      for (const rule of scenario.expectedRules) {
        expect(result.firedRules).toContain(rule);
      }
    });
  }
});
