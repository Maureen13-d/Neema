import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';

/** Manual Omron cuff entry — also used for YELLOW recheck. */
export function BpPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const [sys, setSys] = useState('120');
  const [dia, setDia] = useState('80');
  const isRecheck = g.recheck.status === 'due' || g.recheck.status === 'scheduled';

  async function save() {
    const result = await g.saveBp(Number(sys), Number(dia));
    const level = result?.level;
    if (level === 'RED' || level === 'YELLOW') nav('/alert');
    else nav('/home');
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message="Saving blood pressure…" /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {isRecheck ? 'Recheck blood pressure' : 'Blood pressure'}
      </h1>
      <p className="screen-sub">
        {isRecheck
          ? 'Sit, rest a minute, then measure again. Neema will compare this reading.'
          : 'Enter the reading from your upper-arm cuff. Sit, rest, then measure.'}
      </p>
      <div className="panel">
        <div className="field">
          <label htmlFor="sys">Systolic</label>
          <input id="sys" inputMode="numeric" value={sys} onChange={(e) => setSys(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="dia">Diastolic</label>
          <input id="dia" inputMode="numeric" value={dia} onChange={(e) => setDia(e.target.value)} />
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="secondary" onClick={() => nav(-1)}>
          Back
        </Button>
        <Button variant="primary" onClick={() => void save()}>
          {isRecheck ? 'Save recheck' : 'Save reading'}
        </Button>
      </div>
    </main>
  );
}
