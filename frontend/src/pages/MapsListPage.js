import { Navigate } from 'react-router-dom';

/**
 * MapsListPage — Redirects to /dashboard
 *
 * The dashboard now serves as the canonical board browser.
 * This redirect preserves any bookmarked /maps links.
 */
export default function MapsListPage() {
  return <Navigate to="/dashboard" replace />;
}
