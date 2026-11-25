/**
 * Simple multi-day trend slope for night-time resting vitals.
 * Complements the personal baseline: detects slow drift thresholds miss.
 * Decision support only — may inform a future YELLOW flag, never lowers RED.
 */

import type { VitalsMinute } from './types.js';

export type TrendSignal = 'hr' | 'temp';

export interface TrendPoint {
  /** Day start timestamp (ms). */
  dayTsMs: number;
  /** Mean of resting minute samples that day. */
  mean: number;
}

export interface TrendResult {
  signal: TrendSignal;
  /** Ordinary least-squares slope: units per day. */
  slopePerDay: number;
  points: TrendPoint[];
  /** True when enough days and slope exceeds the configured threshold. */
  rising: boolean;
}

export interface TrendOptions {
  /** Minimum distinct days required (default 3). */
  minDays?: number;
  /** Slope threshold in units/day (HR default 2 bpm/day, temp 0.1 C/day). */
  risingThreshold?: number;
}

/**
 * Builds daily means from minute rows, oldest first, then OLS slope.
 * Pass only resting/night minutes — caller is responsible for filtering.
 */
export function computeTrendSlope(
  signal: TrendSignal,
  minutes: VitalsMinute[],
  opts: TrendOptions = {},
): TrendResult | null {
  const minDays = opts.minDays ?? 3;
  const risingThreshold =
    opts.risingThreshold ?? (signal === 'hr' ? 2 : 0.1);

  const byDay = new Map<number, number[]>();
  for (const m of minutes) {
    const value = signal === 'hr' ? m.hrMean : m.tempMeanC;
    if (value === null) continue;
    const day = m.tsMs - (m.tsMs % 86_400_000);
    const list = byDay.get(day) ?? [];
    list.push(value);
    byDay.set(day, list);
  }

  const points: TrendPoint[] = [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([dayTsMs, vals]) => ({
      dayTsMs,
      mean: vals.reduce((a, b) => a + b, 0) / vals.length,
    }));

  if (points.length < minDays) return null;

  // OLS on x = day index, y = mean
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = points[i]!.mean;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const denom = n * sumXX - sumX * sumX;
  const slopePerDay = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;

  return {
    signal,
    slopePerDay,
    points,
    rising: slopePerDay >= risingThreshold,
  };
}
