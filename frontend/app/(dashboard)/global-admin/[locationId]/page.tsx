'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';

type Tab = 'bookings' | 'users' | 'rooms' | 'tokens';

interface LocationInfo {
  name: string;
  address: string | null;
  userCount: number;
  roomCount: number;
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;
}

export default function LocationDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const locationId = params.locationId as string;

  const [tab, setTab] = useState<Tab>('bookings');
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [tokenData, setTokenData] = useState<{ tokensTotal: number; tokensUsed: number; tokensRemaining: number } | null>(null);
  const [newTokensTotal, setNewTokensTotal] = useState('');
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'OFFICE_ADMIN' });
  const [userFormError, setUserFormError] = useState('');
  const [userFormLoading, setUserFormLoading] = useState(false);

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setUserFormError('');
    setUserFormLoading(true);
    try {
      await api.admin.users.create({ ...userForm, locationId });
      setUserForm({ name: '', email: '', password: '', role: 'OFFICE_ADMIN' });
      setShowAddUser(false);
      loadTab();
    } catch (err: unknown) {
      setUserFormError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setUserFormLoading(false);
    }
  }

  useEffect(() => {
    if (!loading && user?.role !== 'GLOBAL_ADMIN') {
      router.push('/calendar');
    }
  }, [user, loading, router]);

  // Load location info
  useEffect(() => {
    if (!locationId) return;
    api.globalAdmin.locationTokens(locationId)
      .then(t => setTokenData(t))
      .catch(() => {});
  }, [locationId]);

  const loadTab = useCallback(async () => {
    if (!locationId) return;
    setFetching(true);
    try {
      if (tab === 'bookings') {
        const d = await api.globalAdmin.locationBookings(locationId);
        setData(d);
      } else if (tab === 'users') {
        const d = await api.globalAdmin.locationUsers(locationId);
        setData(d);
      } else if (tab === 'rooms') {
        const d = await api.globalAdmin.locationRooms(locationId);
        setData(d);
      } else if (tab === 'tokens') {
        const t = await api.globalAdmin.locationTokens(locationId);
        setTokenData(t);
        setNewTokensTotal(t.tokensTotal.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetching(false);
    }
  }, [locationId, tab]);

  useEffect(() => {
    if (!loading && user?.role === 'GLOBAL_ADMIN') {
      loadTab();
    }
  }, [loadTab, user, loading]);

  async function saveTokens() {
    const val = parseFloat(newTokensTotal);
    if (isNaN(val) || val < 0) return;
    setSaving(true);
    try {
      const updated = await api.globalAdmin.setLocationTokens(locationId, val);
      setTokenData(updated);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading || user?.role !== 'GLOBAL_ADMIN') return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'bookings', label: 'Bookings' },
    { id: 'users', label: 'Users' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'tokens', label: 'Tokens' },
  ];

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href="/global-admin"
          className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All locations
        </Link>
      </div>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">
            Location Details
          </h1>
          {tokenData && (
            <p className="text-slate-500 text-sm mt-1">
              {tokenData.tokensRemaining.toFixed(1)} / {tokenData.tokensTotal} tokens remaining today
            </p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Token management */}
      {tab === 'tokens' && (
        <div className="max-w-sm">
          <h3 className="font-medium text-slate-700 mb-4">Daily token allowance</h3>
          {tokenData && (
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-lg font-semibold text-slate-800">{tokenData.tokensTotal}</div>
                <div className="text-xs text-slate-500 mt-0.5">Total</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className="text-lg font-semibold text-slate-800">{tokenData.tokensUsed.toFixed(1)}</div>
                <div className="text-xs text-slate-500 mt-0.5">Used</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div className={`text-lg font-semibold ${tokenData.tokensRemaining <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {tokenData.tokensRemaining.toFixed(1)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">Remaining</div>
              </div>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Set new daily total</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={newTokensTotal}
                onChange={e => setNewTokensTotal(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={saveTokens}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Users tab — always rendered so Add user button is always visible */}
      {tab === 'users' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-end">
            <button
              onClick={() => setShowAddUser(v => !v)}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Add user
            </button>
          </div>
          {showAddUser && (
            <div className="px-4 py-4 border-b border-slate-200 bg-slate-50">
              {userFormError && (
                <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{userFormError}</div>
              )}
              <form onSubmit={handleAddUser} className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="Full name" required
                  value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="email" placeholder="Email address" required
                  value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="password" placeholder="Password" required minLength={6}
                  value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="OFFICE_ADMIN">Office Admin</option>
                  <option value="COMPANY_ADMIN">Company Admin</option>
                  <option value="EMPLOYEE">Employee</option>
                </select>
                <div className="flex gap-2">
                  <button type="submit" disabled={userFormLoading}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm rounded-lg transition-colors">
                    {userFormLoading ? 'Creating…' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowAddUser(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-white">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {fetching ? (
            <p className="px-4 py-6 text-sm text-slate-500">Loading…</p>
          ) : data.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-500">No users found for this location.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs uppercase">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>{u.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Data tables for other tabs */}
      {tab !== 'tokens' && tab !== 'users' && (
        fetching ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-slate-500">No {tab} found for this location.</p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            {tab === 'bookings' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Room</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Start</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-800">{b.title}</td>
                      <td className="px-4 py-3 text-slate-600">{b.room?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{b.user?.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(b.startTime).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          b.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                          : b.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {tab === 'rooms' && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Room</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Capacity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Amenities</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{r.capacity}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {r.amenities?.join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {r.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )
      )}
    </div>
  );
}
