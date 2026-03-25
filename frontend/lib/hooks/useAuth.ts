'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUser, getToken, setAuth, clearAuth, StoredUser } from '../auth';
import { api } from '../api';

export function useAuth() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getUser();
    const token = getToken();
    if (stored && token) {
      setUser(stored);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await api.auth.login(email, password);
    setAuth(result.token, result.user);
    setUser(result.user);
    return result;
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout().catch(() => {});
    clearAuth();
    setUser(null);
    window.location.href = '/login';
  }, []);

  const updateUser = useCallback((updates: Partial<StoredUser>) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      localStorage.setItem('auth_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return { user, loading, login, logout, updateUser, isAuthenticated: !!user };
}
