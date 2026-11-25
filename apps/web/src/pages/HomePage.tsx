import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';

/** Guardian home — one status, one action story. */
export function HomePage() {
  const nav = useNavigate();
  const g = useGuardian();
  const level = g.triage?.level ?? 'UNKNOWN';

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
        {g.triage?.recheckInMinutes ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.75, fontSize: '0.9rem' }}>
            Recheck in about {g.triage.recheckInMinutes} minutes
          </p>
        ) : null}
      </div>

      {!g.connected ? (
        <Button
          variant="primary"
          onClick={() => void g.connectSimulator()}
          style={{ width: '100%', marginBottom: '0.75rem' }}
        >
          Start night watch
        </Button>
      ) : null}

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
