import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LangToggle } from '../ui/LangToggle';
import { getReadiness, type ReadinessReport } from '../services/readiness';
import { lockSession } from '../services/auth';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';

/** Settings — language, people, band, quiet extras. */
export function SettingsPage() {
  const nav = useNavigate();
  const g = useGuardian();
  const { t, lang } = useLocale();
  const [ready, setReady] = useState<ReadinessReport | null>(null);

  useEffect(() => {
    void getReadiness().then(setReady);
  }, []);

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark />
        <LangToggle />
      </div>
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {t('more')}
      </h1>
      <p className="screen-sub">
        {lang === 'sw' ? 'Lugha, watu, na bendi yako.' : 'Language, people, and your band.'}
      </p>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <strong>{t('language')}</strong>
        <div style={{ marginTop: '0.65rem' }}>
          <LangToggle />
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <strong>{lang === 'sw' ? 'Hali ya uwanja' : 'Field readiness'}</strong>
        <p className="soft-note" style={{ marginTop: '0.4rem' }}>
          {ready?.fieldReady
            ? lang === 'sw'
              ? 'Tayari kwa matumizi yanayosimamiwa'
              : 'Ready for supervised field use'
            : lang === 'sw'
              ? 'Hali ya demo — milango bado wazi'
              : 'Demo mode — gates still open'}
        </p>
      </div>

      {g.bandMode === 'simulator' && g.connected ? (
        <div className="panel" style={{ marginBottom: '1rem' }}>
          <strong>{lang === 'sw' ? 'Jaribio la bendi' : 'Band practice'}</strong>
          <p className="soft-note" style={{ margin: '0.4rem 0 0.65rem' }}>
            {lang === 'sw'
              ? 'Bendi halisi inakuja. Hapa unaweza kujaribu hali tofauti.'
              : 'Physical band coming soon. Practice different states here.'}
          </p>
          <div className="btn-row" style={{ flexWrap: 'wrap' }}>
            <Button variant="ghost" onClick={() => void g.setDemoScenario(1)}>
              {lang === 'sw' ? 'Tulivu' : 'Calm'}
            </Button>
            <Button variant="ghost" onClick={() => void g.setDemoScenario(2)}>
              {lang === 'sw' ? 'Mabadiliko' : 'Drift'}
            </Button>
            <Button variant="ghost" onClick={() => void g.setDemoScenario(3)}>
              {lang === 'sw' ? 'Homa' : 'Fever'}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="btn-row">
        <Button variant="secondary" onClick={() => nav('/vitals')}>
          {lang === 'sw' ? 'Bendi' : 'Band'}
        </Button>
        <Button variant="secondary" onClick={() => nav('/contacts')}>
          {lang === 'sw' ? 'Wasiliana' : 'Contacts'}
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="secondary" onClick={() => nav('/summary')}>
          {lang === 'sw' ? 'Kwa muuguzi' : 'Nurse QR'}
        </Button>
        <Button variant="secondary" onClick={() => nav('/bp')}>
          {t('add_bp')}
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="secondary" onClick={() => nav('/orient')}>
          {lang === 'sw' ? 'Hadithi tena' : 'Replay story'}
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            lockSession();
            nav('/unlock');
          }}
        >
          {lang === 'sw' ? 'Funga' : 'Lock'}
        </Button>
      </div>
      <p className="trust-line">{t('saved_here')}</p>
      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
        {lang === 'sw'
          ? 'Msaada wa maamuzi tu — si utambuzi. Sensori za jaribio.'
          : 'Decision support only — not a diagnosis. Prototype sensors.'}
      </p>
    </main>
  );
}
