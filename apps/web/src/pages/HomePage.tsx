import { useNavigate } from 'react-router-dom';
import { useGuardian } from '../hooks/useGuardian';
import { useLocale } from '../hooks/useLocale';
import { BrandMark } from '../ui/BrandMark';
import { Button } from '../ui/Button';
import { StatusOrb } from '../ui/StatusOrb';
import { LoadingScreen } from '../ui/LoadingScreen';
import { LangToggle } from '../ui/LangToggle';

function bandState(g: ReturnType<typeof useGuardian>): {
  labelKey: 'band_watching' | 'band_away' | 'band_weak' | 'waiting_signal';
  state: 'ok' | 'warn' | 'off';
} {
  if (!g.connected) return { labelKey: 'band_away', state: 'off' };
  const q = g.sample?.signalQuality ?? 0;
  if (q > 0 && q < 50) return { labelKey: 'band_weak', state: 'warn' };
  if (!g.sample) return { labelKey: 'waiting_signal', state: 'warn' };
  return { labelKey: 'band_watching', state: 'ok' };
}

/** Guardian home — one status, one next step. */
export function HomePage() {
  const nav = useNavigate();
  const g = useGuardian();
  const { t, lang } = useLocale();
  const level = g.triage?.level ?? 'UNKNOWN';
  const band = bandState(g);
  const recheckDue = g.recheck.status === 'due';
  const recheckScheduled = g.recheck.status === 'scheduled';

  const headline =
    level === 'GREEN'
      ? t('youre_okay')
      : level === 'YELLOW'
        ? t('check_bp')
        : level === 'RED'
          ? t('call_chp')
          : t('waiting_signal');

  const body =
    g.message ||
    (level === 'GREEN'
      ? t('all_quiet')
      : level === 'UNKNOWN'
        ? lang === 'sw'
          ? 'Unganisha bendi au ongeza shinikizo ili Neema ianze.'
          : 'Connect your band or add a blood pressure so Neema can begin.'
        : '');

  let primary: { label: string; onClick: () => void; danger?: boolean; href?: string } | null = null;

  if (g.pendingSmsHref && (level === 'RED' || level === 'YELLOW')) {
    primary = { label: t('open_sms'), onClick: () => undefined, href: g.pendingSmsHref, danger: level === 'RED' };
  } else if (level === 'RED') {
    primary = { label: t('call_chp'), onClick: () => nav('/alert'), danger: true };
  } else if (recheckDue || level === 'YELLOW') {
    primary = { label: t('recheck_now'), onClick: () => nav('/bp') };
  } else if (!g.connected) {
    primary = {
      label: t('start_watch'),
      onClick: () => void g.connectSimulator(),
    };
  } else if (level === 'UNKNOWN') {
    primary = { label: t('add_bp'), onClick: () => nav('/bp') };
  }

  return (
    <main className="screen">
      {g.loading ? <LoadingScreen /> : null}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <BrandMark showSub />
        <LangToggle />
      </div>

      <div className="home-stage">
        <div>
          <StatusOrb level={level} />
          <div style={{ textAlign: 'center' }}>
            <span className="band-pill" data-state={band.state}>
              {t(band.labelKey)}
            </span>
          </div>
        </div>

        <div className="home-primary">
          <h1 className="screen-title">{headline}</h1>
          <p className="screen-sub" style={{ marginBottom: '0.75rem' }}>
            {body}
          </p>

          {recheckScheduled && g.recheckDueInSec !== null && !recheckDue ? (
            <p className="soft-note" style={{ marginBottom: '0.85rem' }}>
              {lang === 'sw'
                ? `Pima tena baada ya ${g.recheckDueInSec}s`
                : `Recheck in ${g.recheckDueInSec}s`}
            </p>
          ) : null}

          {primary ? (
            primary.href ? (
              <a
                className={`btn ${primary.danger ? 'btn-danger' : 'btn-primary'}`}
                href={primary.href}
                style={{ width: '100%', marginBottom: '0.65rem' }}
              >
                {primary.label}
              </a>
            ) : (
              <Button
                variant={primary.danger ? 'danger' : 'primary'}
                onClick={primary.onClick}
                style={{ width: '100%', marginBottom: '0.65rem' }}
              >
                {primary.label}
              </Button>
            )
          ) : (
            <p className="soft-note" style={{ marginBottom: '0.85rem' }}>
              {t('all_quiet')}
            </p>
          )}

          {!g.connected ? (
            <Button
              variant="secondary"
              onClick={() => void g.connectBluetooth()}
              style={{ width: '100%', marginBottom: '0.65rem' }}
            >
              {t('connect_band')}
            </Button>
          ) : null}

          {level === 'GREEN' || level === 'UNKNOWN' ? (
            <div className="btn-row">
              <Button variant="secondary" onClick={() => nav('/bp')}>
                {t('add_bp')}
              </Button>
              <Button variant="secondary" onClick={() => nav('/symptoms')}>
                {t('how_feel')}
              </Button>
            </div>
          ) : level === 'YELLOW' || level === 'RED' ? (
            <Button variant="ghost" onClick={() => nav('/alert')} style={{ width: '100%' }}>
              {lang === 'sw' ? 'Fungua hatua zote' : 'See all steps'}
            </Button>
          ) : null}

          <p className="trust-line">{t('saved_here')}</p>
        </div>
      </div>
    </main>
  );
}
