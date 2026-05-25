import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from './api.js';

type AuthValue = {
  status: 'loading' | 'anonymous' | 'authenticated';
  username: string | null;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthValue['status']>('loading');
  const [username, setUsername] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await api.auth.me();
      if (me.authenticated) {
        setUsername(me.username);
        setStatus('authenticated');
      } else {
        setUsername(null);
        setStatus('anonymous');
      }
    } catch {
      setUsername(null);
      setStatus('anonymous');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setUsername(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <AuthCtx.Provider value={{ status, username, refresh, logout }}>{children}</AuthCtx.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
