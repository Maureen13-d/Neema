import type { TriageLevel } from '@neema/core';

const LABELS: Record<TriageLevel, string> = {
  GREEN: 'Safi',
  YELLOW: 'Angalia',
  RED: 'Hatari',
  UNKNOWN: 'Band?',
};

/** Living status orb — the product's emotional centre. */
export function StatusOrb({ level }: { level: TriageLevel }) {
  return (
    <div className="status-orb" data-level={level} aria-live="polite" aria-label={`Status ${level}`}>
      <div className="status-orb__core">
        <span>{LABELS[level]}</span>
      </div>
    </div>
  );
}
