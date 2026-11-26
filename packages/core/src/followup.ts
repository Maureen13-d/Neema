/**
 * CareLoop-style follow-up loops after YELLOW/RED alerts.
 * The app may advance watch → warn → act → chase.
 * ONLY a CHP or nurse may set arrival.
 */

import type { FollowUp, LoopStage } from './types.js';

const ADVANCE_ORDER: LoopStage[] = ['watch', 'warn', 'act', 'chase'];

/** Opens a new follow-up loop for an alert at the watch stage. */
export function openFollowUp(alertId: string): FollowUp {
  return { alertId, stage: 'watch', chaseCount: 0 };
}

/**
 * Advances one step toward chase when the loop is still open.
 * Does nothing once arrival is confirmed or stage is already chase/arrive.
 */
export function advanceFollowUp(f: FollowUp, nowMs: number): FollowUp {
  if (f.arrivalConfirmedAtMs !== undefined || f.stage === 'arrive') return f;
  const idx = ADVANCE_ORDER.indexOf(f.stage);
  if (idx < 0 || idx >= ADVANCE_ORDER.length - 1) {
    // Already at chase — bump chase count / timestamp for resurfacing.
    if (f.stage === 'chase') {
      return {
        ...f,
        chaseCount: f.chaseCount + 1,
        lastChaseAtMs: nowMs,
      };
    }
    return f;
  }
  const next = ADVANCE_ORDER[idx + 1]!;
  return {
    ...f,
    stage: next,
    // Stamp every stage change so timers and chase ranking have an anchor.
    lastChaseAtMs: nowMs,
    ...(next === 'chase' ? { chaseCount: f.chaseCount + 1 } : {}),
  };
}

/**
 * Ranked list for the CHP: open chase loops first, then by how long they have waited.
 * Closed (arrived) loops are excluded.
 */
export function chaseList(open: FollowUp[], _nowMs?: number): FollowUp[] {
  return open
    .filter((f) => !f.arrivalConfirmedAtMs)
    .sort(
      (a, b) =>
        (b.stage === 'chase' ? 1 : 0) - (a.stage === 'chase' ? 1 : 0) ||
        (a.lastChaseAtMs ?? 0) - (b.lastChaseAtMs ?? 0),
    );
}

/** The app may never invent arrival — only a person confirms it. */
export function confirmArrival(
  f: FollowUp,
  by: 'chp' | 'nurse',
  nowMs: number,
): FollowUp {
  return {
    ...f,
    stage: 'arrive',
    arrivalConfirmedBy: by,
    arrivalConfirmedAtMs: nowMs,
  };
}
