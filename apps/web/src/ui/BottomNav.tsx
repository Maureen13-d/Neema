import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/home', label: 'Home', icon: '◎' },
  { to: '/vitals', label: 'Vitals', icon: '⌁' },
  { to: '/symptoms', label: 'Signs', icon: '✦' },
  { to: '/passport', label: 'Passport', icon: '◈' },
  { to: '/settings', label: 'More', icon: '☰' },
] as const;

/** Persistent guardian navigation. */
export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {ITEMS.map((item) => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
          <span className="nav-ico" aria-hidden>
            {item.icon}
          </span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
