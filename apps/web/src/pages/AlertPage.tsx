import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';
import { ErrorScreen } from '../ui/ErrorScreen';
import { getMessageTextFor } from '../services/speech';

/** Guided alert ritual — breathe → message → wait. */
export function AlertPage() {
  const g = useGuardian();
  const nav = useNavigate();
  const { t, lang } = useLocale();
  const level = g.triage?.level ?? 'UNKNOWN';
  const smsHref = g.pendingSmsHref;
  const isRed = level === 'RED';

  if (g.error) {
    return (
      <ErrorScreen
        title={lang === 'sw' ? 'Haikuweza kuandaa ujumbe' : 'Could not prepare the message'}
        detail={g.error}
        onRetry={() => g.clearError()}
        onHome={() => nav('/home')}
      />
    );
  }

  // Nothing is wrong: never show warning steps for a calm or unknown status.
  if (!isRed && level !== 'YELLOW') {
    return (
      <main className="screen">
        <BrandMark />
        <StatusOrb level={level} />
        <h1 className="screen-title" style={{ textAlign: 'center' }}>
          {t('nothing_now')}
        </h1>
        <Button variant="primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => nav('/home')}>
          {t('go_home')}
        </Button>
      </main>
    );
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen message={t('loading')} /> : null}
      <BrandMark />
      <StatusOrb level={level} />

      <h1 className="screen-title" style={{ textAlign: 'center' }}>
        {isRed ? t('call_chp') : t('check_bp')}
      </h1>
      <p className="screen-sub" style={{ textAlign: 'center', marginInline: 'auto' }}>
        {(g.triage ? getMessageTextFor(g.triage.messageKey, lang) : null) ?? g.message}
      </p>

      <ol className="ritual-steps">
        <li>
          <span className="step-n">1</span>
          <div>
            <strong>{lang === 'sw' ? 'Pumua' : 'Breathe'}</strong>
            <p className="soft-note">{t('breathe')}</p>
          </div>
        </li>
        <li>
          <span className="step-n">2</span>
          <div>
            <strong>{lang === 'sw' ? 'Tuma ujumbe' : 'Send a message'}</strong>
            <p className="soft-note">
              {lang === 'sw'
                ? 'Neema imeandaa SMS fupi kwa CHP yako.'
                : 'Neema prepared a short SMS for your CHP.'}
            </p>
          </div>
        </li>
        <li>
          <span className="step-n">3</span>
          <div>
            <strong>{lang === 'sw' ? 'Subiri jibu' : 'Wait for a reply'}</strong>
            <p className="soft-note">{t('wait_reply')}</p>
          </div>
        </li>
      </ol>

      {smsHref ? (
        <a className={`btn ${isRed ? 'btn-danger' : 'btn-primary'}`} href={smsHref} style={{ width: '100%' }}>
          {t('open_sms')}
        </a>
      ) : (
        <Button
          variant={isRed ? 'danger' : 'primary'}
          style={{ width: '100%' }}
          onClick={() => void g.refreshTriage(isRed)}
        >
          {lang === 'sw' ? 'Andaa SMS tena' : 'Prepare SMS again'}
        </Button>
      )}

      {(g.recheck.status === 'due' || g.recheck.status === 'scheduled') && !isRed ? (
        <Button variant="secondary" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => nav('/bp')}>
          {t('recheck_now')}
        </Button>
      ) : null}

      {isRed ? (
        <Button
          variant="ghost"
          style={{ width: '100%', marginTop: '0.75rem' }}
          onClick={() => void g.acknowledgeActiveRed().then(() => nav('/home'))}
        >
          {lang === 'sw' ? 'Nimesaidika · Rudi' : 'I’m okay now · Back'}
        </Button>
      ) : (
        <Button variant="ghost" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => nav('/home')}>
          {t('go_home')}
        </Button>
      )}
    </main>
  );
}
