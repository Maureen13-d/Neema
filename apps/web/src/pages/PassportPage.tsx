import { useEffect, useState } from 'react';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';
import {
  EMPTY_BIRTH_PLAN,
  loadProfile,
  saveProfile,
  type MamaProfile,
} from '../services/passport';
import { latestEpds } from '../services/epdsStore';
import { listVisits, newVisit, saveVisit } from '../services/visits';
import { lockSession } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';
import type { BirthPlan, EpdsResult } from '@neema/core';
import type { VisitRecord } from '../storage/db';

const PLAN_FIELDS: { key: keyof Omit<BirthPlan, 'facility'>; en: string; sw: string }[] = [
  { key: 'skilledAttendant', en: 'Skilled attendant identified', sw: 'Mfanyakazi wa afya ametambuliwa' },
  { key: 'bloodDonor', en: 'Blood donor arranged', sw: 'Mfadhili wa damu amepangwa' },
  { key: 'savings', en: 'Savings set aside', sw: 'Akiba imewekwa' },
  { key: 'companion', en: 'Birth companion ready', sw: 'Mwenzako wa kuzaliwa yuko tayari' },
  { key: 'transport', en: 'Transport plan ready', sw: 'Mpango wa usafiri uko tayari' },
];

/** Mama Passport — lasting on-phone health profile + birth plan checklist. */
export function PassportPage() {
  const nav = useNavigate();
  const { t, lang } = useLocale();
  const [profile, setProfile] = useState<MamaProfile>({
    displayName: 'Mama',
    language: 'sw',
    stage: 'pregnancy',
    gestationWeeks: 32,
    discreetMode: false,
    birthPlan: { ...EMPTY_BIRTH_PLAN },
  });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [epds, setEpds] = useState<EpdsResult | null>(null);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [visitType, setVisitType] = useState<VisitRecord['type']>('antenatal');
  const [visitFacility, setVisitFacility] = useState('');

  useEffect(() => {
    void Promise.all([
      loadProfile(),
      latestEpds(),
      listVisits(),
    ])
      .then(([p, lastEpds, visitRows]) => {
        if (p) {
          setProfile({
            ...p,
            birthPlan: { ...EMPTY_BIRTH_PLAN, ...p.birthPlan },
          });
        }
        setEpds(lastEpds);
        setVisits(visitRows.slice(0, 8));
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

  function togglePlan(key: keyof Omit<BirthPlan, 'facility'>) {
    const plan = { ...EMPTY_BIRTH_PLAN, ...profile.birthPlan };
    plan[key] = !plan[key];
    setProfile({ ...profile, birthPlan: plan });
  }

  async function addVisit() {
    const visit = newVisit({
      type: visitType,
      ...(visitFacility.trim() ? { facilityName: visitFacility.trim() } : {}),
    });
    await saveVisit(visit);
    setVisits((prev) => [visit, ...prev].slice(0, 8));
    setVisitFacility('');
  }

  if (error) {
    return (
      <ErrorScreen
        title="Passport locked"
        detail={error}
        onRetry={() => setError(null)}
        onHome={() => nav('/home')}
      />
    );
  }

  const plan = { ...EMPTY_BIRTH_PLAN, ...profile.birthPlan };
  const planDone = [plan.skilledAttendant, plan.bloodDonor, plan.savings, plan.companion, plan.transport].filter(
    Boolean,
  ).length;

  return (
    <main className="screen">
      {busy ? <LoadingScreen message="Opening Mama Passport…" /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        {lang === 'sw' ? 'Pasipoti yako' : 'Your passport'}
      </h1>
      <p className="screen-sub">
        {lang === 'sw'
          ? 'Faragha kwenye simu hii. Inasaidia kitabu cha kliniki — haichukui nafasi yake.'
          : 'Private on this phone. Helps the clinic handbook — never replaces it.'}
      </p>
      <p className="trust-line">{t('saved_here')}</p>
      <div className="panel">
        <div className="field">
          <label htmlFor="name">{lang === 'sw' ? 'Jina / jina la utani' : 'Name / nickname'}</label>
          <input
            id="name"
            value={profile.displayName}
            onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="stage">{lang === 'sw' ? 'Hatua' : 'Stage'}</label>
          <select
            id="stage"
            value={profile.stage}
            onChange={(e) => setProfile({ ...profile, stage: e.target.value as MamaProfile['stage'] })}
          >
            <option value="pregnancy">{lang === 'sw' ? 'Ujauzito' : 'Pregnancy'}</option>
            <option value="postpartum">{lang === 'sw' ? 'Baada ya kujifungua' : 'Postpartum'}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="weeks">{lang === 'sw' ? 'Wiki za ujauzito' : 'Gestation weeks'}</label>
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
        <div className="field">
          <label htmlFor="edd">{lang === 'sw' ? 'Tarehe inayotarajiwa (EDD)' : 'Expected delivery date'}</label>
          <input
            id="edd"
            type="date"
            value={profile.expectedDeliveryDate ?? ''}
            onChange={(e) =>
              setProfile({
                ...profile,
                expectedDeliveryDate: e.target.value || undefined,
              })
            }
          />
        </div>
        <label className="chip" style={{ display: 'inline-flex', marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            checked={Boolean(profile.discreetMode)}
            onChange={(e) => setProfile({ ...profile, discreetMode: e.target.checked })}
            style={{ marginRight: '0.5rem' }}
          />
          {lang === 'sw' ? 'Hali ya siri (kichwa cha skrini tu)' : 'Discreet mode (quiet screen chrome)'}
        </label>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>
          {t('birth_plan_row')} · {planDone}/5
        </strong>
        <p className="soft-note" style={{ margin: '0.35rem 0 0.75rem' }}>
          {lang === 'sw'
            ? 'Orodha tu — si alama ya hatari.'
            : 'A plain checklist — not a risk score.'}
        </p>
        <div className="field">
          <label htmlFor="facility">{lang === 'sw' ? 'Kituo kilichochaguliwa' : 'Chosen facility'}</label>
          <input
            id="facility"
            value={plan.facility ?? ''}
            onChange={(e) =>
              setProfile({
                ...profile,
                birthPlan: { ...plan, facility: e.target.value || undefined },
              })
            }
          />
        </div>
        <div className="chip-grid" style={{ marginTop: '0.65rem' }}>
          {PLAN_FIELDS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="chip"
              aria-pressed={plan[f.key]}
              onClick={() => togglePlan(f.key)}
            >
              {lang === 'sw' ? f.sw : f.en}
            </button>
          ))}
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>{t('epds_title')}</strong>
        <p className="soft-note" style={{ margin: '0.35rem 0 0.65rem' }}>
          {epds
            ? lang === 'sw'
              ? `Mwisho: ${new Date(epds.tsMs).toLocaleDateString('sw-KE')}`
              : `Last screened: ${new Date(epds.tsMs).toLocaleDateString('en-KE')}`
            : t('epds_sub')}
        </p>
        <Button variant="secondary" style={{ width: '100%' }} onClick={() => nav('/epds')}>
          {lang === 'sw' ? 'Fungua EPDS' : 'Open EPDS'}
        </Button>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <strong>{lang === 'sw' ? 'Ziara za kliniki' : 'Clinic visits'}</strong>
        <p className="soft-note" style={{ margin: '0.35rem 0 0.75rem' }}>
          {lang === 'sw'
            ? 'Inasaidia kitabu — haichukui nafasi yake.'
            : 'Supports the handbook — never replaces it.'}
        </p>
        <div className="field">
          <label htmlFor="visit-type">{lang === 'sw' ? 'Aina' : 'Type'}</label>
          <select
            id="visit-type"
            value={visitType}
            onChange={(e) => setVisitType(e.target.value as VisitRecord['type'])}
          >
            <option value="antenatal">{lang === 'sw' ? 'Kabla ya kujifungua' : 'Antenatal'}</option>
            <option value="postnatal">{lang === 'sw' ? 'Baada ya kujifungua' : 'Postnatal'}</option>
            <option value="other">{lang === 'sw' ? 'Nyingine' : 'Other'}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="visit-facility">{lang === 'sw' ? 'Kituo' : 'Facility'}</label>
          <input
            id="visit-facility"
            value={visitFacility}
            onChange={(e) => setVisitFacility(e.target.value)}
            placeholder={lang === 'sw' ? 'Jina la kituo' : 'Facility name'}
          />
        </div>
        <Button variant="secondary" style={{ width: '100%' }} onClick={() => void addVisit()}>
          {lang === 'sw' ? 'Ongeza ziara' : 'Add visit'}
        </Button>
        {visits.length > 0 ? (
          <ul className="check-list" style={{ marginTop: '0.75rem' }}>
            {visits.map((v) => (
              <li key={v.id} className="soft-note" style={{ marginBottom: '0.35rem' }}>
                {new Date(v.tsMs).toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE')} · {v.type}
                {v.facilityName ? ` · ${v.facilityName}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="btn-row" style={{ marginTop: '1rem' }}>
        <Button variant="primary" onClick={() => void save()}>
          {saved
            ? lang === 'sw'
              ? 'Imehifadhiwa'
              : 'Saved'
            : lang === 'sw'
              ? 'Hifadhi pasipoti'
              : 'Save passport'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            lockSession();
            nav('/unlock');
          }}
        >
          {lang === 'sw' ? 'Funga' : 'Lock'}
        </Button>
      </div>
      <div className="btn-row" style={{ marginTop: '0.75rem' }}>
        <Button variant="ghost" onClick={() => nav('/check-in')}>
          {t('checkin_title')}
        </Button>
        <Button variant="ghost" onClick={() => nav('/chase')}>
          {t('chase_title')}
        </Button>
      </div>
    </main>
  );
}
