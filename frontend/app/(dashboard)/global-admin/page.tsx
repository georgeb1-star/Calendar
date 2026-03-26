'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface LocationRow {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
  userCount: number;
  roomCount: number;
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;
}

export default function GlobalAdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  async function handleDeactivate(id: string, name: string) {
    if (!confirm(`Deactivate "${name}"? Users will no longer be able to make bookings there.`)) return;
    try {
      await api.locations.deactivate(id);
      setLocations(prev => prev.map(l => l.id === id ? { ...l, isActive: false } : l));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate location');
    }
  }

  useEffect(() => {
    if (!loading && user?.role !== 'GLOBAL_ADMIN') {
      router.push('/calendar');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user?.role === 'GLOBAL_ADMIN') {
      api.globalAdmin.locations()
        .then(setLocations)
        .catch(() => setError('Failed to load locations'))
        .finally(() => setFetching(false));
    }
  }, [user, loading]);

  if (loading || user?.role !== 'GLOBAL_ADMIN') return null;

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Global Admin</h1>
          <p className="text-slate-500 text-sm mt-1">All Nammu Workplace offices</p>
        </div>
        <Link
          href="/global-admin/new-location"
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New location
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      {fetching ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Address</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Users</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Rooms</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Tokens</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {locations.map((loc) => (
                <tr key={loc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{loc.name}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{loc.address ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{loc.userCount}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{loc.roomCount}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${
                      loc.tokensRemaining <= 0
                        ? 'text-red-600'
                        : loc.tokensRemaining < 1
                        ? 'text-amber-600'
                        : 'text-green-600'
                    }`}>
                      {loc.tokensRemaining.toFixed(1)}
                    </span>
                    <span className="text-slate-400 text-xs"> / {loc.tokensTotal}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      loc.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/global-admin/${loc.id}`}
                        className="px-3 py-1 text-xs font-semibold text-slate-500 border border-slate-200 rounded hover:text-slate-700 hover:border-slate-300 transition-colors"
                      >
                        Manage
                      </Link>
                      {loc.isActive && (
                        <button
                          onClick={() => handleDeactivate(loc.id, loc.name)}
                          className="px-3 py-1 text-xs font-semibold text-red-400 border border-red-200 rounded hover:text-red-600 hover:border-red-400 transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
