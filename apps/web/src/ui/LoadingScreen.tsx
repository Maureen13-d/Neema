import { useLocale } from '../hooks/useLocale';

/** Full-screen calm loading state. */
export function LoadingScreen({ message }: { message?: string }) {
  const { t } = useLocale();
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="spinner" aria-hidden />
        <p className="overlay-card__message">{message ?? t('loading')}</p>
      </div>
    </div>
  );
}
