/**
 * Speech output for triage messages.
 * Uses browser speechSynthesis with a Swahili voice when installed,
 * falling back to a provided audio URL map (pre-recorded).
 */

import { getMessageCatalog } from '@neema/core';
import swMessages from '../../../../packages/core/src/messages/sw.json';

export type SpeakOptions = {
  /** BCP-47 tag; default sw-KE. */
  lang?: string;
  /** Optional map of messageKey -> audio URL for fallback. */
  audioFallback?: Record<string, string>;
};

function lookupMessage(messageKey: string): string | undefined {
  const record = swMessages as unknown as Record<string, unknown>;
  const value = record[messageKey];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Speaks a message key from sw.json.
 * Returns 'spoken' | 'audio' | 'text-only' so the harness can show fallbacks.
 */
export async function speakMessageKey(
  messageKey: string,
  options: SpeakOptions = {},
): Promise<'spoken' | 'audio' | 'text-only'> {
  const text = lookupMessage(messageKey);
  if (!text || messageKey.startsWith('_')) return 'text-only';

  if ('speechSynthesis' in window) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = options.lang ?? 'sw-KE';
    const voices = window.speechSynthesis.getVoices();
    const sw = voices.find((v) => v.lang.toLowerCase().startsWith('sw'));
    if (sw) utter.voice = sw;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    return 'spoken';
  }

  const url = options.audioFallback?.[messageKey];
  if (url) {
    const audio = new Audio(url);
    await audio.play();
    return 'audio';
  }

  return 'text-only';
}

/** Returns the Swahili draft text for a message key (for on-screen display). */
export function getMessageText(messageKey: string): string {
  return lookupMessage(messageKey) ?? messageKey;
}

/**
 * On-screen text for a message key in the mother's chosen language.
 * English uses the catalog gloss; returns null when the key has no text.
 */
export function getMessageTextFor(messageKey: string, lang: 'en' | 'sw'): string | null {
  if (lang === 'sw') return lookupMessage(messageKey) ?? null;
  const entry = getMessageCatalog().find((e) => e.key === messageKey);
  return entry?.enGloss || null;
}
