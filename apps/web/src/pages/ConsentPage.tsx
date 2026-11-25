import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { BrandMark } from '../ui/BrandMark';
import { LangToggle } from '../ui/LangToggle';
import { useLocale } from '../hooks/useLocale';
import { saveConsent } from '../services/passport';
import { loadOnboarding, saveOnboarding } from '../hooks/useOnboarding';

/** Consent as trust — who may hear when you need help. */
export function ConsentPage() {
  const nav = useNavigate();
  const { lang, t } = useLocale();
  const [chp, setChp] = useState(true);
  const [family, setFamily] = useState(true);
  const [nurse, setNurse] = useState(true);
  const [busy, setBusy] = useState(false);

  async function agree() {
    setBusy(true);
    await saveConsent({
      version: 'consent-sw-v1',
      language: lang,
      agreedAtMs: Date.now(),
      sharing: { chp, family, nurse },
    });
    const flags = loadOnboarding();
    saveOnboarding({ ...flags, consentDone: true });
    nav('/unlock');
    setBusy(false);
  }

  const rows = [
    {
      key: 'chp',
      label: lang === 'sw' ? 'MH (CHP) wa jamii' : 'Community health promoter (CHP)',
      value: chp,
      set: setChp,
    },
    {
      key: 'family',
      label: lang === 'sw' ? 'Familia' : 'Family contact',
      value: family,
      set: setFamily,
    },
    {
      key: 'nurse',
      label: lang === 'sw' ? 'Muuguzi kliniki' : 'Nurse at clinic visits',
      value: nurse,
      set: setNurse,
    },
  ] as const;

  return (
    <main className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <BrandMark />
        <LangToggle />
      </div>
      <h1 className="screen-title" style={{ marginTop: '1.2rem' }}>
        {lang === 'sw' ? 'Nani asaidie?' : 'Who should help?'}
      </h1>
      <p className="screen-sub">
        {lang === 'sw'
          ? 'Chagua nani Neema aweze kuwasiliana naye wakati wa hatari. Unaweza kubadilisha baadaye.'
          : 'Choose who Neema may reach when something is wrong. You can change this later.'}
      </p>
      <div className="panel">
        {rows.map((row) => (
          <label key={row.key} className="row-divided">
            <input type="checkbox" checked={row.value} onChange={(e) => row.set(e.target.checked)} />
            <span>{row.label}</span>
          </label>
        ))}
      </div>
      <p className="soft-note" style={{ margin: '1rem 0' }}>
        {lang === 'sw'
          ? 'Vipimo viko kwenye simu. SMS fupi tu inaweza kutoka.'
          : 'Readings stay on this phone. Only a short alert SMS can leave.'}
      </p>
      <Button variant="primary" disabled={busy || (!chp && !family)} onClick={() => void agree()}>
        {lang === 'sw' ? 'Nakubali · Endelea' : 'I agree · Continue'}
      </Button>
      <p className="trust-line">{t('saved_here')}</p>
    </main>
  );
}
