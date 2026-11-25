/**
 * Clinician / CHP supervisor sign-off for triage thresholds.
 * Thresholds stay placeholders until a real human records an attestation.
 * This module never invents clinical approval — it only stores and gates it.
 */

import type { TriageConfig } from './triage.js';
import triageConfig from './config/triage.config.json';

/** Attestation recorded after a human clinician/supervisor reviews the config. */
export interface ClinicianSignOff {
  /** Config version that was reviewed. */
  configVersion: string;
  /** Reviewer display name (nurse, clinician, or CHP supervisor). */
  reviewerName: string;
  /** Role label, free text e.g. "CHP supervisor", "facility nurse". */
  reviewerRole: string;
  /** ISO date of review (YYYY-MM-DD). */
  reviewedOn: string;
  /** Explicit statement the reviewer agreed to. */
  attestation: string;
  /** true only when a real human completed the review. */
  signed: boolean;
  notes?: string;
}

export interface SignedTriageConfig extends TriageConfig {
  signOff: ClinicianSignOff;
}

const DEFAULT_ATTESTATION =
  'I reviewed these placeholder thresholds as decision-support screening values only, not as a diagnosis protocol. They may be used in a supervised pilot after local adaptation.';

/** Unsigned bundled config — not cleared for unsupervised field use. */
export function getUnsignedTriageConfig(): SignedTriageConfig {
  const base = triageConfig as TriageConfig;
  return {
    ...base,
    signOff: {
      configVersion: base.version,
      reviewerName: '',
      reviewerRole: '',
      reviewedOn: '',
      attestation: DEFAULT_ATTESTATION,
      signed: false,
      notes: 'Pending clinician / CHP supervisor review.',
    },
  };
}

/**
 * Creates a signed config copy after a human review session.
 * Call only when a real clinician/supervisor has reviewed the numbers.
 */
export function recordClinicianSignOff(
  config: TriageConfig,
  input: {
    reviewerName: string;
    reviewerRole: string;
    reviewedOn: string;
    notes?: string;
    attestation?: string;
  },
): SignedTriageConfig {
  if (!input.reviewerName.trim() || !input.reviewerRole.trim() || !input.reviewedOn.trim()) {
    throw new Error('Sign-off requires reviewer name, role, and review date.');
  }
  return {
    ...config,
    signOff: {
      configVersion: config.version,
      reviewerName: input.reviewerName.trim(),
      reviewerRole: input.reviewerRole.trim(),
      reviewedOn: input.reviewedOn.trim(),
      attestation: input.attestation?.trim() || DEFAULT_ATTESTATION,
      signed: true,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  };
}

/** Field / pilot mode requires a matching signed attestation. */
export function isConfigSignedForUse(config: SignedTriageConfig): boolean {
  return (
    config.signOff.signed === true &&
    config.signOff.configVersion === config.version &&
    config.signOff.reviewerName.length > 0 &&
    config.signOff.reviewedOn.length > 0
  );
}

/**
 * Throws if config is not signed — use before enabling non-demo field alerts.
 * Demo / harness mode may continue with unsigned placeholders.
 */
export function assertConfigSignedForFieldUse(config: SignedTriageConfig): void {
  if (!isConfigSignedForUse(config)) {
    throw new Error(
      `Triage config ${config.version} is not clinician-signed. Demo mode only until a reviewer signs off.`,
    );
  }
}
