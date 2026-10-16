import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore, Tokens } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  const loadMe = useCallback(async () => {
    setUser(await api<User>('/auth/me'));
  }, []);

  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return; }
    loadMe().catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, [loadMe]);

  useEffect(() => {
    const onLogout = () => { setUser(null); qc.clear(); };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [qc]);

  const authenticate = async (path: string, body: unknown) => {
    tokenStore.set(await api<Tokens>(path, { method: 'POST', body }));
    qc.clear();
    await loadMe();
  };

  const value: AuthCtx = {
    user,
    loading,
    login: (email, password) => authenticate('/auth/login', { email, password }),
    register: (name, email, password) => authenticate('/auth/register', { name, email, password }),
    logout: async () => {
      try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignora */ }
      tokenStore.clear();
      setUser(null);
      qc.clear();
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
