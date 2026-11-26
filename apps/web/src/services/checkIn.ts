/**
 * Daily check-in (energy + mood). CONTEXT ONLY — triage never reads these.
 */

import type { CheckIn } from '@neema/core';
import { db } from '../storage/db';

export async function saveCheckIn(
  energy: number,
  mood: CheckIn['mood'],
  nowMs: number = Date.now(),
): Promise<CheckIn> {
  const row: CheckIn = {
    id: crypto.randomUUID(),
    tsMs: nowMs,
    energy: Math.max(0, Math.min(100, Math.round(energy))),
    mood,
  };
  await db.checkins.put(row);
  return row;
}

export async function latestCheckInToday(nowMs: number = Date.now()): Promise<CheckIn | null> {
  const start = new Date(nowMs);
  start.setHours(0, 0, 0, 0);
  const rows = await db.checkins.where('tsMs').aboveOrEqual(start.getTime()).sortBy('tsMs');
  return rows.at(-1) ?? null;
}
