import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

/** Brand-first first viewport. */
export function SplashPage() {
  const nav = useNavigate();
  return (
    <div className="hero-bleed">
      <img className="hero-bleed__img" src="/brand/hero-night.jpg" alt="" />
      <div className="hero-bleed__veil" />
      <div className="hero-bleed__content">
        <img
          src="/brand/icon.jpg"
          alt=""
          width={72}
          height={72}
          style={{ borderRadius: 20, marginBottom: '1rem', boxShadow: '0 12px 30px rgba(0,0,0,.35)' }}
        />
        <h1 className="screen-title" style={{ fontSize: 'clamp(2.6rem, 11vw, 3.4rem)' }}>
          Neema
        </h1>
        <p className="screen-sub" style={{ maxWidth: '18rem' }}>
          Your offline maternal guardian. One clear action when night feels wrong.
        </p>
        <div className="btn-row">
          <Button variant="primary" onClick={() => nav('/orient')}>
            Anza · Start
          </Button>
        </div>
      </div>
    </div>
  );
}
