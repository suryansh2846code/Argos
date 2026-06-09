import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { AUTH_LOGOUT_EVENT } from '../api/client';
import {
  clearTokens,
  getRefreshToken,
  hasStoredSession,
  setTokens,
} from './tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = Boolean(user);

  const applySession = useCallback((session) => {
    setTokens(session.access, session.refresh);
    setUser(session.user);
  }, []);

  const clearSession = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  const login = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    setTokens(data.access, data.refresh);
    const currentUser = await authApi.getCurrentUser();
    setUser(currentUser);
    return currentUser;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await authApi.register(payload);
    applySession(data);
    return data.user;
  }, [applySession]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await authApi.logout(refresh);
      }
    } catch {
      // Clear local session even if server logout fails (e.g. expired token).
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    async function bootstrap() {
      if (!hasStoredSession()) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
      } catch {
        clearSession();
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [clearSession]);

  useEffect(() => {
    const handleForcedLogout = () => clearSession();
    window.addEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleForcedLogout);
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [user, isAuthenticated, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
