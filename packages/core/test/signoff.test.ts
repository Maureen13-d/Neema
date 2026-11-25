import { describe, expect, it } from 'vitest';
import {
  assertConfigSignedForFieldUse,
  getUnsignedTriageConfig,
  isConfigSignedForUse,
  recordClinicianSignOff,
} from '../src/signoff.js';
import { getDefaultTriageConfig } from '../src/triage.js';

describe('clinician sign-off', () => {
  it('starts unsigned', () => {
    const config = getUnsignedTriageConfig();
    expect(isConfigSignedForUse(config)).toBe(false);
    expect(() => assertConfigSignedForFieldUse(config)).toThrow(/not clinician-signed/);
  });

  it('becomes field-ready after a real review record', () => {
    const signed = recordClinicianSignOff(getDefaultTriageConfig(), {
      reviewerName: 'Nurse Wanjiku',
      reviewerRole: 'facility nurse',
      reviewedOn: '2026-11-26',
      notes: 'Placeholder thresholds OK for supervised demo only.',
    });
    expect(isConfigSignedForUse(signed)).toBe(true);
    expect(() => assertConfigSignedForFieldUse(signed)).not.toThrow();
  });
});
