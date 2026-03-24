'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Room { id: string; name: string; }
interface RoomClosure {
  id: string;
  roomId: string;
  date: string;
  reason: string | null;
  room: { id: string; name: string };
}

export default function RoomClosures() {
  const [closures, setClosures] = useState<RoomClosure[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomId, setRoomId] = useState('');
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [closureData, roomData] = await Promise.all([
        api.admin.roomClosures.list(),
        api.admin.rooms.list(),
      ]);
      setClosures(closureData);
      setRooms(roomData);
      if (roomData.length > 0 && !roomId) setRoomId(roomData[0].id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.admin.roomClosures.create(roomId, date, reason || undefined);
      setDate('');
      setReason('');
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add room closure');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.admin.roomClosures.delete(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove closure');
    } finally {
      setDeletingId(null);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Room Closures</h2>
        <p className="text-sm text-slate-500 mt-0.5">Block individual rooms on specific dates. Users cannot book a closed room on that day.</p>
      </div>

      {/* Add form */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Add room closure</h3>
        {rooms.length === 0 ? (
          <p className="text-sm text-slate-400">No rooms found for your location.</p>
        ) : (
          <>
            {formError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{formError}</div>
            )}
            <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                required
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={date}
                required
                onChange={e => setDate(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                type="text"
                placeholder="Reason (optional) e.g. Deep clean"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {submitting ? 'Adding…' : 'Add closure'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* Existing closures */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Scheduled room closures {closures.length > 0 && <span className="text-slate-400">({closures.length})</span>}
        </h3>
        {closures.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            No room closures scheduled.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Room</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {closures.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{c.room.name}</td>
                    <td className="px-4 py-3 text-slate-600">{fmt(c.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.reason || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === c.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
