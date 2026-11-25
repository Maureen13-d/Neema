import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/BrandMark';
import { saveConsent } from '../services/passport';
import { loadOnboarding, saveOnboarding } from '../hooks/useOnboarding';

/** Explicit sharing consent before any alert path. */
export function ConsentPage() {
  const nav = useNavigate();
  const [chp, setChp] = useState(true);
  const [family, setFamily] = useState(true);
  const [nurse, setNurse] = useState(true);
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    await saveConsent({
      version: 'consent-sw-v1',
      language: 'sw',
      agreedAtMs: Date.now(),
      sharing: { chp, family, nurse },
    });
    const flags = loadOnboarding();
    saveOnboarding({ ...flags, consentDone: true });
    nav('/unlock');
    setBusy(false);
  }

  return (
    <main className="screen">
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1.2rem' }}>
        Ridhaa yako
      </h1>
      <p className="screen-sub">Your consent. Choose who Neema may alert. You can change this later.</p>
      <div className="panel">
        {(
          [
            ['chp', 'Community health promoter (CHP)', chp, setChp],
            ['family', 'Family contact', family, setFamily],
            ['nurse', 'Nurse at clinic visits', nurse, setNurse],
          ] as const
        ).map(([key, label, value, setter]) => (
          <label
            key={key}
            style={{
              display: 'flex',
              gap: '0.75rem',
              alignItems: 'center',
              padding: '0.75rem 0',
              borderBottom: '1px solid rgba(255,255,255,.08)',
            }}
          >
            <input type="checkbox" checked={value} onChange={(e) => setter(e.target.checked)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <p style={{ fontSize: '0.85rem', opacity: 0.75, margin: '1rem 0' }}>
        Raw vitals stay on this phone. Only a short alert SMS can leave.
      </p>
      <Button variant="primary" disabled={busy || (!chp && !family)} onClick={() => void agree()}>
        Agree & continue
      </Button>
    </main>
  );
}
