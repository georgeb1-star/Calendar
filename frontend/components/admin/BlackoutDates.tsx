'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface BlackoutDate {
  id: string;
  date: string;
  reason: string | null;
}

const UK_BANK_HOLIDAYS_2026 = [
  { date: '2026-01-01', reason: "New Year's Day" },
  { date: '2026-04-03', reason: 'Good Friday' },
  { date: '2026-04-06', reason: 'Easter Monday' },
  { date: '2026-05-04', reason: 'Early May Bank Holiday' },
  { date: '2026-05-25', reason: 'Spring Bank Holiday' },
  { date: '2026-08-31', reason: 'Summer Bank Holiday' },
  { date: '2026-12-25', reason: 'Christmas Day' },
  { date: '2026-12-28', reason: 'Boxing Day (substitute)' },
];

export default function BlackoutDates() {
  const [dates, setDates] = useState<BlackoutDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.admin.blackouts.list();
      setDates(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await api.admin.blackouts.create(date, reason || undefined);
      setDate('');
      setReason('');
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to add closure date');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await api.admin.blackouts.delete(id);
      load();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to remove date');
    } finally {
      setDeletingId(null);
    }
  }

  async function addBankHoliday(bh: { date: string; reason: string }) {
    const already = dates.some(d => d.date === bh.date);
    if (already) return;
    try {
      await api.admin.blackouts.create(bh.date, bh.reason);
      load();
    } catch {
      // silently skip if duplicate
    }
  }

  const existingDates = new Set(dates.map(d => d.date));

  const fmt = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
    });

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Office Closures</h2>
        <p className="text-sm text-slate-500 mt-0.5">Block dates when the office is closed. Users cannot book rooms on these days.</p>
      </div>

      {/* Add form */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Add closure date</h3>
        {formError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">{formError}</div>
        )}
        <form onSubmit={handleAdd} className="flex gap-3 flex-wrap">
          <input
            type="date"
            value={date}
            required
            onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <input
            type="text"
            placeholder="Reason (optional) e.g. Bank Holiday"
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {submitting ? 'Adding…' : 'Add date'}
          </button>
        </form>
      </div>

      {/* UK Bank Holidays quick-add */}
      <div className="p-4 border border-slate-100 rounded-xl bg-white">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Quick add — UK Bank Holidays 2026</h3>
        <div className="flex flex-wrap gap-2">
          {UK_BANK_HOLIDAYS_2026.map(bh => {
            const added = existingDates.has(bh.date);
            return (
              <button
                key={bh.date}
                onClick={() => addBankHoliday(bh)}
                disabled={added}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  added
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-600 cursor-default'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 text-slate-600'
                }`}
              >
                {added ? '✓ ' : '+ '}{bh.reason}
              </button>
            );
          })}
        </div>
      </div>

      {/* Existing dates */}
      <div>
        <h3 className="text-sm font-medium text-slate-700 mb-3">
          Scheduled closures {dates.length > 0 && <span className="text-slate-400">({dates.length})</span>}
        </h3>
        {dates.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-xl">
            No closure dates set yet.
          </p>
        ) : (
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dates.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{fmt(d.date)}</td>
                    <td className="px-4 py-3 text-slate-500">{d.reason || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(d.id)}
                        disabled={deletingId === d.id}
                        className="px-3 py-1 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      >
                        {deletingId === d.id ? 'Removing…' : 'Remove'}
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
