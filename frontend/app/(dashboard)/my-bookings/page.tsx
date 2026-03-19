'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge from '@/components/ui/StatusBadge';

interface Booking {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  checkInTime: string | null;
  room: { id: string; name: string; capacity: number };
  notes?: string | null;
}

function canCheckIn(booking: Booking): boolean {
  if (booking.status !== 'ACTIVE') return false;
  if (booking.checkInTime) return false;
  const now = Date.now();
  const start = new Date(booking.startTime).getTime();
  return now >= start - 10 * 60 * 1000 && now <= start + 15 * 60 * 1000;
}

function canCancel(booking: Booking): boolean {
  return ['ACTIVE', 'PENDING_APPROVAL'].includes(booking.status);
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.bookings.mine();
      setBookings(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(id: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      await api.bookings.cancel(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel');
    }
  }

  async function handleCheckIn(id: string) {
    try {
      await api.bookings.checkIn(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to check in');
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-800">My Bookings</h1>
        <p className="text-slate-500 text-sm mt-1">All your room bookings</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="font-medium">No bookings yet</p>
          <p className="text-sm mt-1">Go to the calendar to book a room.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Booking</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Room</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 truncate max-w-48">{booking.title}</p>
                    {booking.notes && (
                      <p className="text-slate-400 text-xs truncate max-w-48">{booking.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{booking.room?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(booking.startTime)}</td>
                  <td className="px-4 py-3 text-slate-600">{fmt(booking.endTime)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={booking.status as any} />
                    {booking.checkInTime && (
                      <p className="text-xs text-emerald-600 mt-0.5">
                        Checked in {fmt(booking.checkInTime)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {canCheckIn(booking) && (
                        <button
                          onClick={() => handleCheckIn(booking.id)}
                          className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Check in
                        </button>
                      )}
                      {canCancel(booking) && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="px-3 py-1 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs rounded-lg transition-colors"
                        >
                          Cancel
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
