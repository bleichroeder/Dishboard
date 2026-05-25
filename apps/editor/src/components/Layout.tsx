import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.js';
import { Wordmark } from './Wordmark.js';

export function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  const close = () => setNavOpen(false);
  const onLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="app-brand" onClick={close}>
          <Wordmark size="1.5rem" />
        </Link>
        <button
          type="button"
          className="nav-toggle"
          aria-label={navOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navOpen}
          onClick={() => setNavOpen((v) => !v)}
        >
          <span className="nav-toggle__bar" />
          <span className="nav-toggle__bar" />
          <span className="nav-toggle__bar" />
        </button>
        <nav className={`app-nav${navOpen ? ' app-nav--open' : ''}`}>
          <NavLink to="/" end onClick={close}>
            Menus
          </NavLink>
          <NavLink to="/schedule" onClick={close}>
            Schedule
          </NavLink>
          <NavLink to="/integrations" onClick={close}>
            Integrations
          </NavLink>
          <div className="app-nav__spacer" />
          <span className="app-nav__user">{username}</span>
          <button type="button" className="link-button" onClick={onLogout}>
            Sign out
          </button>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
