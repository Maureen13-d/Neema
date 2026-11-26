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
      <BrandMark />
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

      {ready && !ready.fieldReady ? (
        <div className="panel" style={{ marginBottom: '1rem' }} data-testid="demo-panel">
          <strong>{lang === 'sw' ? 'Maonyesho (hali za majaribio)' : 'Stage demo (scripted scenarios)'}</strong>
          <p className="soft-note" style={{ margin: '0.4rem 0 0' }}>
            {lang === 'sw'
              ? 'Kila hali inafuta vipimo na tahadhari kwenye simu hii, kisha inaendesha mnyororo kamili: sauti, SMS na ufuatiliaji.'
              : 'Each scenario clears readings and alerts on this phone, then runs the real chain: voice, SMS and escalation.'}
          </p>
          <div className="demo-grid">
            <Button variant="secondary" onClick={() => void g.playDemo('A').then(() => nav('/home'))}>
              A · {lang === 'sw' ? 'Usiku mwema' : 'Good night'}
            </Button>
            <Button variant="secondary" onClick={() => void g.playDemo('B_warning').then(() => nav('/home'))}>
              B1 · {lang === 'sw' ? 'Onyo 146/92' : 'Warning 146/92'}
            </Button>
            <Button variant="secondary" onClick={() => void g.playDemo('B_recheck').then(() => nav('/home'))}>
              B2 · {lang === 'sw' ? 'Pima tena 138/88' : 'Recheck 138/88'}
            </Button>
            <Button variant="secondary" onClick={() => void g.playDemo('C').then(() => nav('/alert'))}>
              C · {lang === 'sw' ? 'Dharura' : 'Emergency'}
            </Button>
            <Button variant="secondary" onClick={() => void g.playDemo('D').then(() => nav('/alert'))}>
              D · {lang === 'sw' ? 'Homa baada ya kujifungua' : 'Postpartum fever'}
            </Button>
            <Button variant="ghost" onClick={() => void g.resetDemo()}>
              {lang === 'sw' ? 'Anza upya' : 'Reset'}
            </Button>
          </div>
          {g.demoStep ? (
            <p className="soft-note" style={{ marginTop: '0.6rem' }} data-testid="demo-status">
              {lang === 'sw' ? 'Hali' : 'Running'}: {g.demoStep} · {g.triage?.level ?? '—'} ·{' '}
              {g.stage === 'postpartum'
                ? lang === 'sw'
                  ? 'baada ya kujifungua'
                  : 'postpartum'
                : lang === 'sw'
                  ? 'mimba'
                  : 'pregnancy'}
            </p>
          ) : null}
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
        <Button variant="secondary" onClick={() => nav('/chase')}>
          {lang === 'sw' ? 'Ufuatiliaji (CHP)' : 'Chase list (CHP)'}
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="secondary" onClick={() => nav('/bp')}>
          {t('add_bp')}
        </Button>
        <Button variant="secondary" onClick={() => nav('/check-in')}>
          {lang === 'sw' ? 'Angalia leo' : 'Check-in'}
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="secondary" onClick={() => nav('/epds')}>
          EPDS
        </Button>
        <Button variant="secondary" onClick={() => nav('/passport')}>
          {t('passport')}
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
