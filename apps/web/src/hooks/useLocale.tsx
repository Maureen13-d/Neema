/**
 * First-class EN / SW copy for mother-facing UI.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Lang = 'en' | 'sw';

const KEY = 'neema.lang.v1';

type Dict = Record<string, { en: string; sw: string }>;

const COPY: Dict = {
  brand_sub: {
    en: 'With you through the night',
    sw: 'Pamoja nawe usiku',
  },
  youre_okay: {
    en: 'You’re okay',
    sw: 'Uko salama',
  },
  check_bp: {
    en: 'Check your blood pressure',
    sw: 'Pima shinikizo la damu',
  },
  call_chp: {
    en: 'Call your CHP',
    sw: 'Piga simu CHP yako',
  },
  open_sms: {
    en: 'Open message to CHP',
    sw: 'Fungua ujumbe kwa CHP',
  },
  waiting_signal: {
    en: 'Waiting for your band…',
    sw: 'Inasubiri bendi yako…',
  },
  all_quiet: {
    en: 'All quiet. Rest when you can.',
    sw: 'Tulivu. Pumzika unapoweza.',
  },
  start_watch: {
    en: 'Begin watching',
    sw: 'Anza kulinda',
  },
  connect_band: {
    en: 'Connect your band',
    sw: 'Unganisha bendi',
  },
  band_watching: {
    en: 'Band is watching with you',
    sw: 'Bendi inakulinda',
  },
  band_away: {
    en: 'Band not connected',
    sw: 'Bendi haijaunganishwa',
  },
  band_weak: {
    en: 'Band signal is weak',
    sw: 'Ishara ya bendi ni dhaifu',
  },
  saved_here: {
    en: 'Saved on this phone — works offline',
    sw: 'Imehifadhiwa kwenye simu — inafanya bila mtandao',
  },
  how_feel: {
    en: 'How do you feel?',
    sw: 'Unajisikiaje?',
  },
  add_bp: {
    en: 'Add blood pressure',
    sw: 'Ongeza shinikizo',
  },
  recheck_now: {
    en: 'Recheck blood pressure now',
    sw: 'Pima tena shinikizo sasa',
  },
  sit_rest: {
    en: 'Sit, rest a minute, then measure again.',
    sw: 'Kaa, pumzika dakika, kisha pima tena.',
  },
  nurse_why: {
    en: 'Show this at the clinic so the nurse sees your recent story in one glance.',
    sw: 'Onyesha kliniki ili muuguzi aone hadithi yako kwa haraka.',
  },
  more: { en: 'More', sw: 'Zaidi' },
  home: { en: 'Home', sw: 'Nyumbani' },
  signs: { en: 'Signs', sw: 'Dalili' },
  passport: { en: 'Passport', sw: 'Pasipoti' },
  language: { en: 'Language', sw: 'Lugha' },
  try_again: { en: 'Try again', sw: 'Jaribu tena' },
  go_home: { en: 'Go home', sw: 'Rudi nyumbani' },
  loading: { en: 'One moment…', sw: 'Subiri kidogo…' },
  something_wrong: {
    en: 'Something went wrong',
    sw: 'Kuna tatizo',
  },
  breathe: {
    en: 'Breathe slowly. Help is one step away.',
    sw: 'Pumua polepole. Msaada uko karibu.',
  },
  wait_reply: {
    en: 'After you send, stay near your phone and wait for a reply.',
    sw: 'Baada ya kutuma, kaa karibu na simu na subiri jibu.',
  },
  dismiss: { en: 'Not now', sw: 'Si sasa' },
  next: { en: 'Next', sw: 'Endelea' },
  continue: { en: 'Continue', sw: 'Endelea' },
  skip: { en: 'Skip', sw: 'Ruka' },
};

interface LocaleState {
  lang: Lang;
  t: (key: keyof typeof COPY) => string;
  setLang: (lang: Lang) => void;
  toggle: () => void;
}

const LocaleContext = createContext<LocaleState | null>(null);

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'sw' || v === 'en' ? v : 'en';
  } catch {
    return 'en';
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(loadLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    localStorage.setItem(KEY, next);
  }, []);

  const value = useMemo<LocaleState>(
    () => ({
      lang,
      setLang,
      toggle: () => setLang(lang === 'en' ? 'sw' : 'en'),
      t: (key) => COPY[key]?.[lang] ?? String(key),
    }),
    [lang, setLang],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
