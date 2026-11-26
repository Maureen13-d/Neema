/**
 * Body-region → symptom-code map.
 * The body map is only a nicer way to pick the same SymptomCode values.
 */

import type { BodyRegion, SymptomCode } from './types.js';

/** Maps a tapped body region to the symptom codes the rules understand. */
export const REGION_TO_SYMPTOM: Record<BodyRegion, SymptomCode[]> = {
  head: ['headache', 'blurred_vision'],
  upper_abdomen: ['upper_abdominal_pain'],
  lower_abdomen: ['other'],
  breast: ['other'],
  calf: ['other'],
  face_hands: ['swelling_face_hands'],
  wound: ['other'],
};
