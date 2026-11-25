import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { needsUnlock } from '../services/auth';
import { loadOnboarding } from '../hooks/useOnboarding';
import { LoadingScreen } from '../ui/LoadingScreen';

/** Gates guardian routes behind orientation, consent, and PIN unlock. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  const [state, setState] = useState<'loading' | 'ok' | 'orient' | 'consent' | 'unlock'>('loading');

  useEffect(() => {
    void (async () => {
      const flags = loadOnboarding();
      if (!flags.orientationDone) {
        setState('orient');
        return;
      }
      if (!flags.consentDone) {
        setState('consent');
        return;
      }
      if (await needsUnlock()) {
        setState('unlock');
        return;
      }
      setState('ok');
    })();
  }, [loc.pathname]);

  if (state === 'loading') return <LoadingScreen message="Opening Neema…" />;
  if (state === 'orient') return <Navigate to="/orient" replace />;
  if (state === 'consent') return <Navigate to="/consent" replace />;
  if (state === 'unlock') return <Navigate to="/unlock" replace />;
  return children;
}
