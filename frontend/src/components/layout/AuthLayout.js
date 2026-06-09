import { Link, Outlet } from 'react-router-dom';

export default function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-card__header">
          <Link to="/" className="brand-link">
            Argos
          </Link>
          <p className="muted">Argument mapping platform</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
