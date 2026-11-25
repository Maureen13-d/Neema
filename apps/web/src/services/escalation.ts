/**
 * Escalation timer for unacknowledged RED alerts.
 * After each interval, exposes the next contact so the UI can open another sms: link.
 * Placeholders: 5 minutes → next contact, 10 minutes → supervisor (project doc).
 */

import type { Contact } from '@neema/core';
import { acknowledgeRed } from './alerts';
import { db } from '../storage/db';

export interface EscalationConfig {
  /** ms before notifying the next contact (default 5 min). */
  nextContactAfterMs: number;
  /** ms before notifying supervisor role (default 10 min). */
  supervisorAfterMs: number;
}

export const DEFAULT_ESCALATION: EscalationConfig = {
  nextContactAfterMs: 5 * 60_000,
  supervisorAfterMs: 10 * 60_000,
};

export type EscalationStep =
  | { kind: 'idle' }
  | { kind: 'notify'; contact: Contact; dueAtMs: number; label: 'next' | 'supervisor' }
  | { kind: 'acknowledged' }
  | { kind: 'exhausted' };

export interface EscalationHandle {
  /** Poll current step; safe to call from a UI interval. */
  tick(nowMs?: number): Promise<EscalationStep>;
  /** Stop timers without acknowledging the alert. */
  stop(): void;
}

/**
 * Starts escalation for an alert id using contacts sorted by escalationOrder.
 * First contact is assumed already offered at raise time; this advances further.
 */
export function startEscalation(
  alertId: string,
  contacts: Contact[],
  config: EscalationConfig = DEFAULT_ESCALATION,
  startedAtMs: number = Date.now(),
): EscalationHandle {
  const ordered = [...contacts].sort((a, b) => a.escalationOrder - b.escalationOrder);
  let stopped = false;
  let emittedNext = false;
  let emittedSupervisor = false;

  return {
    async tick(nowMs: number = Date.now()): Promise<EscalationStep> {
      if (stopped) return { kind: 'idle' };

      const alert = await db.alerts.get(alertId);
      if (!alert) return { kind: 'idle' };
      if (alert.acknowledgedAtMs !== undefined) {
        stopped = true;
        return { kind: 'acknowledged' };
      }
      if (alert.level !== 'RED') return { kind: 'idle' };

      const elapsed = nowMs - startedAtMs;
      const supervisor = ordered.find((c) => c.role === 'supervisor');
      const nextNonFirst = ordered.slice(1).find((c) => c.role !== 'supervisor') ?? ordered[1];

      if (elapsed >= config.supervisorAfterMs && supervisor && !emittedSupervisor) {
        emittedSupervisor = true;
        return {
          kind: 'notify',
          contact: supervisor,
          dueAtMs: startedAtMs + config.supervisorAfterMs,
          label: 'supervisor',
        };
      }

      if (elapsed >= config.nextContactAfterMs && nextNonFirst && !emittedNext) {
        emittedNext = true;
        return {
          kind: 'notify',
          contact: nextNonFirst,
          dueAtMs: startedAtMs + config.nextContactAfterMs,
          label: 'next',
        };
      }

      if (emittedNext && (emittedSupervisor || !supervisor)) {
        return { kind: 'exhausted' };
      }

      return { kind: 'idle' };
    },
    stop() {
      stopped = true;
    },
  };
}

/** Convenience: acknowledge RED and stop escalation. */
export async function acknowledgeAndStop(
  alertId: string,
  handle: EscalationHandle,
  atMs: number = Date.now(),
): Promise<void> {
  await acknowledgeRed(alertId, atMs);
  handle.stop();
}
