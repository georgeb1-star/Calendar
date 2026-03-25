'use client';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'ADMIN' | 'COMPANY_ADMIN' | 'OFFICE_ADMIN' | 'GLOBAL_ADMIN';
  status: 'PENDING' | 'ACTIVE';
  emailReminders: boolean;
  locationId: string | null;
  companyId: string;
  location: {
    id: string;
    name: string;
    address?: string | null;
    color: string;
  } | null;
  company: {
    id: string;
    name: string;
    color: string;
  };
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: StoredUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
