import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';

function formatRecheckCountdown(sec: number | null): string {
  if (sec === null) return '';
  if (sec <= 0) return 'now';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m <= 0) return `${s}s`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Guardian home — one status, one action story. */
export function HomePage() {
  const nav = useNavigate();
  const g = useGuardian();
  const level = g.triage?.level ?? 'UNKNOWN';
  const recheckDue = g.recheck.status === 'due';
  const recheckScheduled = g.recheck.status === 'scheduled';

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen /> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark />
        <button className="btn btn-ghost" type="button" onClick={() => nav('/settings')} style={{ paddingInline: 10 }}>
          More
        </button>
      </div>

      <StatusOrb level={level} />

      <div className="panel" style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.45 }}>{g.message}</p>
        {g.lastChainNote ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.8, fontSize: '0.85rem' }}>{g.lastChainNote}</p>
        ) : null}
        {recheckScheduled && g.recheckDueInSec !== null ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.75, fontSize: '0.9rem' }}>
            Recheck BP in {formatRecheckCountdown(g.recheckDueInSec)}
          </p>
        ) : null}
      </div>

      {g.pendingSmsHref ? (
        <div className="panel action-banner" style={{ marginBottom: '0.75rem' }}>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.95rem' }}>
            {level === 'RED' ? 'SMS ready for your CHP — open it now.' : 'Quiet CHP heads-up is ready.'}
          </p>
          <div className="btn-row">
            <a className="btn btn-primary" href={g.pendingSmsHref} style={{ flex: 1 }}>
              Open SMS
            </a>
            <Button variant="ghost" onClick={() => g.clearPendingSms()}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {recheckDue ? (
        <Button variant="primary" onClick={() => nav('/bp')} style={{ width: '100%', marginBottom: '0.75rem' }}>
          Recheck BP now
        </Button>
      ) : null}

      {!g.connected ? (
        <div style={{ marginBottom: '0.75rem' }}>
          <Button
            variant="primary"
            onClick={() => void g.connectSimulator()}
            style={{ width: '100%', marginBottom: '0.5rem' }}
          >
            Start night watch
          </Button>
          <Button
            variant="secondary"
            onClick={() => void g.connectBluetooth()}
            style={{ width: '100%' }}
          >
            Connect band (Bluetooth)
          </Button>
        </div>
      ) : (
        <p style={{ textAlign: 'center', opacity: 0.65, fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
          Watching via {g.bandMode === 'bluetooth' ? 'Bluetooth band' : 'simulator'}
        </p>
      )}

      {level === 'RED' || level === 'YELLOW' ? (
        <Button variant="danger" onClick={() => nav('/alert')} style={{ width: '100%', marginBottom: '0.75rem' }}>
          {level === 'RED' ? 'Act now · Open alert' : 'Review warning'}
        </Button>
      ) : null}

      <div className="btn-row">
        <Button variant="secondary" onClick={() => nav('/bp')}>
          Add BP
        </Button>
        <Button variant="secondary" onClick={() => nav('/symptoms')}>
          Symptoms
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="ghost" onClick={() => nav('/vitals')}>
          Live vitals
        </Button>
        <Button variant="ghost" onClick={() => nav('/summary')}>
          Nurse summary
        </Button>
      </div>
    </main>
  );
}
