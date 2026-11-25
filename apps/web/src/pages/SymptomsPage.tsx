import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SymptomCode } from '@neema/core';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';

const OPTIONS: { code: SymptomCode; label: string }[] = [
  { code: 'headache', label: 'Headache' },
  { code: 'blurred_vision', label: 'Blurred vision' },
  { code: 'upper_abdominal_pain', label: 'Upper belly pain' },
  { code: 'heavy_bleeding', label: 'Heavy bleeding' },
  { code: 'fever_chills', label: 'Fever / chills' },
  { code: 'baby_moving_less', label: 'Baby moving less' },
  { code: 'swelling_face_hands', label: 'Swelling face/hands' },
  { code: 'low_mood', label: 'Low mood' },
  { code: 'other', label: 'Other' },
];

/** Tap-to-select symptom chips — primary symptom path. */
export function SymptomsPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const [selected, setSelected] = useState<SymptomCode[]>([]);

  function toggle(code: SymptomCode) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function save() {
    if (selected.length === 0) return;
    await g.saveSymptoms(selected);
    nav('/alert');
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message="Saving symptoms…" /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        How do you feel?
      </h1>
      <p className="screen-sub">Tap everything that fits. Voice understanding comes later — taps are primary.</p>
      <div className="chip-grid">
        {OPTIONS.map((opt) => (
          <button
            key={opt.code}
            type="button"
            className="chip"
            aria-pressed={selected.includes(opt.code)}
            onClick={() => toggle(opt.code)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: '1.25rem' }}>
        <Button variant="secondary" onClick={() => nav('/home')}>
          Cancel
        </Button>
        <Button variant="primary" disabled={selected.length === 0} onClick={() => void save()}>
          Save symptoms
        </Button>
      </div>
    </main>
  );
}
