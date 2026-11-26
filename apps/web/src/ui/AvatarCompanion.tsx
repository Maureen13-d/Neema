/**
 * Soft companion blob. Mood comes from avatarState(level) — never decides triage.
 */

import type { AvatarState } from '@neema/core';

const LABEL: Record<AvatarState, { en: string; sw: string }> = {
  calm: { en: 'Calm with you', sw: 'Tulivu nawe' },
  watchful: { en: 'Watching with you', sw: 'Anaangalia nawe' },
  urgent: { en: 'Here — take the next step', sw: 'Yuko — chukua hatua' },
  waiting: { en: 'Waiting with you for help', sw: 'Anasubiri msaada nawe' },
};

/** SVG companion that morphs glow/shape from AvatarState. */
export function AvatarCompanion({
  state,
  lang = 'en',
}: {
  state: AvatarState;
  lang?: 'en' | 'sw';
}) {
  return (
    <div className="companion" data-state={state} aria-live="polite">
      <svg className="companion__svg" viewBox="0 0 120 120" role="img" aria-label={LABEL[state][lang]}>
        <defs>
          <radialGradient id="companionGlow" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="var(--companion-core)" stopOpacity="0.95" />
            <stop offset="100%" stopColor="var(--companion-edge)" stopOpacity="0.35" />
          </radialGradient>
        </defs>
        <ellipse className="companion__body" cx="60" cy="64" rx="38" ry="34" fill="url(#companionGlow)" />
        <circle className="companion__eye" cx="48" cy="58" r="4.5" fill="#1b1a33" />
        <circle className="companion__eye" cx="72" cy="58" r="4.5" fill="#1b1a33" />
        <path
          className="companion__mouth"
          d={
            state === 'urgent' || state === 'waiting'
              ? 'M48 78 Q60 72 72 78'
              : state === 'watchful'
                ? 'M50 76 Q60 80 70 76'
                : 'M48 74 Q60 84 72 74'
          }
          fill="none"
          stroke="#1b1a33"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="companion__label">{LABEL[state][lang]}</span>
    </div>
  );
}
