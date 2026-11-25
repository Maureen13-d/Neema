import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';

/** Action screen — alert chain already prepared by guardian on YELLOW/RED. */
export function AlertPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const level = g.triage?.level ?? 'UNKNOWN';
  const smsHref = g.pendingSmsHref;
  const recheckDue = g.recheck.status === 'due';
  const recheckScheduled = g.recheck.status === 'scheduled';

  if (g.error) {
    return (
      <ErrorScreen
        title="Alert could not prepare"
        detail={g.error}
        onRetry={() => g.clearError()}
        onHome={() => nav('/home')}
      />
    );
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message="Preparing your action…" /> : null}
      <BrandMark />
      <StatusOrb level={level === 'GREEN' || level === 'UNKNOWN' ? 'YELLOW' : level} />
      <div className="panel" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.45 }}>{g.message}</p>
        <p style={{ margin: '0.75rem 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
          {g.triage?.firedRules.join(' · ') ?? '—'}
        </p>
        {g.lastChainNote ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.8, fontSize: '0.85rem' }}>{g.lastChainNote}</p>
        ) : null}
        {recheckScheduled && g.recheckDueInSec !== null ? (
          <p style={{ margin: '0.6rem 0 0', opacity: 0.75, fontSize: '0.9rem' }}>
            Recheck due in {g.recheckDueInSec}s
          </p>
        ) : null}
      </div>

      {smsHref ? (
        <a className="btn btn-danger" href={smsHref} style={{ marginTop: '1rem', width: '100%' }}>
          Open SMS to CHP
        </a>
      ) : (
        <Button
          variant="danger"
          style={{ width: '100%', marginTop: '1rem' }}
          onClick={() => void g.refreshTriage(level === 'RED')}
        >
          Prepare SMS again
        </Button>
      )}

      {recheckDue || recheckScheduled ? (
        <Button
          variant="primary"
          style={{ width: '100%', marginTop: '0.75rem' }}
          onClick={() => nav('/bp')}
        >
          {recheckDue ? 'Recheck BP now' : 'Enter recheck BP'}
        </Button>
      ) : null}

      {level === 'RED' ? (
        <Button
          variant="secondary"
          style={{ width: '100%', marginTop: '0.75rem' }}
          onClick={() => void g.acknowledgeActiveRed().then(() => nav('/home'))}
        >
          Acknowledge RED
        </Button>
      ) : (
        <Button variant="ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => nav('/home')}>
          Back home
        </Button>
      )}
    </main>
  );
}
