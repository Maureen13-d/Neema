import type { TriageLevel } from '@neema/core';
import type { Lang } from '../hooks/useLocale';

/** One short word per level, shared by the home card and the alert orb. */
export function levelLabel(level: TriageLevel, lang: Lang): string {
  const labels: Record<TriageLevel, { en: string; sw: string }> = {
    GREEN: { en: 'Okay', sw: 'Safi' },
    YELLOW: { en: 'Check', sw: 'Angalia' },
    RED: { en: 'Go now', sw: 'Hatari' },
    UNKNOWN: { en: 'Waiting', sw: 'Subiri' },
  };
  return labels[level][lang];
}
