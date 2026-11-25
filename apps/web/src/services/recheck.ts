/**
 * YELLOW recheck loop: after raised BP, prompt a second reading, then re-triage.
 * Intervals come from triage.config.json (yellowRecheckMinutes).
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

  return {
    getState() {
      return { ...state };
    },
    scheduleFrom(result, initialBpId, nowMs = Date.now()) {
      if (result.level !== 'YELLOW') return;
      const minutes =
        result.recheckInMinutes ?? getDefaultTriageConfig().yellowRecheckMinutes;
      state = {
        status: 'scheduled',
        dueAtMs: nowMs + minutes * 60_000,
        trigger: result,
        initialBpId,
      };
    },
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

/** Helper: pick the latest BP id from a list (for scheduleFrom). */
export function latestBpId(bp: BpReading[]): string | null {
  if (bp.length === 0) return null;
  return bp[bp.length - 1]!.id;
}
