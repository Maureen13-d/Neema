/**
 * Aggregates per-second samples into per-minute rows and applies temp calibration.
 * Per-second values stay in memory only.
 */

import {
  getDefaultTriageConfig,
  summariseMinute,
  type VitalsMinute,
  type VitalsSample,
} from '@neema/core';
import { db, enforceVitalsRetention } from '../storage/db';
import { ingestMinuteIntoBaseline } from './baselineStore';

export interface PipelineOptions {
  /** When true (default), sealed minutes update the personal baseline. */
  updateBaseline?: boolean;
  /** Resting gate for baseline learning; default true until motion sensing exists. */
  markedResting?: boolean;
}

export interface PipelineState {
  currentMinute: VitalsMinute | null;
  lastSample: VitalsSample | null;
  recentSamples: VitalsSample[];
}

/**
 * Creates an in-memory vitals pipeline that writes one minute row per wall clock minute.
 */
export function createVitalsPipeline(options: PipelineOptions = {}) {
  let currentKey = -1;
  let bucket: VitalsSample[] = [];
  let lastSample: VitalsSample | null = null;
  const recentSamples: VitalsSample[] = [];
  const config = getDefaultTriageConfig();
  const shouldUpdateBaseline = options.updateBaseline !== false;

  async function flush(minuteStart: number, samples: VitalsSample[]) {
    if (samples.length === 0) return;
    const row = summariseMinute(samples, minuteStart, config.tempCalibrationOffsetC);
    await db.vitalsMinutes.put(row);
    await enforceVitalsRetention();
    if (shouldUpdateBaseline) {
      await ingestMinuteIntoBaseline(row, { resting: options.markedResting !== false });
    }
  }

  return {
    /** Ingest one sample. Returns the open minute aggregate (not yet sealed). */
    async ingest(sample: VitalsSample): Promise<PipelineState> {
      lastSample = sample;
      recentSamples.push(sample);
      if (recentSamples.length > 120) recentSamples.shift();

      const minuteStart = sample.tsMs - (sample.tsMs % 60_000);
      if (currentKey === -1) currentKey = minuteStart;
      if (minuteStart !== currentKey) {
        await flush(currentKey, bucket);
        bucket = [];
        currentKey = minuteStart;
      }
      bucket.push(sample);

      return {
        lastSample,
        recentSamples: [...recentSamples],
        currentMinute: summariseMinute(bucket, minuteStart, config.tempCalibrationOffsetC),
      };
    },
    getState(): PipelineState {
      return { lastSample, recentSamples: [...recentSamples], currentMinute: null };
    },
  };
}
