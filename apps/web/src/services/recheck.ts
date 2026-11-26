/**
 * YELLOW recheck loop: after raised BP, prompt a second reading, then re-triage.
 * Intervals come from triage.config.json (recheckMinutes).
 */

import {
  evaluateTriage,
  getDefaultTriageConfig,
  type BpReading,
  type TriageInput,
  type TriageResult,
} from '@neema/core';

export type RecheckStatus = 'idle' | 'scheduled' | 'due' | 'completed' | 'cancelled';

export interface RecheckState {
  status: RecheckStatus;
  /** When the recheck becomes due. */
  dueAtMs: number | null;
  /** Triage result that triggered the schedule. */
  trigger: TriageResult | null;
  /** First BP that caused YELLOW (for R4 persist comparison). */
  initialBpId: string | null;
}

export interface RecheckHandle {
  getState(): RecheckState;
  /** Schedule a recheck from a YELLOW result that includes recheckInMinutes. */
  scheduleFrom(result: TriageResult, initialBpId: string | null, nowMs?: number): void;
  /** Schedule using an explicit delay (ms) — useful for demo-friendly timers. */
  scheduleInMs(
    result: TriageResult,
    initialBpId: string | null,
    delayMs: number,
    nowMs?: number,
  ): void;
  /** Returns true when now >= dueAtMs. */
  isDue(nowMs?: number): boolean;
  cancel(): void;
  /**
   * After the mother enters a recheck BP, evaluate triage with the updated input.
   * Marks the loop completed.
   */
  completeWith(input: TriageInput): TriageResult;
}

/**
 * Creates a YELLOW recheck controller.
 * Does not own timers — call isDue() from the UI/pipeline interval.
 */
export function createRecheckLoop(): RecheckHandle {
  let state: RecheckState = {
    status: 'idle',
    dueAtMs: null,
    trigger: null,
    initialBpId: null,
  };

  function scheduleInMs(
    result: TriageResult,
    initialBpId: string | null,
    delayMs: number,
    nowMs = Date.now(),
  ): void {
    if (result.level !== 'YELLOW') return;
    state = {
      status: 'scheduled',
      dueAtMs: nowMs + Math.max(0, delayMs),
      trigger: result,
      initialBpId,
    };
  }

  return {
    getState() {
      return { ...state };
    },
    scheduleFrom(result, initialBpId, nowMs = Date.now()) {
      if (result.level !== 'YELLOW') return;
      const minutes =
        result.recheckInMinutes ?? getDefaultTriageConfig().recheckMinutes;
      scheduleInMs(result, initialBpId, minutes * 60_000, nowMs);
    },
    scheduleInMs,
    isDue(nowMs = Date.now()) {
      if (state.status !== 'scheduled' || state.dueAtMs === null) return false;
      if (nowMs >= state.dueAtMs) {
        state = { ...state, status: 'due' };
        return true;
      }
      return false;
    },
    cancel() {
      state = { status: 'cancelled', dueAtMs: null, trigger: null, initialBpId: null };
    },
    completeWith(input) {
      const result = evaluateTriage(input);
      state = {
        status: 'completed',
        dueAtMs: state.dueAtMs,
        trigger: state.trigger,
        initialBpId: state.initialBpId,
      };
      return result;
    },
  };
}

/**
 * How long to wait before asking for the second reading.
 * Dev builds use 60s so the loop can be exercised; production uses the triage config.
 */
export function recheckDelayMs(result: TriageResult | null): number {
  if (import.meta.env.DEV) return 60_000;
  const minutes = result?.recheckInMinutes ?? getDefaultTriageConfig().recheckMinutes;
  return minutes * 60_000;
}

/** Helper: pick the latest BP id from a list (for scheduleFrom). */
export function latestBpId(bp: BpReading[]): string | null {
  if (bp.length === 0) return null;
  return bp[bp.length - 1]!.id;
}
