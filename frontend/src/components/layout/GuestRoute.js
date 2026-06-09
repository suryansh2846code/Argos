import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';

export default function GuestRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="page-center">
        <p className="muted">Loading session…</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
