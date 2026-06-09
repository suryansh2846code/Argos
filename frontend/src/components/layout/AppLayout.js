import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../../auth/AuthContext';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <NavLink to="/dashboard" className="brand-link">
            🔭 Argos
          </NavLink>
        </div>
        <nav className="app-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Boards
          </NavLink>
        </nav>
        <div className="app-header__user">
          <span className="muted" style={{ fontSize: '0.8125rem' }}>{user?.username}</span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="app-main app-main--fluid">
        <Outlet />
      </main>
    </div>
  );
}
