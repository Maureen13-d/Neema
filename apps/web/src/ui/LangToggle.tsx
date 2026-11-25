import { useLocale } from '../hooks/useLocale';

/** EN / SW switch — first-class, not buried. */
export function LangToggle() {
  const { lang, setLang, t } = useLocale();
  return (
    <div className="lang-toggle" role="group" aria-label={t('language')}>
      <button type="button" aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
      <button type="button" aria-pressed={lang === 'sw'} onClick={() => setLang('sw')}>
        SW
      </button>
    </div>
  );
}
