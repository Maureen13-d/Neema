import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';
import { raiseAlert, acknowledgeRed } from '../services/alerts';
import { speakMessageKey } from '../services/speech';
import { requestAlertLocation, LocationError } from '../services/location';
import { listContacts } from '../services/contacts';
import { db } from '../storage/db';

/** Action screen — not a dashboard. */
export function AlertPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const [smsHref, setSmsHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const level = g.triage?.level ?? 'UNKNOWN';

  async function act() {
    if (!g.triage || (level !== 'RED' && level !== 'YELLOW')) return;
    setBusy(true);
    setErr(null);
    try {
      await speakMessageKey(g.triage.messageKey);
      let locationUrl: string | undefined;
      try {
        locationUrl = (await requestAlertLocation()).mapsUrl;
      } catch (e) {
        if (!(e instanceof LocationError)) throw e;
      }
      let contacts = await listContacts();
      if (contacts.length === 0) {
        contacts = [
          {
            id: 'demo-chp',
            name: 'CHP',
            role: 'chp',
            phone: '+254700000000',
            escalationOrder: 1,
          },
        ];
        await db.contacts.put(contacts[0]!);
      }
      const { smsLinks } = await raiseAlert(
        {
          level,
          firedRules: g.triage.firedRules,
          motherName: 'Mama',
          reasonCode: g.triage.reasons[0] ?? 'alert',
          ...(locationUrl ? { locationUrl } : {}),
        },
        contacts,
        { allowDemo: true, skipConsent: false },
      );
      setSmsHref(smsLinks[0]?.href ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function ack() {
    const latest = await db.alerts.orderBy('tsMs').reverse().first();
    if (latest) await acknowledgeRed(latest.id);
    await g.refreshTriage(false);
    nav('/home');
  }

  if (err) {
    return (
      <ErrorScreen
        title="Alert could not send"
        detail={err}
        onRetry={() => setErr(null)}
        onHome={() => nav('/home')}
      />
    );
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen message="Preparing your action…" /> : null}
      <BrandMark />
      <StatusOrb level={level === 'GREEN' || level === 'UNKNOWN' ? 'YELLOW' : level} />
      <div className="panel" style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.45 }}>{g.message}</p>
        <p style={{ margin: '0.75rem 0 0', opacity: 0.7, fontSize: '0.85rem' }}>
          {g.triage?.firedRules.join(' · ') ?? '—'}
        </p>
      </div>
      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="danger" onClick={() => void act()}>
          Speak & prepare SMS
        </Button>
      </div>
      {smsHref ? (
        <a className="btn btn-primary" href={smsHref} style={{ marginTop: '0.75rem', width: '100%' }}>
          Open SMS to CHP
        </a>
      ) : null}
      {level === 'RED' ? (
        <Button variant="secondary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => void ack()}>
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
