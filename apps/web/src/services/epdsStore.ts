/**
 * Persist EPDS answers and decide person-first routing.
 * Never maps a score onto GREEN/YELLOW/RED.
 */

import { buildEpdsResult, type EpdsResult, type EpdsScore, type Stage } from '@neema/core';
import { db } from '../storage/db';
import { loadProfile } from './passport';

export interface EpdsSaveOutcome {
  result: EpdsResult;
  score: EpdsScore;
  /** Supportive copy key — never a triage colour. */
  messageKey: 'epds_ok' | 'epds_talk_to_person';
}

/** Saves a completed EPDS and returns whether to route to a person. */
export async function saveEpds(
  answers: number[],
  nowMs: number = Date.now(),
): Promise<EpdsSaveOutcome | null> {
  const profile = await loadProfile().catch(() => null);
  const stage: Stage = profile?.stage ?? 'postpartum';
  const built = buildEpdsResult(crypto.randomUUID(), nowMs, answers, stage);
  if (!built) return null;
  await db.epds.put(built.result);
  return {
    result: built.result,
    score: built.score,
    messageKey: built.score.routeToPerson ? 'epds_talk_to_person' : 'epds_ok',
  };
}

export async function latestEpds(): Promise<EpdsResult | null> {
  const row = await db.epds.orderBy('tsMs').reverse().first();
  return row ?? null;
}
