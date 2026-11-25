import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { getReadiness, type ReadinessReport } from '../services/readiness';
import { lockSession } from '../services/auth';

/** Settings, readiness, and secondary destinations. */
export function SettingsPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState<ReadinessReport | null>(null);

  useEffect(() => {
    void getReadiness().then(setReady);
  }, []);

  return (
    <main className="screen">
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        More
      </h1>
      <p className="screen-sub">Privacy, people, and field readiness.</p>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <strong>Field readiness</strong>
        <p style={{ margin: '0.4rem 0 0', opacity: 0.8 }}>
          {ready?.fieldReady ? 'Ready for supervised field use' : 'Demo mode — gates still open'}
        </p>
        {ready && ready.blockers.length > 0 ? (
          <ul style={{ margin: '0.6rem 0 0', paddingLeft: 18, opacity: 0.75, fontSize: '0.9rem' }}>
            {ready.blockers.slice(0, 4).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="btn-row">
        <Button variant="secondary" onClick={() => nav('/contacts')}>
          Contacts
        </Button>
        <Button variant="secondary" onClick={() => nav('/summary')}>
          Nurse summary
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="secondary" onClick={() => nav('/orient')}>
          Replay orientation
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            lockSession();
            nav('/unlock');
          }}
        >
          Lock session
        </Button>
      </div>
      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', opacity: 0.55 }}>
        Decision support only — not a diagnosis. Prototype sensors.
      </p>
    </main>
  );
}
