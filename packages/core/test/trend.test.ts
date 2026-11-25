import { describe, expect, it } from 'vitest';
import { computeTrendSlope } from '../src/trend.js';
import type { VitalsMinute } from '../src/types.js';

function dayMinutes(dayIndex: number, hr: number): VitalsMinute[] {
  const day = Date.UTC(2026, 10, 1 + dayIndex);
  return [0, 1, 2].map((h) => ({
    tsMs: day + h * 60_000,
    hrMean: hr,
    hrMin: hr - 1,
    hrMax: hr + 1,
    tempMeanC: 36.5,
    validFraction: 1,
  }));
}

describe('computeTrendSlope', () => {
  it('detects a rising HR trend across days', () => {
    const minutes = [
      ...dayMinutes(0, 70),
      ...dayMinutes(1, 74),
      ...dayMinutes(2, 78),
      ...dayMinutes(3, 82),
    ];
    const trend = computeTrendSlope('hr', minutes);
    expect(trend).not.toBeNull();
    expect(trend!.slopePerDay).toBeGreaterThan(2);
    expect(trend!.rising).toBe(true);
  });

  it('returns null with fewer than minDays', () => {
    const minutes = [...dayMinutes(0, 70), ...dayMinutes(1, 72)];
    expect(computeTrendSlope('hr', minutes)).toBeNull();
  });
});
