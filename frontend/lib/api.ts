import { getToken } from './auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// Auth
export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<any>('/api/auth/me'),
    logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
    register: (data: { name: string; email: string; password: string; companyId: string }) =>
      request<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getCompanies: () => request<{ id: string; name: string }[]>('/api/auth/companies'),
  },

  // Rooms
  rooms: {
    list: () => request<any[]>('/api/rooms'),
    availability: (roomId: string, date: string) =>
      request<any>(`/api/rooms/${roomId}/availability?date=${date}`),
    create: (data: any) =>
      request<any>('/api/rooms', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Bookings
  bookings: {
    list: () => request<any[]>('/api/bookings'),
    mine: () => request<any[]>('/api/bookings/mine'),
    invited: () => request<any[]>('/api/bookings/invited'),
    colleagues: () => request<{ id: string; name: string; email: string }[]>('/api/bookings/colleagues'),
    create: (data: any) =>
      request<any>('/api/bookings', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      request<any>(`/api/bookings/${id}`, { method: 'DELETE' }),
    checkIn: (id: string) =>
      request<any>(`/api/bookings/${id}/checkin`, { method: 'POST' }),
    tokenBalance: () =>
      request<{ tokensTotal: number; tokensUsed: number; tokensRemaining: number }>('/api/bookings/token-balance'),
    cancelFromEmail: (token: string) =>
      request<{ cancelled: boolean; refunded: boolean }>('/api/bookings/cancel-from-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
    createRecurring: (data: any) =>
      request<any>('/api/bookings/recurring', { method: 'POST', body: JSON.stringify(data) }),
    listRecurring: () => request<any[]>('/api/bookings/recurring'),
    cancelSeries: (id: string) =>
      request<any>(`/api/bookings/recurring/${id}`, { method: 'DELETE' }),
  },

  // Admin
  admin: {
    users: {
      list: () => request<any[]>('/api/admin/users'),
      create: (data: any) =>
        request<any>('/api/admin/users', { method: 'POST', body: JSON.stringify(data) }),
      delete: (id: string) =>
        request<any>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    },
    bookings: {
      pending: () => request<any[]>('/api/admin/bookings/pending'),
      approve: (id: string) =>
        request<any>(`/api/admin/bookings/${id}/approve`, { method: 'POST' }),
      reject: (id: string, reason?: string) =>
        request<any>(`/api/admin/bookings/${id}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }),
    },
    analytics: {
      utilisation: (days?: number) =>
        request<any[]>(`/api/admin/analytics/utilisation${days ? `?days=${days}` : ''}`),
      companyHours: (days?: number) =>
        request<any[]>(`/api/admin/analytics/company-hours${days ? `?days=${days}` : ''}`),
      peakTimes: (days?: number) =>
        request<any[]>(`/api/admin/analytics/peak-times${days ? `?days=${days}` : ''}`),
      cancellations: (days?: number) =>
        request<any>(`/api/admin/analytics/cancellations${days ? `?days=${days}` : ''}`),
    },
    companies: {
      list: () =>
        request<any[]>('/api/admin/companies'),
      setAllowance: (id: string, tokensTotal: number) =>
        request<any>(`/api/admin/companies/${id}/tokens`, {
          method: 'PUT',
          body: JSON.stringify({ tokensTotal }),
        }),
    },
  },

  // Company user management (COMPANY_ADMIN)
  companyUsers: {
    all: () => request<any[]>('/api/company/users'),
    pending: () => request<any[]>('/api/company/users/pending'),
    approve: (id: string) =>
      request<any>(`/api/company/users/${id}/approve`, { method: 'POST' }),
    reject: (id: string) =>
      request<any>(`/api/company/users/${id}/reject`, { method: 'POST' }),
  },

  // Billing
  billing: {
    subscription: () =>
      request<{ plan: string; status: string; currentPeriodEnd: string | null; tokensPerDay: number }>('/api/billing/subscription'),
    checkout: (priceId: string, returnUrl: string) =>
      request<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId, returnUrl }),
      }),
    portal: (returnUrl: string) =>
      request<{ url: string }>('/api/billing/portal', {
        method: 'POST',
        body: JSON.stringify({ returnUrl }),
      }),
  },
};
