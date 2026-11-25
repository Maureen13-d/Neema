import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';

/** Live band presence — human states, not BLE jargon. */
export function VitalsPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const { t, lang } = useLocale();

  if (g.error) {
    return (
      <ErrorScreen
        title={lang === 'sw' ? 'Bendi haitaji' : 'Band needs attention'}
        detail={g.error}
        onRetry={() => g.clearError()}
        onHome={() => nav('/home')}
      />
    );
  }

  const q = g.sample?.signalQuality ?? 0;
  let presence = t('band_away');
  if (g.connected && q >= 50) presence = t('band_watching');
  else if (g.connected && q > 0) presence = t('band_weak');
  else if (g.connected) presence = t('waiting_signal');

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message={t('waiting_signal')} /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {lang === 'sw' ? 'Bendi yako' : 'Your band'}
      </h1>
      <p className="screen-sub">{presence}</p>

      <div className="metric-row">
        <div className="panel metric">
          <span style={{ color: 'var(--ink-muted)' }}>{lang === 'sw' ? 'Mapigo' : 'Heart rate'}</span>
          <b>{g.sample?.heartRate ?? '—'}</b>
          <span>bpm</span>
        </div>
        <div className="panel metric">
          <span style={{ color: 'var(--ink-muted)' }}>{lang === 'sw' ? 'Joto' : 'Skin temp'}</span>
          <b>{g.sample?.skinTempC?.toFixed(1) ?? '—'}</b>
          <span>°C</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>{lang === 'sw' ? 'Ishara' : 'Signal'}</span>
          <strong>{q}%</strong>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 10,
            borderRadius: 99,
            background: 'rgba(107, 83, 68, 0.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${q}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--calm), var(--lamp))',
              transition: 'width 300ms ease',
            }}
          />
        </div>
        {g.sample?.sos ? (
          <p style={{ margin: '0.8rem 0 0', color: 'var(--rose)', fontWeight: 700 }}>
            {lang === 'sw' ? 'SOS imewashwa' : 'SOS is on'}
          </p>
        ) : null}
      </div>

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        {!g.connected ? (
          <>
            <Button variant="primary" onClick={() => void g.connectSimulator()}>
              {t('start_watch')}
            </Button>
            <Button variant="secondary" onClick={() => void g.connectBluetooth()}>
              {t('connect_band')}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={() => void g.disconnect()}>
            {lang === 'sw' ? 'Achana na bendi' : 'Disconnect band'}
          </Button>
        )}
      </div>
      <p className="trust-line">{t('saved_here')}</p>
    </main>
  );
}
