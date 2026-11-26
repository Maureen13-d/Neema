/**
 * Follow-up / chase-list service for CHP handoff after YELLOW or RED.
 * Opens a loop per alert; advances watch→warn→act→chase on a timer.
 * Only a CHP or nurse may confirm arrival.
 */

import {
  advanceFollowUp,
  chaseList,
  confirmArrival,
  openFollowUp,
  type FollowUp,
} from '@neema/core';
import { db } from '../storage/db';

/** Default step interval between watch → warn → act → chase (5 minutes). */
const DEFAULT_STEP_MS = 5 * 60_000;

/** Opens (or returns) a follow-up for this alert at watch. */
export async function ensureFollowUp(alertId: string): Promise<FollowUp> {
  const existing = await db.followups.get(alertId);
  if (existing) return existing;
  const row = openFollowUp(alertId);
  await db.followups.put(row);
  return row;
}

/** All open (not arrived) follow-ups, chase-ranked. */
export async function listChase(nowMs: number = Date.now()): Promise<FollowUp[]> {
  const all = await db.followups.toArray();
  return chaseList(all, nowMs);
}

/**
 * Advances every open loop that has waited long enough at its current stage.
 * Returns the loops that moved.
 */
export async function tickFollowUps(
  nowMs: number = Date.now(),
  stepMs: number = DEFAULT_STEP_MS,
): Promise<FollowUp[]> {
  const all = await db.followups.toArray();
  const moved: FollowUp[] = [];
  for (const row of all) {
    if (row.arrivalConfirmedAtMs !== undefined || row.stage === 'arrive') continue;
    const anchor = row.lastChaseAtMs ?? (await alertTs(row.alertId));
    if (nowMs - anchor < stepMs) continue;
    const next = advanceFollowUp(row, nowMs);
    if (next !== row && (next.stage !== row.stage || next.chaseCount !== row.chaseCount)) {
      await db.followups.put(next);
      moved.push(next);
    }
  }
  return moved;
}

/** Human-only arrival confirmation. */
export async function markArrival(
  alertId: string,
  by: 'chp' | 'nurse',
  nowMs: number = Date.now(),
): Promise<FollowUp | null> {
  const row = await db.followups.get(alertId);
  if (!row) return null;
  const next = confirmArrival(row, by, nowMs);
  await db.followups.put(next);
  return next;
}

async function alertTs(alertId: string): Promise<number> {
  const alert = await db.alerts.get(alertId);
  return alert?.tsMs ?? Date.now();
}
