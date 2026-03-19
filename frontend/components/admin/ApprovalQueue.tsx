'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import StatusBadge from '@/components/ui/StatusBadge';

interface PendingBooking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  notes?: string | null;
  room: { name: string };
  user: { name: string; email: string };
  company: { name: string; color: string };
}

export default function ApprovalQueue() {
  const [bookings, setBookings] = useState<PendingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.admin.bookings.pending();
      setBookings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    try {
      await api.admin.bookings.approve(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to approve');
    }
  }

  async function handleReject(id: string) {
    const reason = prompt('Rejection reason (optional):');
    try {
      await api.admin.bookings.reject(id, reason || undefined);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to reject');
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  if (loading) {
    return <div className="text-slate-500 text-sm py-4">Loading…</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="text-center py-10 text-slate-400">
        <p className="font-medium">No pending approvals</p>
        <p className="text-sm mt-1">All bookings are up to date.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Booking</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Requested by</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Room</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50/50">
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800">{b.title}</p>
                {b.notes && <p className="text-slate-400 text-xs truncate max-w-40">{b.notes}</p>}
              </td>
              <td className="px-4 py-3">
                <p className="text-slate-700">{b.user.name}</p>
                <p className="text-slate-400 text-xs">{b.company.name}</p>
              </td>
              <td className="px-4 py-3 text-slate-600">{b.room.name}</td>
              <td className="px-4 py-3 text-slate-600 text-xs">
                <div>{fmt(b.startTime)}</div>
                <div className="text-slate-400">→ {fmt(b.endTime)}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{b.durationHours}h</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleApprove(b.id)}
                    className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(b.id)}
                    className="px-3 py-1 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-slate-600 text-xs rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
