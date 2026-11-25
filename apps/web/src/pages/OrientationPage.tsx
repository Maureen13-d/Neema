import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/BrandMark';
import { loadOnboarding, saveOnboarding } from '../hooks/useOnboarding';

const SLIDES = [
  {
    title: 'Watches with you',
    body: 'Heart rate and temperature through the night — plus the BP and symptoms you share.',
  },
  {
    title: 'One clear action',
    body: 'GREEN means rest easy. YELLOW means recheck. RED means go now — spoken in Swahili.',
  },
  {
    title: 'Your people know',
    body: 'On danger, Neema prepares an SMS for your CHP and family with where you are.',
  },
  {
    title: 'Data stays here',
    body: 'Raw readings stay on this phone. Only the alert leaves. You choose what to share.',
  },
] as const;

/** First-run orientation carousel. */
export function OrientationPage() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const slide = SLIDES[i]!;

  function finish() {
    const flags = loadOnboarding();
    saveOnboarding({ ...flags, orientationDone: true });
    nav('/consent');
  }

  return (
    <main className="screen">
      <BrandMark />
      <div className="panel" style={{ marginTop: '1.5rem', minHeight: 260 }}>
        <p style={{ opacity: 0.7, margin: '0 0 0.5rem', fontWeight: 700 }}>
          {i + 1} / {SLIDES.length}
        </p>
        <h1 className="screen-title">{slide.title}</h1>
        <p className="screen-sub">{slide.body}</p>
        <div style={{ display: 'flex', gap: 6, marginTop: '1rem' }}>
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              style={{
                width: idx === i ? 22 : 8,
                height: 8,
                borderRadius: 99,
                background: idx === i ? 'var(--lantern)' : 'rgba(255,255,255,.25)',
                transition: 'width 200ms ease',
              }}
            />
          ))}
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: '1.25rem' }}>
        <Button variant="ghost" onClick={finish}>
          Skip
        </Button>
        {i < SLIDES.length - 1 ? (
          <Button variant="primary" onClick={() => setI((v) => v + 1)}>
            Next
          </Button>
        ) : (
          <Button variant="primary" onClick={finish}>
            Continue
          </Button>
        )}
      </div>
    </main>
  );
}
