/**
 * Signing slot for pre-approved clips keyed by messageKey.
 * Prototype placeholder only — production needs Kenyan Sign Language (KSL) clips.
 *
 * ASSUMPTION: Until real clips ship, we show a labelled placeholder panel.
 * Do not generate signs. How2Sign-style research clips would be CC BY-NC 4.0
 * and still not KSL — keep the "placeholder" label visible.
 */

import { useEffect, useState } from 'react';

const LIBRARY: Record<string, { titleEn: string; titleSw: string; note: string }> = {
  green_calm: {
    titleEn: 'You are okay',
    titleSw: 'Uko salama',
    note: 'placeholder · not KSL',
  },
  yellow_recheck_bp: {
    titleEn: 'Recheck blood pressure',
    titleSw: 'Pima shinikizo tena',
    note: 'placeholder · not KSL',
  },
  yellow_fever: {
    titleEn: 'Raised temperature',
    titleSw: 'Joto limepanda',
    note: 'placeholder · not KSL',
  },
  yellow_pulse_baseline: {
    titleEn: 'Heart rate above usual',
    titleSw: 'Mapigo juu ya kawaida',
    note: 'placeholder · not KSL',
  },
  yellow_baby_movement: {
    titleEn: 'Baby moving less',
    titleSw: 'Mtoto anatembea kidogo',
    note: 'placeholder · not KSL',
  },
  yellow_signal_lost: {
    titleEn: 'Weak band with symptoms',
    titleSw: 'Ishara dhaifu na dalili',
    note: 'placeholder · not KSL',
  },
  red_go_now: {
    titleEn: 'Go to a facility now',
    titleSw: 'Nenda kituo sasa',
    note: 'placeholder · not KSL',
  },
  red_bleeding: {
    titleEn: 'Heavy bleeding — go now',
    titleSw: 'Kutokwa damu nyingi — nenda sasa',
    note: 'placeholder · not KSL',
  },
  red_sos: {
    titleEn: 'SOS — seek help',
    titleSw: 'SOS — tafuta msaada',
    note: 'placeholder · not KSL',
  },
  unknown_check_band: {
    titleEn: 'Check your band',
    titleSw: 'Angalia bendi yako',
    note: 'placeholder · not KSL',
  },
  epds_ok: {
    titleEn: 'Answers kept private',
    titleSw: 'Majibu yamehifadhiwa kwa faragha',
    note: 'placeholder · not KSL',
  },
  epds_talk_to_person: {
    titleEn: 'Talk to your health worker',
    titleSw: 'Zungumza na mhudumu',
    note: 'placeholder · not KSL',
  },
};

/** Plays a fixed signed clip for a message key, or shows the placeholder card. */
export function SigningSlot({
  messageKey,
  lang = 'en',
  autoShow = true,
}: {
  messageKey: string;
  lang?: 'en' | 'sw';
  autoShow?: boolean;
}) {
  const [visible, setVisible] = useState(autoShow);
  const entry = LIBRARY[messageKey];

  useEffect(() => {
    setVisible(autoShow);
  }, [messageKey, autoShow]);

  if (!entry || !visible) return null;

  return (
    <div className="signing-slot" role="region" aria-label={lang === 'sw' ? 'Ishara' : 'Sign language'}>
      <div className="signing-slot__frame" aria-hidden>
        <svg viewBox="0 0 48 48" width="40" height="40">
          <path
            d="M18 34 V16 a3 3 0 0 1 6 0 v10 M24 26 V14 a3 3 0 0 1 6 0 v12 M30 26 V18 a3 3 0 0 1 6 0 v12 c0 6-4 10-10 10 h-2 c-6 0-10-4-10-10 V28"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div>
        <strong>{lang === 'sw' ? entry.titleSw : entry.titleEn}</strong>
        <p className="soft-note" style={{ margin: '0.25rem 0 0' }}>
          {entry.note} · {lang === 'sw' ? 'KSL itakuja' : 'KSL clips coming'}
        </p>
      </div>
      <button type="button" className="btn btn-ghost" onClick={() => setVisible(false)}>
        {lang === 'sw' ? 'Ficha' : 'Hide'}
      </button>
    </div>
  );
}
