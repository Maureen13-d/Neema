/**
 * Encodes a nurse summary into a QR-friendly payload string.
 * The summary builder already produces qrPayload JSON; this wraps length checks.
 */

import { buildNurseSummary, type NurseSummary, type NurseSummaryInput } from '@neema/core';

/** Soft limit so phone QR libraries stay scannable. */
export const QR_SOFT_MAX_CHARS = 1200;

export interface QrSummaryResult {
  summary: NurseSummary;
  /** String to feed a QR encoder in the real UI. */
  payload: string;
  truncated: boolean;
}

/**
 * Builds the nurse summary and ensures the QR payload stays within a soft limit
 * by dropping older BP/alert/symptom rows if needed.
 */
export function buildSummaryForQr(input: NurseSummaryInput): QrSummaryResult {
  let summary = buildNurseSummary(input);
  let payload = summary.qrPayload;
  if (payload.length <= QR_SOFT_MAX_CHARS) {
    return { summary, payload, truncated: false };
  }

  const trimmed: NurseSummaryInput = {
    ...input,
    bp: input.bp.slice(-4),
    alerts: input.alerts.slice(-3),
    symptoms: input.symptoms.slice(-3),
  };
  summary = buildNurseSummary(trimmed);
  payload = summary.qrPayload;
  return { summary, payload, truncated: true };
}
