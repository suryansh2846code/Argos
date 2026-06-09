import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import AuthLayout from '../components/layout/AuthLayout';
import GuestRoute from '../components/layout/GuestRoute';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from '../pages/LoginPage';
import MapDetailPage from '../pages/MapDetailPage';
import MapsListPage from '../pages/MapsListPage';
import RegisterPage from '../pages/RegisterPage';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        element={
          <GuestRoute>
            <AuthLayout />
          </GuestRoute>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/maps" element={<MapsListPage />} />
        <Route path="/maps/:mapId" element={<MapDetailPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
