import { describe, expect, it } from 'vitest';
import { createBaseline, updateBaseline, zScore } from '../src/baseline.js';

describe('baseline', () => {
  it('stays silent during learning period', () => {
    let state = createBaseline('hr', 0);
    let z: number | null = null;
    for (let i = 0; i < 10; i++) {
      const updated = updateBaseline(state, 70 + (i % 3), i * 1000, { minSamples: 100 });
      state = updated.state;
      z = updated.z;
    }
    expect(state.ready).toBe(false);
    expect(z).toBeNull();
    expect(zScore(state, 90)).toBeNull();
  });

  it('reports high z when ready and value drifts', () => {
    let state = createBaseline('hr', 0);
    for (let i = 0; i < 50; i++) {
      // Tiny jitter so variance is non-zero but mean stays near 70.
      state = updateBaseline(state, 70 + (i % 2 === 0 ? 0.2 : -0.2), i, {
        minSamples: 20,
        alpha: 0.05,
      }).state;
    }
    expect(state.ready).toBe(true);
    const z = zScore(state, 90);
    expect(z).not.toBeNull();
    expect(z!).toBeGreaterThan(2.5);
  });
});
