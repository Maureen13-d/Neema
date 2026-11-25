/**
 * Loads recent local data and runs evaluateTriage.
 * Sticky RED is enforced here via the active alert record.
 */

import {
  evaluateTriage,
  zScore,
  type BpReading,
  type Stage,
  type SymptomReport,
  type TriageResult,
} from '@neema/core';
import { db } from '../storage/db';

export interface RunnerOptions {
  nowMs?: number;
  stage: Stage;
  gestationWeeks?: number;
  sosActive: boolean;
  markedResting: boolean;
  /** When set, RED remains until acknowledged even if rules would clear. */
  stickyRed?: TriageResult | null;
}

/**
 * Runs triage against IndexedDB history + current SOS/rest flags.
 */
export async function runTriage(options: RunnerOptions): Promise<TriageResult> {
  if (options.stickyRed && options.stickyRed.level === 'RED') {
    const active = await db.alerts.orderBy('tsMs').reverse().first();
    if (active && active.level === 'RED' && active.acknowledgedAtMs === undefined) {
      return { ...options.stickyRed, evaluatedAtMs: options.nowMs ?? Date.now() };
    }
  }

  const nowMs = options.nowMs ?? Date.now();
  const since = nowMs - 30 * 60_000;
  const vitals = await db.vitalsMinutes.where('tsMs').aboveOrEqual(since).sortBy('tsMs');
  const bp = (await db.bp.orderBy('tsMs').toArray()).filter((b) => b.tsMs >= since) as BpReading[];
  const symptoms = (await db.symptoms.orderBy('tsMs').toArray()).filter(
    (s) => s.tsMs >= since,
  ) as SymptomReport[];

  const hrBaseline = await db.baseline.get('hr');
  const tempBaseline = await db.baseline.get('temp');
  const latest = vitals[vitals.length - 1];

  const result = evaluateTriage({
    nowMs,
    stage: options.stage,
    gestationWeeks: options.gestationWeeks,
    vitals,
    bp,
    symptoms,
    sosActive: options.sosActive,
    markedResting: options.markedResting,
    baselineZ: {
      hr:
        hrBaseline && latest?.hrMean !== null && latest?.hrMean !== undefined
          ? zScore(
              {
                signal: 'hr',
                mean: hrBaseline.mean,
                variance: hrBaseline.variance,
                samples: hrBaseline.samples,
                lastUpdatedMs: hrBaseline.lastUpdatedMs,
                ready: hrBaseline.ready,
              },
              latest.hrMean,
            )
          : null,
      temp:
        tempBaseline && latest?.tempMeanC !== null && latest?.tempMeanC !== undefined
          ? zScore(
              {
                signal: 'temp',
                mean: tempBaseline.mean,
                variance: tempBaseline.variance,
                samples: tempBaseline.samples,
                lastUpdatedMs: tempBaseline.lastUpdatedMs,
                ready: tempBaseline.ready,
              },
              latest.tempMeanC,
            )
          : null,
    },
  });

  return result;
}
