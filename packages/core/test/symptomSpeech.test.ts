import { describe, expect, it } from 'vitest';
import { StubSymptomSpeechProvider } from '../src/symptomSpeech.js';

describe('StubSymptomSpeechProvider', () => {
  it('returns empty codes and never invents symptoms', async () => {
    const provider = new StubSymptomSpeechProvider();
    const result = await provider.understand({
      transcript: 'kichwa kinauma sana',
      languageHint: 'sw-KE',
    });
    expect(result.codes).toEqual([]);
    expect(result.transcript).toBe('kichwa kinauma sana');
    expect(result.confidence).toBeNull();
  });
});
