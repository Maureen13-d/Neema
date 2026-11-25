import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';

/** BP entry + YELLOW recheck coaching. */
export function BpPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const { t, lang } = useLocale();
  const [sys, setSys] = useState('120');
  const [dia, setDia] = useState('80');
  const isRecheck = g.recheck.status === 'due' || g.recheck.status === 'scheduled';

  async function save() {
    const result = await g.saveBp(Number(sys), Number(dia));
    const level = result?.level;
    if (level === 'RED' || level === 'YELLOW') nav('/alert');
    else nav('/home');
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message={lang === 'sw' ? 'Inahifadhi…' : 'Saving…'} /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {isRecheck ? t('recheck_now') : t('add_bp')}
      </h1>
      <p className="screen-sub">{isRecheck ? t('sit_rest') : lang === 'sw'
        ? 'Tumia cuff ya mkono. Kaa, pumzika, kisha pima.'
        : 'Use your upper-arm cuff. Sit, rest, then measure.'}</p>

      {isRecheck ? (
        <ol className="ritual-steps" style={{ marginBottom: '1rem' }}>
          <li>
            <span className="step-n">1</span>
            <div>
              <strong>{lang === 'sw' ? 'Kaa sawa' : 'Sit upright'}</strong>
              <p className="soft-note">
                {lang === 'sw' ? 'Miguu chini, mkono umetulia.' : 'Feet flat, arm resting.'}
              </p>
            </div>
          </li>
          <li>
            <span className="step-n">2</span>
            <div>
              <strong>{lang === 'sw' ? 'Pumzika' : 'Rest a minute'}</strong>
              <p className="soft-note">{t('sit_rest')}</p>
            </div>
          </li>
          <li>
            <span className="step-n">3</span>
            <div>
              <strong>{lang === 'sw' ? 'Andika namba' : 'Enter the numbers'}</strong>
              <p className="soft-note">
                {lang === 'sw' ? 'Systolic juu, diastolic chini.' : 'Systolic on top, diastolic below.'}
              </p>
            </div>
          </li>
        </ol>
      ) : null}

      <div className="panel">
        <div className="field">
          <label htmlFor="sys">{lang === 'sw' ? 'Ya juu (systolic)' : 'Top number (systolic)'}</label>
          <input id="sys" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="dia">{lang === 'sw' ? 'Ya chini (diastolic)' : 'Bottom number (diastolic)'}</label>
          <input id="dia" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="secondary" onClick={() => nav(-1)}>
          {lang === 'sw' ? 'Rudi' : 'Back'}
        </Button>
        <Button variant="primary" onClick={() => void save()}>
          {isRecheck ? (lang === 'sw' ? 'Hifadhi upimaji' : 'Save recheck') : t('add_bp')}
        </Button>
      </div>
      <p className="trust-line">{t('saved_here')}</p>
    </main>
  );
}
