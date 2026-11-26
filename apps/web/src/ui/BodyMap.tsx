/**
 * Tap-to-place body map. Regions map to the same SymptomCode vocabulary via REGION_TO_SYMPTOM.
 * Regions that only map to `other` track their own visual state so they do not all light up together.
 */

import { useState } from 'react';
import { REGION_TO_SYMPTOM, type BodyRegion, type SymptomCode } from '@neema/core';

const REGIONS: { id: BodyRegion; labelEn: string; labelSw: string; cx: number; cy: number; r: number }[] = [
  { id: 'head', labelEn: 'Head', labelSw: 'Kichwa', cx: 50, cy: 14, r: 11 },
  { id: 'face_hands', labelEn: 'Face / hands', labelSw: 'Uso / mikono', cx: 18, cy: 42, r: 9 },
  { id: 'breast', labelEn: 'Chest', labelSw: 'Kifua', cx: 50, cy: 36, r: 10 },
  { id: 'upper_abdomen', labelEn: 'Upper belly', labelSw: 'Tumbo juu', cx: 50, cy: 52, r: 10 },
  { id: 'lower_abdomen', labelEn: 'Lower belly', labelSw: 'Tumbo chini', cx: 50, cy: 68, r: 10 },
  { id: 'wound', labelEn: 'Wound area', labelSw: 'Jeraha', cx: 82, cy: 58, r: 9 },
  { id: 'calf', labelEn: 'Calf / leg', labelSw: 'Mguu', cx: 42, cy: 90, r: 9 },
];

function isOtherOnly(id: BodyRegion): boolean {
  const codes = REGION_TO_SYMPTOM[id];
  return codes.length === 1 && codes[0] === 'other';
}

/** Interactive body silhouette. Tapping a region adds its mapped symptom codes. */
export function BodyMap({
  selected,
  onToggleCodes,
  lang = 'en',
}: {
  selected: SymptomCode[];
  onToggleCodes: (codes: SymptomCode[]) => void;
  lang?: 'en' | 'sw';
}) {
  const [otherRegions, setOtherRegions] = useState<Set<BodyRegion>>(() => new Set());

  function regionActive(id: BodyRegion): boolean {
    if (isOtherOnly(id)) return otherRegions.has(id) && selected.includes('other');
    return REGION_TO_SYMPTOM[id].some((c) => selected.includes(c));
  }

  function onRegion(id: BodyRegion) {
    const codes = REGION_TO_SYMPTOM[id];
    if (isOtherOnly(id)) {
      setOtherRegions((prev) => {
        const next = new Set(prev);
        const turningOff = next.has(id);
        if (turningOff) next.delete(id);
        else next.add(id);
        const stillNeedsOther = next.size > 0;
        const otherOn = selected.includes('other');
        // Keep SymptomCode `other` in sync with whether any other-only region is lit.
        if (stillNeedsOther && !otherOn) onToggleCodes(['other']);
        if (!stillNeedsOther && otherOn) onToggleCodes(['other']);
        return next;
      });
      return;
    }
    onToggleCodes(codes);
  }

  return (
    <div className="body-map">
      <svg viewBox="0 0 100 110" className="body-map__svg" role="group" aria-label={lang === 'sw' ? 'Ramani ya mwili' : 'Body map'}>
        <ellipse cx="50" cy="14" rx="12" ry="13" className="body-map__silhouette" />
        <path
          d="M38 28 Q50 26 62 28 L68 48 Q70 70 62 88 L55 105 L45 105 L38 88 Q30 70 32 48 Z"
          className="body-map__silhouette"
        />
        {REGIONS.map((r) => (
          <g key={r.id}>
            <circle
              cx={r.cx}
              cy={r.cy}
              r={r.r}
              className="body-map__hit"
              data-on={regionActive(r.id)}
              role="button"
              tabIndex={0}
              aria-pressed={regionActive(r.id)}
              aria-label={lang === 'sw' ? r.labelSw : r.labelEn}
              onClick={() => onRegion(r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onRegion(r.id);
                }
              }}
            />
            <text x={r.cx} y={r.cy + 1} textAnchor="middle" className="body-map__label">
              {(lang === 'sw' ? r.labelSw : r.labelEn).split(' ')[0]}
            </text>
          </g>
        ))}
      </svg>
      <p className="soft-note" style={{ margin: '0.5rem 0 0' }}>
        {lang === 'sw'
          ? 'Gusa sehemu ya mwili — inachagua dalili zile zile. Sehemu bila kanuni maalum huchagua “Nyingine”.'
          : 'Tap a body area — it picks the same symptom codes. Areas without a dedicated rule select “Other”.'}
      </p>
    </div>
  );
}
