import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';

const NAV = [
  { to: '/', icon: '\u{1F3E0}', label: 'Places' },
  { to: '/plan', icon: '\u{1F5FA}\u{FE0F}', label: 'Plan' },
  { to: '/compare', icon: '\u{2696}\u{FE0F}', label: 'Compare' },
  { to: '/guide', icon: '\u{1F4D6}', label: 'Guide' },
  { to: '/settings', icon: '\u{2699}\u{FE0F}', label: 'Settings' },
];

export function AppBar({
  title,
  subtitle,
  back,
  actions,
}: {
  title: string;
  subtitle?: string;
  /** Show a back button; pass a path to go somewhere specific. */
  back?: boolean | string;
  actions?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="appbar">
      {back && (
        <button
          type="button"
          className="iconbtn"
          aria-label="Go back"
          onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
        >
          ‹
        </button>
      )}
      <div className="appbar__title">
        {title}
        {subtitle && <span className="appbar__sub">{subtitle}</span>}
      </div>
      {actions}
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="nav" aria-label="Main">
      {NAV.map((item) => (
        <NavLink key={item.to} to={item.to} end={item.to === '/'}>
          <span aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Standard screen: sticky bar, scrolling body, bottom nav. */
export function Screen({
  title,
  subtitle,
  back,
  actions,
  children,
  flush,
  hideNav,
}: {
  title: string;
  subtitle?: string;
  back?: boolean | string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  hideNav?: boolean;
}) {
  return (
    <div className="shell">
      <AppBar title={title} subtitle={subtitle} back={back} actions={actions} />
      <main className={`main${flush ? ' main--flush' : ''}`}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
