/**
 * Kiswahili EPDS helpers (Edinburgh Postnatal Depression Scale).
 * Scores do NOT produce a triage colour — item 10 or a cut-off routes to a person.
 *
 * ASSUMPTION: reverse-scored items are 1, 2, and 4 (1-indexed), matching the
 * published English EPDS. Cut-offs from the Cursor brief are placeholders.
 */

import type { EpdsResult, Stage } from './types.js';

/** Placeholders pending clinician review. */
export const EPDS_CUTOFF = {
  pregnancy: 13,
  postpartum: 10,
} as const;

/** 1-indexed question numbers that are reverse-scored. */
const REVERSE_ITEMS = new Set([1, 2, 4]);

export interface EpdsScore {
  total: number;
  item10: number;
  /** True when total is at or above the stage cut-off. */
  flagged: boolean;
  /** True when item 10 (self-harm thoughts) is greater than 0. */
  item10Flag: boolean;
  /** Always true when flagged or item10Flag — route to a person, never a colour. */
  routeToPerson: boolean;
  cutoffUsed: number;
}

/**
 * Sums ten answers (each 0..3), reverse-scoring items 1, 2, and 4.
 * Returns null when the answer list is not exactly ten integers in range.
 */
export function scoreEpds(
  answers: number[],
  stage: Stage = 'postpartum',
): EpdsScore | null {
  if (answers.length !== 10) return null;
  if (answers.some((a) => !Number.isInteger(a) || a < 0 || a > 3)) return null;

  let total = 0;
  for (let i = 0; i < 10; i++) {
    const raw = answers[i]!;
    const scored = REVERSE_ITEMS.has(i + 1) ? 3 - raw : raw;
    total += scored;
  }
  const item10 = answers[9]!;
  const cutoffUsed = stage === 'pregnancy' ? EPDS_CUTOFF.pregnancy : EPDS_CUTOFF.postpartum;
  const flagged = total >= cutoffUsed;
  const item10Flag = item10 > 0;
  return {
    total,
    item10,
    flagged,
    item10Flag,
    routeToPerson: flagged || item10Flag,
    cutoffUsed,
  };
}

/** Builds a stored EpdsResult row from scored answers. */
export function buildEpdsResult(
  id: string,
  tsMs: number,
  answers: number[],
  stage: Stage = 'postpartum',
): { result: EpdsResult; score: EpdsScore } | null {
  const score = scoreEpds(answers, stage);
  if (!score) return null;
  return {
    result: { id, tsMs, answers: [...answers], total: score.total, item10: score.item10 },
    score,
  };
}
