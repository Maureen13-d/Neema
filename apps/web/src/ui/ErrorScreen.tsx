import { Button } from './Button';

/** Recoverable error surface. */
export function ErrorScreen({
  title = 'Something went wrong',
  detail,
  onRetry,
  onHome,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  onHome?: () => void;
}) {
  return (
    <div className="overlay" role="alert">
      <div className="overlay-card">
        <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }} aria-hidden>
          ⚠️
        </div>
        <h2 className="screen-title" style={{ fontSize: '1.6rem' }}>
          {title}
        </h2>
        {detail ? <p className="screen-sub">{detail}</p> : null}
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              Try again
            </Button>
          ) : null}
          {onHome ? (
            <Button variant="secondary" onClick={onHome}>
              Go home
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
