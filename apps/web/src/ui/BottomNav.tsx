import { NavLink } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';

function IconHome() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}
function IconSigns() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5" />
      <circle cx="12" cy="16" r="0.8" fill="currentColor" />
    </svg>
  );
}
function IconPassport() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8 16.5c1.2-1.4 6.8-1.4 8 0" />
    </svg>
  );
}
function IconMore() {
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

/** Persistent guardian navigation — fewer destinations, clearer labels. */
export function BottomNav() {
  const { t } = useLocale();
  const items = [
    { to: '/home', label: t('home'), Icon: IconHome },
    { to: '/symptoms', label: t('signs'), Icon: IconSigns },
    { to: '/passport', label: t('passport'), Icon: IconPassport },
    { to: '/settings', label: t('more'), Icon: IconMore },
  ] as const;

  return (
    <nav className="bottom-nav" aria-label="Main">
      {items.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          <Icon />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
