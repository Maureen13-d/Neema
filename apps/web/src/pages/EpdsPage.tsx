/**
 * Kiswahili EPDS (10 questions). Item 10 or cut-off → person first, never a triage colour.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { LoadingScreen } from '../ui/LoadingScreen';
import { SigningSlot } from '../ui/SigningSlot';
import { saveEpds } from '../services/epdsStore';
import { useLocale } from '../hooks/useLocale';

/** Short draft prompts — TODO(clinician + native speaker): replace with approved Kiswahili EPDS. */
const QUESTIONS: { en: string; sw: string }[] = [
  { en: 'I have been able to laugh and see the funny side of things', sw: 'Nimeweza kucheka na kuona mambo ya kuchekesha' },
  { en: 'I have looked forward with enjoyment to things', sw: 'Nimetazamia mambo kwa furaha' },
  { en: 'I have blamed myself unnecessarily when things went wrong', sw: 'Nimejilaumu bila sababu mambo yanapoenda vibaya' },
  { en: 'I have been anxious or worried for no good reason', sw: 'Nimekuwa na wasiwasi bila sababu nzuri' },
  { en: 'I have felt scared or panicky for no good reason', sw: 'Nimehisi hofu au hofu kubwa bila sababu' },
  { en: 'Things have been getting on top of me', sw: 'Mambo yamenizidi' },
  { en: 'I have been so unhappy that I have had difficulty sleeping', sw: 'Nimekuwa na huzuni sana hata kulala ni shida' },
  { en: 'I have felt sad or miserable', sw: 'Nimehisi huzuni au mateso' },
  { en: 'I have been so unhappy that I have been crying', sw: 'Nimekuwa na huzuni sana hata ninalia' },
  { en: 'The thought of harming myself has occurred to me', sw: 'Wazo la kujidhuru limenijia' },
];

const ANSWER_LABELS = [
  { en: 'As much as always / No', sw: 'Kama kawaida / Hapana' },
  { en: 'Not quite so much / Hardly', sw: 'Si sana / Mara chache' },
  { en: 'Definitely less / Sometimes', sw: 'Kidogo / Wakati mwingine' },
  { en: 'Not at all / Yes, quite often', sw: 'Hapana kabisa / Mara nyingi' },
];

/** EPDS questionnaire — routes to a person when flagged; never paints a colour. */
export function EpdsPage() {
  const nav = useNavigate();
  const { lang } = useLocale();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(-1));
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{
    messageKey: 'epds_ok' | 'epds_talk_to_person';
    total: number;
  } | null>(null);

  const current = QUESTIONS[step]!;
  const complete = useMemo(() => answers.every((a) => a >= 0), [answers]);

  function pick(value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step] = value;
      return next;
    });
    if (step < 9) setStep((s) => s + 1);
  }

  async function finish() {
    if (!complete) return;
    setBusy(true);
    try {
      const saved = await saveEpds(answers);
      if (!saved) return;
      setOutcome({ messageKey: saved.messageKey, total: saved.score.total });
    } finally {
      setBusy(false);
    }
  }

  if (outcome) {
    const toPerson = outcome.messageKey === 'epds_talk_to_person';
    return (
      <main className="screen">
        <BrandMark />
        <h1 className="screen-title" style={{ marginTop: '1rem' }}>
          {toPerson
            ? lang === 'sw'
              ? 'Zungumza na mtu'
              : 'Talk to someone'
            : lang === 'sw'
              ? 'Asante'
              : 'Thank you'}
        </h1>
        <p className="screen-sub">
          {toPerson
            ? lang === 'sw'
              ? 'Majibu yako yanaonyesha unahitaji mtu wa kuzungumza naye. Hii si utambuzi — ni msaada.'
              : 'Your answers show you should talk to a health worker. This is not a diagnosis — it is support.'
            : lang === 'sw'
              ? 'Tumeshika majibu yako kwa faragha kwenye simu hii.'
              : 'We kept your answers private on this phone.'}
        </p>
        <SigningSlot messageKey={outcome.messageKey} lang={lang} />
        <div className="panel" style={{ marginTop: '1rem' }}>
          <p className="soft-note" style={{ margin: 0 }}>
            {lang === 'sw' ? `Jumla (si rangi): ${outcome.total}` : `Total (not a colour): ${outcome.total}`}
          </p>
        </div>
        <div className="btn-row" style={{ marginTop: '1.25rem' }}>
          {toPerson ? (
            <Button variant="primary" onClick={() => nav('/contacts')}>
              {lang === 'sw' ? 'Fungua anwani' : 'Open contacts'}
            </Button>
          ) : null}
          <Button variant="secondary" onClick={() => nav('/home')}>
            {lang === 'sw' ? 'Nyumbani' : 'Home'}
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="screen">
      {busy ? <LoadingScreen /> : null}
      <BrandMark />
      <h1 className="screen-title" style={{ marginTop: '1rem' }}>
        EPDS
      </h1>
      <p className="screen-sub">
        {lang === 'sw'
          ? `Swali ${step + 1} kati ya 10 · hakuna rangi ya hatari`
          : `Question ${step + 1} of 10 · never paints a risk colour`}
      </p>

      <div className="panel">
        <p style={{ margin: 0, fontWeight: 600 }}>{lang === 'sw' ? current.sw : current.en}</p>
        <div className="chip-grid" style={{ marginTop: '0.85rem' }}>
          {[0, 1, 2, 3].map((v) => (
            <button
              key={v}
              type="button"
              className="chip"
              aria-pressed={answers[step] === v}
              onClick={() => pick(v)}
            >
              {lang === 'sw' ? ANSWER_LABELS[v]!.sw : ANSWER_LABELS[v]!.en}
            </button>
          ))}
        </div>
      </div>

      <div className="btn-row" style={{ marginTop: '1.25rem' }}>
        <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
          {lang === 'sw' ? 'Nyuma' : 'Back'}
        </Button>
        <Button variant="primary" disabled={!complete} onClick={() => void finish()}>
          {lang === 'sw' ? 'Maliza' : 'Finish'}
        </Button>
      </div>
      <p className="trust-line">
        {lang === 'sw'
          ? 'Rasimu — inahitaji ukaguzi wa mtaalamu na mzungumzaji asilia.'
          : 'Draft — needs clinician and native-speaker review.'}
      </p>
    </main>
  );
}
