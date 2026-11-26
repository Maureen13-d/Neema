/**
 * Companion avatar state. Reacts to triage; never decides triage.
 */

import type { AvatarState, TriageLevel } from './types.js';

/**
 * Maps triage level (+ whether a chase loop is awaiting arrival) to avatar mood.
 * GREEN and UNKNOWN both look calm; the UI must still show an UNKNOWN banner.
 */
export function avatarState(level: TriageLevel, awaitingArrival: boolean): AvatarState {
  if (level === 'RED') return awaitingArrival ? 'waiting' : 'urgent';
  if (level === 'YELLOW') return 'watchful';
  return 'calm';
}
