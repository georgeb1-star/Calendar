'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge from '@/components/ui/StatusBadge';

interface InviteRecord {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  user: { id: string; name: string; email: string };
}

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
  recurringId?: string | null;
  invites?: InviteRecord[];
  // Fields added for invited bookings
  inviteId?: string | null;
  inviteStatus?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  _source?: 'mine' | 'invited';
}

function canCheckIn(booking: Booking): boolean {
  if (booking.status !== 'ACTIVE') return false;
  if (booking.checkInTime) return false;
  if (booking._source === 'invited') return false;
  const now = Date.now();
  const start = new Date(booking.startTime).getTime();
  return now >= start - 10 * 60 * 1000 && now <= start + 15 * 60 * 1000;
}

function canCancel(booking: Booking): boolean {
  if (booking._source === 'invited') return false;
  return ['ACTIVE', 'PENDING_APPROVAL'].includes(booking.status);
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingSeriesId, setCancellingSeriesId] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [mine, invited] = await Promise.all([
        api.bookings.mine(),
        api.bookings.invited(),
      ]);
      const combined: Booking[] = [
        ...mine.map((b: any) => ({ ...b, _source: 'mine' as const })),
        ...invited.map((b: any) => ({ ...b, _source: 'invited' as const })),
      ].sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setBookings(combined);
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

  async function handleCancelSeries(recurringId: string) {
    if (!confirm('Cancel the entire recurring series? All future bookings will be cancelled.')) return;
    setCancellingSeriesId(recurringId);
    try {
      await api.bookings.cancelSeries(recurringId);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to cancel series');
    } finally {
      setCancellingSeriesId(null);
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

  async function handleRsvp(inviteId: string, status: 'ACCEPTED' | 'DECLINED') {
    setRespondingId(inviteId);
    try {
      await api.bookings.respondToInvite(inviteId, status);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to respond to invite');
    } finally {
      setRespondingId(null);
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
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Awaiting Approval — pending admin sign-off</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Confirmed — approved and ready</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />Rejected — declined by admin</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />Cancelled / Completed</span>
        </div>
        <p className="text-slate-500 text-sm mt-1">Your bookings and meetings you've been invited to</p>
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
              {bookings.map((booking) => {
                const invites = booking.invites ?? [];
                const accepted = invites.filter(i => i.status === 'ACCEPTED').length;
                const declined = invites.filter(i => i.status === 'DECLINED').length;
                const pending = invites.filter(i => i.status === 'PENDING').length;
                const hasInvites = invites.length > 0;

                return (
                  <tr key={booking.id + booking._source} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-800 truncate max-w-48">{booking.title}</p>
                        {booking._source === 'invited' && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border tracking-wide uppercase font-medium ${
                            booking.inviteStatus === 'ACCEPTED'
                              ? 'border-emerald-300 text-emerald-600 bg-emerald-50'
                              : booking.inviteStatus === 'DECLINED'
                              ? 'border-red-300 text-red-500 bg-red-50'
                              : 'border-slate-300 text-slate-500'
                          }`}>
                            {booking.inviteStatus === 'ACCEPTED' ? 'Accepted' : booking.inviteStatus === 'DECLINED' ? 'Declined' : 'Invited'}
                          </span>
                        )}
                        {booking.recurringId && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded border text-purple-600 tracking-wide uppercase" style={{ borderColor: '#C4BCEF' }}>
                            Recurring
                          </span>
                        )}
                      </div>
                      {booking.notes && (
                        <p className="text-slate-400 text-xs truncate max-w-48">{booking.notes}</p>
                      )}
                      {booking._source === 'mine' && hasInvites && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {accepted > 0 && <span className="text-emerald-600">{accepted} accepted</span>}
                          {accepted > 0 && (declined > 0 || pending > 0) && <span> · </span>}
                          {declined > 0 && <span className="text-red-500">{declined} declined</span>}
                          {declined > 0 && pending > 0 && <span> · </span>}
                          {pending > 0 && <span>{pending} pending</span>}
                        </p>
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
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {booking._source === 'invited' && booking.inviteId && booking.inviteStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleRsvp(booking.inviteId!, 'ACCEPTED')}
                              disabled={respondingId === booking.inviteId}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleRsvp(booking.inviteId!, 'DECLINED')}
                              disabled={respondingId === booking.inviteId}
                              className="px-3 py-1 border border-red-200 hover:bg-red-50 hover:border-red-300 text-red-500 text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </>
                        )}
                        {booking._source === 'invited' && booking.inviteId && booking.inviteStatus !== 'PENDING' && (
                          <button
                            onClick={() => handleRsvp(booking.inviteId!, booking.inviteStatus === 'ACCEPTED' ? 'DECLINED' : 'ACCEPTED')}
                            disabled={respondingId === booking.inviteId}
                            className="px-3 py-1 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs rounded-lg transition-colors disabled:opacity-50"
                          >
                            {booking.inviteStatus === 'ACCEPTED' ? 'Decline instead' : 'Accept instead'}
                          </button>
                        )}
                        {canCheckIn(booking) && (
                          <button
                            onClick={() => handleCheckIn(booking.id)}
                            className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                          >
                            Check in
                          </button>
                        )}
                        {canCancel(booking) && booking.recurringId && (
                          <button
                            onClick={() => handleCancelSeries(booking.recurringId!)}
                            disabled={cancellingSeriesId === booking.recurringId}
                            className="px-3 py-1 border border-purple-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 text-purple-600 text-xs rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel series
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
