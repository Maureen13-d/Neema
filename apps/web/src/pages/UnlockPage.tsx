import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/BrandMark';
import { getAuthMeta, setPin, unlockWithPin } from '../services/auth';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';

/** Local PIN set / unlock — no cloud accounts. */
export function UnlockPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<'loading' | 'set' | 'unlock'>('loading');
  const [pin, setPinValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getAuthMeta().then((meta) => setMode(meta?.pinEnabled ? 'unlock' : 'set'));
  }, []);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'set') await setPin(pin);
      else await unlockWithPin(pin);
      nav('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'loading') return <LoadingScreen message="Checking your lock…" />;
  if (error) {
    return (
      <ErrorScreen
        title="Could not unlock"
        detail={error}
        onRetry={() => setError(null)}
        onHome={() => nav('/')}
      />
    );
  }

  return (
    <main className="screen">
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1.2rem' }}>
        {mode === 'set' ? 'Set your PIN' : 'Welcome back'}
      </h1>
      <p className="screen-sub">
        {mode === 'set'
          ? 'A local PIN keeps Mama Passport private on this phone.'
          : 'Enter your PIN to open Neema.'}
      </p>
      <div className="field">
        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          inputMode="numeric"
          type="password"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPinValue(e.target.value)}
          placeholder="••••"
        />
      </div>
      <Button variant="primary" disabled={busy || pin.length < 4} onClick={() => void submit()}>
        {mode === 'set' ? 'Save PIN & enter' : 'Unlock'}
      </Button>
    </main>
  );
}
