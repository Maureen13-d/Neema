import type { TriageLevel } from '@neema/core';
import { useLocale } from '../hooks/useLocale';
import { levelLabel } from './levelLabel';

/** Breathing status orb, used on the alert screen. */
export function StatusOrb({ level }: { level: TriageLevel }) {
  const { lang } = useLocale();
  const label = levelLabel(level, lang);
  return (
    <div className="status-orb" data-level={level} role="status" aria-label={label}>
      <div className="status-orb__core">
        <span>{label}</span>
      </div>
    </div>
  );
}
