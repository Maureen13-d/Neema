import { useLocale } from '../hooks/useLocale';

/** Full-screen calm loading state. */
export function LoadingScreen({ message }: { message?: string }) {
  const { t } = useLocale();
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="spinner" aria-hidden />
        <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
          {message ?? t('loading')}
        </p>
      </div>
    </div>
  );
}
