/**
 * Speech output for triage messages.
 * Prefer Msingi Sauti (CareLoop voice path) via /api/tts, then browser speechSynthesis,
 * then optional pre-recorded audioFallback URLs.
 */

import { getMessageCatalog } from '@neema/core';
import swMessages from '../../../../packages/core/src/messages/sw.json';
import { playMsingiAudio } from './msingi';

export type SpeakOptions = {
  /** BCP-47 tag; default sw-KE for synthesis fallback. */
  lang?: string;
  /** Optional map of messageKey -> audio URL for offline fallback. */
  audioFallback?: Record<string, string>;
  /** Skip Msingi and use browser synthesis only. */
  browserOnly?: boolean;
};

function lookupMessage(messageKey: string): string | undefined {
  const record = swMessages as unknown as Record<string, unknown>;
  const value = record[messageKey];
  return typeof value === 'string' ? value : undefined;
}

function speakBrowser(text: string, lang: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  const voices = window.speechSynthesis.getVoices();
  const want = lang.toLowerCase().slice(0, 2);
  const match =
    voices.find((v) => v.lang.toLowerCase().startsWith(want)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith('sw')) ??
    null;
  if (match) utter.voice = match;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
  return true;
}

/**
 * Speaks a message key from sw.json.
 * Returns 'msingi' | 'spoken' | 'audio' | 'text-only' so the UI can show fallbacks.
 */
export async function speakMessageKey(
  messageKey: string,
  options: SpeakOptions = {},
): Promise<'msingi' | 'spoken' | 'audio' | 'text-only'> {
  const text = lookupMessage(messageKey);
  if (!text || messageKey.startsWith('_')) return 'text-only';

  if (!options.browserOnly) {
    try {
      const ok = await playMsingiAudio(text);
      if (ok) return 'msingi';
    } catch {
      // fall through to browser / audio
    }
  }

  if (speakBrowser(text, options.lang ?? 'sw-KE')) return 'spoken';

  const url = options.audioFallback?.[messageKey];
  if (url) {
    const audio = new Audio(url);
    await audio.play();
    return 'audio';
  }

  return 'text-only';
}

/** Speaks arbitrary approved text (same cascade as message keys). */
export async function speakText(
  text: string,
  options: SpeakOptions = {},
): Promise<'msingi' | 'spoken' | 'text-only'> {
  const trimmed = text.trim();
  if (!trimmed) return 'text-only';
  if (!options.browserOnly) {
    try {
      if (await playMsingiAudio(trimmed)) return 'msingi';
    } catch {
      /* fall through */
    }
  }
  if (speakBrowser(trimmed, options.lang ?? 'sw-KE')) return 'spoken';
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
