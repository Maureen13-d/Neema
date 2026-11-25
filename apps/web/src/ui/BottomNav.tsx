import { useCallback, useRef, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLocale } from '../hooks/useLocale';
import { IconBand, IconHome, IconMore, IconPlus, IconUser } from './icons';
import { QuickAddSheet } from './QuickAddSheet';

function Item({ to, label, icon }: { to: string; label: string; icon: ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
      <span className="nav-ico">{icon}</span>
      {label}
    </NavLink>
  );
}

/** Main navigation: four places and one centre "+" for adding a reading. */
export function BottomNav() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const fabRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    fabRef.current?.focus();
  }, []);

  return (
    <>
      <nav className="bottom-nav" aria-label="Main">
        <Item to="/home" label={t('home')} icon={<IconHome />} />
        <Item to="/vitals" label={t('band')} icon={<IconBand />} />
        <button
          ref={fabRef}
          type="button"
          className="fab"
          aria-label={t('add')}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <IconPlus />
        </button>
        <Item to="/passport" label={t('passport')} icon={<IconUser />} />
        <Item to="/settings" label={t('more')} icon={<IconMore />} />
      </nav>
      <QuickAddSheet open={open} onClose={close} />
    </>
  );
}
