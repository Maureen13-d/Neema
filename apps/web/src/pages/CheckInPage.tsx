/**
 * Daily energy + mood check-in. CONTEXT ONLY — never fed into triage rules.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CheckIn } from '@neema/core';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { saveCheckIn } from '../services/checkIn';
import { useLocale } from '../hooks/useLocale';

const MOODS: { id: CheckIn['mood']; en: string; sw: string }[] = [
  { id: 'great', en: 'Great', sw: 'Vizuri sana' },
  { id: 'good', en: 'Good', sw: 'Vizuri' },
  { id: 'okay', en: 'Okay', sw: 'Sawa' },
  { id: 'low', en: 'Low', sw: 'Chini' },
  { id: 'very_low', en: 'Very low', sw: 'Chini sana' },
];

/** Soft daily check-in — energy slider and mood chips. */
export function CheckInPage() {
  const nav = useNavigate();
  const { lang } = useLocale();
  const [energy, setEnergy] = useState(60);
  const [mood, setMood] = useState<CheckIn['mood']>('okay');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await saveCheckIn(energy, mood);
      setSaved(true);
      window.setTimeout(() => nav('/home'), 600);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {lang === 'sw' ? 'Angalia leo' : 'Today’s check-in'}
      </h1>
      <p className="screen-sub">
        {lang === 'sw'
          ? 'Hii ni muktadha tu — haiamui GREEN au RED.'
          : 'Context only — this never decides GREEN or RED.'}
      </p>

      <div className="panel">
        <label htmlFor="energy">
          <strong>{lang === 'sw' ? 'Nguvu' : 'Energy'}</strong>
          <span className="soft-note"> · {energy}</span>
        </label>
        <input
          id="energy"
          type="range"
          min={0}
          max={100}
          value={energy}
          onChange={(e) => setEnergy(Number(e.target.value))}
          style={{ width: '100%', marginTop: '0.75rem' }}
        />
      </div>

      <div className="panel" style={{ marginTop: '0.75rem' }}>
        <strong>{lang === 'sw' ? 'Hali ya moyo' : 'Mood'}</strong>
        <div className="chip-grid" style={{ marginTop: '0.65rem' }}>
          {MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              className="chip"
              aria-pressed={mood === m.id}
              onClick={() => setMood(m.id)}
            >
              {lang === 'sw' ? m.sw : m.en}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: '1.25rem' }}>
        <Button variant="secondary" onClick={() => nav('/home')}>
          {lang === 'sw' ? 'Ghairi' : 'Cancel'}
        </Button>
        <Button variant="primary" onClick={() => void save()}>
          {saved ? (lang === 'sw' ? 'Imehifadhiwa' : 'Saved') : lang === 'sw' ? 'Hifadhi' : 'Save'}
        </Button>
      </div>
      <p className="trust-line">
        {lang === 'sw' ? 'Imehifadhiwa kwenye simu hii' : 'Saved on this phone'}
      </p>
    </main>
  );
}
