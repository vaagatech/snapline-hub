import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthMeResponse } from '@shared/types';
import { fetchAuthMe } from '../api';

interface AuthContextValue {
  me: AuthMeResponse | null;
  loading: boolean;
  error: string | null;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<AuthMeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchAuthMe(controller.signal)
      .then((data) => {
        setMe(data);
        setError(null);
      })
      .catch((err: Error) => {
        setMe(null);
        setError(err.message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [tick]);

  const value = useMemo<AuthContextValue>(() => ({
    me,
    loading,
    error,
    isAdmin: Boolean(me?.isAdmin),
    can: (permission: string) => Boolean(me?.permissions?.includes(permission)),
    refresh: () => setTick((t) => t + 1),
  }), [me, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
