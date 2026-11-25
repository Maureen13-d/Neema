import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from '../ui/BottomNav';

const HIDE_NAV = new Set(['/', '/orient', '/consent', '/unlock', '/alert']);

/** Shell with optional bottom navigation. */
export function AppLayout() {
  const loc = useLocation();
  const showNav = !HIDE_NAV.has(loc.pathname);

  return (
    <div className="neema-shell">
      <Outlet />
      {showNav ? <BottomNav /> : null}
    </div>
  );
}
