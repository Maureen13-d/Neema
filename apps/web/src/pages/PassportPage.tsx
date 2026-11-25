import { useEffect, useState } from 'react';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';
import { loadProfile, saveProfile, type MamaProfile } from '../services/passport';
import { lockSession } from '../services/auth';
import { useNavigate } from 'react-router-dom';

/** Mama Passport — lasting on-phone health profile. */
export function PassportPage() {
  const nav = useNavigate();
  const [profile, setProfile] = useState<MamaProfile>({
    displayName: 'Mama',
    language: 'sw',
    stage: 'pregnancy',
    gestationWeeks: 32,
    discreetMode: false,
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void loadProfile()
      .then((p) => {
        if (p) setProfile(p);
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setBusy(false));
  }, []);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveProfile(profile);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return <ErrorScreen title="Passport locked" detail={error} onRetry={() => setError(null)} onHome={() => nav('/home')} />;
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen message="Opening Mama Passport…" /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        Your passport
      </h1>
      <p className="screen-sub">Private on this phone. Helps the clinic handbook — never replaces it.</p>
      <p className="trust-line">Saved on this phone — works offline</p>
      <div className="panel">
        <div className="field">
          <label htmlFor="name">Name / nickname</label>
          <input
            id="name"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="stage">Stage</label>
          <select
            id="stage"
            value={profile.stage}
            onChange={(e) => setProfile({ ...profile, stage: e.target.value as MamaProfile['stage'] })}
          >
            <option value="pregnancy">Pregnancy</option>
            <option value="postpartum">Postpartum</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="weeks">Gestation weeks</label>
          <input
            id="weeks"
            inputMode="numeric"
            value={profile.gestationWeeks ?? ''}
            onChange={(e) => {
              const next = { ...profile };
              if (e.target.value) next.gestationWeeks = Number(e.target.value);
              else delete next.gestationWeeks;
              setProfile(next);
            }}
          />
        </div>
      </div>
      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="primary" onClick={() => void save()}>
          {saved ? 'Saved ✓' : 'Save passport'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            lockSession();
            nav('/unlock');
          }}
        >
          Lock
        </Button>
      </div>
    </main>
  );
}
