import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';

/** Live band vitals — Bluetooth or simulator. */
export function VitalsPage() {
  const g = useGuardian();

  if (g.error) {
    return <ErrorScreen title="Band link issue" detail={g.error} onRetry={() => g.clearError()} />;
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message="Listening to your band…" /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        Live vitals
      </h1>
      <p className="screen-sub">Per-second readings stay in memory. Only minute summaries are saved.</p>

      <div className="metric-row">
        <div className="panel metric">
          <span style={{ opacity: 0.7 }}>Heart rate</span>
          <b>{g.sample?.heartRate ?? '—'}</b>
          <span>bpm</span>
        </div>
        <div className="panel metric">
          <span style={{ opacity: 0.7 }}>Skin temp</span>
          <b>{g.sample?.skinTempC?.toFixed(1) ?? '—'}</b>
          <span>°C</span>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '0.9rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span>Signal</span>
          <strong>{g.sample?.signalQuality ?? 0}%</strong>
        </div>
        <div
          style={{
            marginTop: 8,
            height: 10,
            borderRadius: 99,
            background: 'rgba(255,255,255,.12)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${g.sample?.signalQuality ?? 0}%`,
              height: '100%',
              background: 'linear-gradient(90deg, var(--lagoon-mid), var(--lantern))',
              transition: 'width 300ms ease',
            }}
          />
        </div>
        <p style={{ margin: '0.8rem 0 0', fontSize: '0.9rem', opacity: 0.75 }}>
          {g.connected
            ? `Watching via ${g.bandMode === 'bluetooth' ? 'Bluetooth band' : 'simulator'}`
            : 'Not connected yet'}
          {g.sample?.sos ? ' · SOS active' : ''}
        </p>
      </div>

      <div className="btn-row" style={{ marginTop: '1rem', flexWrap: 'wrap' }}>
        {!g.connected ? (
          <>
            <Button variant="primary" onClick={() => void g.connectSimulator()}>
              Connect simulator
            </Button>
            <Button variant="secondary" onClick={() => void g.connectBluetooth()}>
              Connect Bluetooth
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => void g.disconnect()}>
              Disconnect
            </Button>
            {g.bandMode === 'simulator' ? (
              <Button variant="ghost" onClick={() => void g.connectBluetooth()}>
                Switch to Bluetooth
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => void g.connectSimulator()}>
                Switch to simulator
              </Button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
