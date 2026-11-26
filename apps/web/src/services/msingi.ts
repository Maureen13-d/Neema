/**
 * Msingi Sauti client — same provider as CareLoop voice lab.
 * Calls same-origin /api/tts so the API key stays on the server (Vite middleware / Node serve).
 */

export class MsingiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MsingiError';
  }
}

/** Returns WAV bytes for an approved spoken line, or null when TTS is unavailable. */
export async function msingiSpeak(text: string): Promise<Blob | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed }),
    });
    if (res.status === 503) return null; // not configured
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new MsingiError(detail || 'Voice service could not complete that turn.');
    }
    return await res.blob();
  } catch (err) {
    if (err instanceof MsingiError) throw err;
    return null;
  }
}

/** Plays WAV from Msingi; returns false if unavailable. */
export async function playMsingiAudio(text: string): Promise<boolean> {
  const blob = await msingiSpeak(text);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  try {
    const audio = new Audio(url);
    await audio.play();
    return true;
  } finally {
    // Revoke after a delay so playback can start.
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
