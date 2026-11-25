import { Button } from './Button';
import { IconAlert } from './icons';
import { useLocale } from '../hooks/useLocale';

/** Recoverable error: says what happened and how to get moving again. */
export function ErrorScreen({
  title,
  detail,
  onRetry,
  onHome,
}: {
  title?: string;
  detail?: string;
  onRetry?: () => void;
  onHome?: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="overlay" role="alert">
      <div className="overlay-card">
        <div className="error-mark">
          <IconAlert />
        </div>
        <h2 className="screen-title" style={{ fontSize: '1.45rem' }}>
          {title ?? t('something_wrong')}
        </h2>
        {detail ? <p className="screen-sub">{detail}</p> : null}
        <div className="btn-row" style={{ marginTop: '1rem' }}>
          {onRetry ? (
            <Button variant="primary" onClick={onRetry}>
              {t('try_again')}
            </Button>
          ) : null}
          {onHome ? (
            <Button variant="secondary" onClick={onHome}>
              {t('go_home')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
