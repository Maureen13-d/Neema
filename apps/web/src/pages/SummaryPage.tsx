import { useMemo, useState } from 'react';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { buildSummaryForQr } from '../services/summaryQr';
import { loadProfile } from '../services/passport';
import { db } from '../storage/db';
import { useEffect } from 'react';

/** Nurse one-page handoff with QR payload. */
export function SummaryPage() {
  const g = useGuardian();
  const [name, setName] = useState('Mama');
  const [payload, setPayload] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      const profile = await loadProfile().catch(() => null);
      if (profile?.displayName) setName(profile.displayName);
      const bp = await db.bp.orderBy('tsMs').toArray();
      const symptoms = await db.symptoms.orderBy('tsMs').toArray();
      const alerts = await db.alerts.orderBy('tsMs').toArray();
      const built = buildSummaryForQr({
        displayName: profile?.displayName ?? 'Mama',
        stage: profile?.stage ?? 'pregnancy',
        gestationWeeks: profile?.gestationWeeks,
        expectedDeliveryDate: profile?.expectedDeliveryDate,
        bp,
        symptoms,
        alerts,
        recentVitals: [],
        latestLevel: g.triage?.level ?? 'UNKNOWN',
        share: {
          includeBpTrend: true,
          includeAlerts: true,
          includeSymptoms: true,
          includeDueDate: true,
        },
        generatedAtMs: Date.now(),
      });
      setPayload(built.payload);
    })();
  }, [g.triage?.level]);

  const preview = useMemo(() => {
    try {
      return JSON.parse(payload || '{}') as { level?: string; mother?: string };
    } catch {
      return {};
    }
  }, [payload]);

  return (
    <main className="screen">
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        Nurse summary
      </h1>
      <p className="screen-sub">One page. About 30 seconds. You choose what is shared.</p>
      <div className="panel" style={{ textAlign: 'center' }}>
        <div
          style={{
            width: 180,
            height: 180,
            margin: '0 auto 1rem',
            borderRadius: 18,
            background: `
              repeating-linear-gradient(0deg, #062e2c, #062e2c 8px, #0a4f4a 8px, #0a4f4a 16px),
              repeating-linear-gradient(90deg, #062e2c, #062e2c 8px, #0a4f4a 8px, #0a4f4a 16px)
            `,
            display: 'grid',
            placeItems: 'center',
            border: '4px solid var(--lantern)',
            boxShadow: 'var(--shadow)',
          }}
          aria-hidden
        >
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>QR</span>
        </div>
        <p style={{ margin: 0 }}>
          <strong>{preview.mother ?? name}</strong> · {preview.level ?? g.triage?.level ?? '—'}
        </p>
      </div>
      <Button
        variant="primary"
        style={{ width: '100%', marginTop: '1rem' }}
        onClick={async () => {
          await navigator.clipboard?.writeText(payload);
          setCopied(true);
        }}
      >
        {copied ? 'Payload copied' : 'Copy QR payload'}
      </Button>
    </main>
  );
}
