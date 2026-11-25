import type { TriageLevel } from '@neema/core';
import { useLocale } from '../hooks/useLocale';

/** Living status orb — emotional centre of the guardian. */
export function StatusOrb({ level }: { level: TriageLevel }) {
  const { lang } = useLocale();
  const labels: Record<TriageLevel, string> = {
    GREEN: lang === 'sw' ? 'Safi' : 'Okay',
    YELLOW: lang === 'sw' ? 'Angalia' : 'Check',
    RED: lang === 'sw' ? 'Hatari' : 'Go now',
    UNKNOWN: lang === 'sw' ? 'Subiri' : 'Waiting',
  };

  return (
    <div className="status-orb" data-level={level} aria-live="polite" aria-label={`Status ${level}`}>
      <div className="status-orb__core">
        <span>{labels[level]}</span>
      </div>
    </div>
  );
}
