import { describe, expect, it } from 'vitest';
import { buildEpdsResult, scoreEpds } from '../src/epds.js';

describe('scoreEpds', () => {
  it('sums reverse-scored items and leaves item 10 as-is', () => {
    // All zeros raw → reverse items become 3 each (1,2,4) → total 9
    const score = scoreEpds([0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 'postpartum');
    expect(score).toMatchObject({ total: 9, item10: 0, flagged: false, item10Flag: false });
    expect(score?.routeToPerson).toBe(false);
  });

  it('flags item 10 > 0 and routes to a person with no triage colour role', () => {
    const score = scoreEpds([3, 3, 0, 3, 0, 0, 0, 0, 0, 1], 'postpartum');
    expect(score?.item10Flag).toBe(true);
    expect(score?.routeToPerson).toBe(true);
    // EPDS never becomes a TriageLevel — callers must not map this to RED/YELLOW.
  });

  it('uses postpartum cut-off 10 and pregnancy cut-off 13', () => {
    // Raw all 1s: reverse 1,2,4 → 2 each; others 1 → 3*2 + 7*1 = 13
    const answers = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
    const post = scoreEpds(answers, 'postpartum');
    const preg = scoreEpds(answers, 'pregnancy');
    expect(post?.total).toBe(13);
    expect(post?.flagged).toBe(true);
    expect(preg?.flagged).toBe(true);
    expect(preg?.cutoffUsed).toBe(13);
  });

  it('rejects malformed answer lists', () => {
    expect(scoreEpds([0, 1, 2])).toBeNull();
    expect(scoreEpds(Array(10).fill(4))).toBeNull();
  });

  it('buildEpdsResult packages a storeable row', () => {
    const built = buildEpdsResult('e1', 1000, Array(10).fill(0), 'postpartum');
    expect(built?.result).toMatchObject({ id: 'e1', tsMs: 1000, total: 9, item10: 0 });
  });
});
