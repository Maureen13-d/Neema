/**
 * Clean interface for future on-device speech → symptom code extraction.
 * Rules only read SymptomCode[]; voice models must map into this contract.
 * No implementation here — Gemma/Whisper stay out of scope for the hackathon build.
 */

import type { SymptomCode } from './types.js';

/** One candidate mapping from speech to the symptom vocabulary. */
export interface SymptomSpeechHypothesis {
  codes: SymptomCode[];
  /** 0..1 confidence from the recognizer, when available. */
  confidence: number | null;
  /** Raw transcript for human review; never read by triage rules. */
  transcript: string;
}

/** Input clip or text for symptom understanding. */
export interface SymptomSpeechInput {
  /** UTF-8 transcript if ASR already ran, or empty when only audio is provided. */
  transcript?: string;
  /** Optional PCM/WAV bytes for a future on-device model. */
  audioBytes?: Uint8Array;
  /** BCP-47 hint, e.g. sw-KE. */
  languageHint?: string;
}

/**
 * Provider contract for speech → symptom codes.
 * Implementations may be swapped without touching triage.
 */
export interface SymptomSpeechProvider {
  readonly id: string;
  understand(input: SymptomSpeechInput): Promise<SymptomSpeechHypothesis>;
}

/**
 * Stub provider: never invents codes from audio.
 * If a transcript is provided, returns empty codes so the UI keeps tap-to-select primary.
 * Replace with Gemma 3n / Whisper later behind the same interface.
 */
export class StubSymptomSpeechProvider implements SymptomSpeechProvider {
  readonly id = 'stub';

  async understand(input: SymptomSpeechInput): Promise<SymptomSpeechHypothesis> {
    return {
      codes: [],
      confidence: null,
      transcript: input.transcript?.trim() ?? '',
    };
  }
}
