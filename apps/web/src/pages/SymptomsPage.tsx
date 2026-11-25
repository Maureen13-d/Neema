import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SymptomCode } from '@neema/core';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';

/** Tap-to-select how she feels. */
export function SymptomsPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const { t, lang } = useLocale();
  const [selected, setSelected] = useState<SymptomCode[]>([]);

  const options: { code: SymptomCode; label: string }[] =
    lang === 'sw'
      ? [
          { code: 'headache', label: 'Kichwa' },
          { code: 'blurred_vision', label: 'Kuona vizuri hapana' },
          { code: 'upper_abdominal_pain', label: 'Maumivu juu ya tumbo' },
          { code: 'heavy_bleeding', label: 'Kutokwa damu nyingi' },
          { code: 'fever_chills', label: 'Homa / baridi' },
          { code: 'baby_moving_less', label: 'Mtoto anatembea kidogo' },
          { code: 'swelling_face_hands', label: 'Uvimbe uso/mikono' },
          { code: 'low_mood', label: 'Hali mbaya ya moyo' },
          { code: 'other', label: 'Nyingine' },
        ]
      : [
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

  function toggle(code: SymptomCode) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function save() {
    if (selected.length === 0) return;
    const result = await g.saveSymptoms(selected);
    if (result?.level === 'RED' || result?.level === 'YELLOW') nav('/alert');
    else nav('/home');
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {t('how_feel')}
      </h1>
      <p className="screen-sub">
        {lang === 'sw' ? 'Gusa yote yanayokufaa.' : 'Tap everything that fits.'}
      </p>
      <div className="chip-grid">
        {options.map((opt) => (
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
          {lang === 'sw' ? 'Ghairi' : 'Cancel'}
        </Button>
        <Button variant="primary" disabled={selected.length === 0} onClick={() => void save()}>
          {lang === 'sw' ? 'Hifadhi' : 'Save'}
        </Button>
      </div>
      <p className="trust-line">{t('saved_here')}</p>
    </main>
  );
}
