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

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; user: any }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => request<any>('/api/auth/me'),
    logout: () => request<void>('/api/auth/logout', { method: 'POST' }),
    register: (data: { name: string; email: string; password: string; locationId: string; companyId: string }) =>
      request<{ token: string; user: any }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getLocations: () =>
      request<{ id: string; name: string; address?: string }[]>('/api/auth/locations'),
    getCompanies: () =>
      request<{ id: string; name: string }[]>('/api/auth/companies'),
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
    checkInviteeConflicts: (params: { inviteeIds: string[]; startTime: string; endTime: string; excludeBookingId?: string }) => {
      const qs = new URLSearchParams({ inviteeIds: params.inviteeIds.join(','), startTime: params.startTime, endTime: params.endTime });
      if (params.excludeBookingId) qs.set('excludeBookingId', params.excludeBookingId);
      return request<{ userId: string; name: string; email: string; bookingTitle: string; roomName: string; startTime: string; endTime: string }[]>(`/api/bookings/invitee-conflicts?${qs}`);
    },
    respondToInvite: (inviteId: string, status: 'ACCEPTED' | 'DECLINED') =>
      request<any>(`/api/bookings/invites/${inviteId}/respond`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }),
    blackoutDates: () =>
      request<{ id: string; date: string; reason: string | null }[]>('/api/bookings/blackout-dates'),
  },

  // Admin (OFFICE_ADMIN — scoped to their location automatically by backend)
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
    rooms: {
      list: () => request<any[]>('/api/admin/rooms'),
    },
    tokens: {
      get: () => request<any>('/api/admin/tokens'),
    },
    blackouts: {
      list: () => request<{ id: string; date: string; reason: string | null }[]>('/api/admin/blackouts'),
      create: (date: string, reason?: string) =>
        request<any>('/api/admin/blackouts', { method: 'POST', body: JSON.stringify({ date, reason }) }),
      delete: (id: string) =>
        request<any>(`/api/admin/blackouts/${id}`, { method: 'DELETE' }),
    },
  },

  // Company user management (COMPANY_ADMIN / OFFICE_ADMIN — scoped to location)
  companyUsers: {
    all: () => request<any[]>('/api/company/users'),
    pending: () => request<any[]>('/api/company/users/pending'),
    approve: (id: string) =>
      request<any>(`/api/company/users/${id}/approve`, { method: 'POST' }),
    reject: (id: string) =>
      request<any>(`/api/company/users/${id}/reject`, { method: 'POST' }),
  },

  // Locations (public list + GLOBAL_ADMIN management)
  locations: {
    list: () => request<{ id: string; name: string; address?: string }[]>('/api/locations'),
    create: (data: { name: string; address?: string; color?: string }) =>
      request<any>('/api/locations', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) =>
      request<any>(`/api/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deactivate: (id: string) =>
      request<any>(`/api/locations/${id}`, { method: 'DELETE' }),
  },

  // Global admin
  globalAdmin: {
    locations: () => request<any[]>('/api/global-admin/locations'),
    locationBookings: (id: string) => request<any[]>(`/api/global-admin/locations/${id}/bookings`),
    locationPending: (id: string) => request<any[]>(`/api/global-admin/locations/${id}/pending`),
    locationUsers: (id: string) => request<any[]>(`/api/global-admin/locations/${id}/users`),
    locationRooms: (id: string) => request<any[]>(`/api/global-admin/locations/${id}/rooms`),
    locationTokens: (id: string) =>
      request<{ tokensTotal: number; tokensUsed: number; tokensRemaining: number }>(`/api/global-admin/locations/${id}/tokens`),
    setLocationTokens: (id: string, tokensTotal: number) =>
      request<any>(`/api/global-admin/locations/${id}/tokens`, {
        method: 'PUT',
        body: JSON.stringify({ tokensTotal }),
      }),
    analytics: (days?: number) =>
      request<any>(`/api/global-admin/analytics${days ? `?days=${days}` : ''}`),
    createLocation: (data: { name: string; address?: string; color?: string; companyId: string }) =>
      request<any>('/api/global-admin/locations', { method: 'POST', body: JSON.stringify(data) }),
    createRoom: (locationId: string, data: { name: string; capacity: number; amenities?: string[] }) =>
      request<any>(`/api/global-admin/locations/${locationId}/rooms`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    workspaceCompany: () => request<{ id: string; name: string }>('/api/global-admin/workspace-company'),
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
