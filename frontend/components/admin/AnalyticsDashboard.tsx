'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface UtilisationRow {
  roomId: string;
  roomName: string;
  utilisationPercent: number;
  bookedHours: number;
  totalHours: number;
}

interface CompanyHoursRow {
  companyId: string;
  companyName: string;
  color: string;
  totalHours: number;
  bookingCount: number;
}

interface PeakTime {
  hour: number;
  day: number;
  bookingCount: number;
}

interface CancellationStats {
  totalBookings: number;
  cancelled: number;
  noShow: number;
  cancellationRate: number;
  noShowRate: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [utilisation, setUtilisation] = useState<UtilisationRow[]>([]);
  const [companyHours, setCompanyHours] = useState<CompanyHoursRow[]>([]);
  const [peakTimes, setPeakTimes] = useState<PeakTime[]>([]);
  const [cancellations, setCancellations] = useState<CancellationStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, ch, pt, c] = await Promise.all([
        api.admin.analytics.utilisation(days),
        api.admin.analytics.companyHours(days),
        api.admin.analytics.peakTimes(days),
        api.admin.analytics.cancellations(days),
      ]);
      setUtilisation(u);
      setCompanyHours(ch);
      setPeakTimes(pt);
      setCancellations(c);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { load(); }, [load]);

  // Build heatmap matrix
  function getHeatmapValue(hour: number, day: number): number {
    return peakTimes.find((p) => p.hour === hour && p.day === day)?.bookingCount ?? 0;
  }
  const maxPeak = Math.max(...peakTimes.map((p) => p.bookingCount), 1);
  const heatmapHours = Array.from({ length: 10 }, (_, i) => i + 8); // 8am–5pm

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded-lg text-sm transition-colors ${
              days === d
                ? 'bg-blue-500 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary cards */}
      {cancellations && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Bookings', value: cancellations.totalBookings, color: 'blue' },
            { label: 'Cancelled', value: `${cancellations.cancelled} (${cancellations.cancellationRate}%)`, color: 'amber' },
            { label: 'No-shows', value: `${cancellations.noShow} (${cancellations.noShowRate}%)`, color: 'rose' },
            { label: 'Completion Rate', value: `${Math.max(0, 100 - cancellations.cancellationRate - cancellations.noShowRate).toFixed(1)}%`, color: 'emerald' },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{card.label}</p>
              <p className="text-2xl font-semibold text-slate-800 mt-1">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Room utilisation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-800 mb-4">Room Utilisation</h3>
        <div className="space-y-3">
          {utilisation.map((room) => (
            <div key={room.roomId}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-slate-700">{room.roomName}</span>
                <span className="text-sm font-medium text-slate-800">
                  {room.bookedHours}h / {room.totalHours}h ({room.utilisationPercent}%)
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${room.utilisationPercent}%` }}
                />
              </div>
            </div>
          ))}
          {utilisation.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No data for this period</p>
          )}
        </div>
      </div>

      {/* Company hours */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-800 mb-4">Hours by Company</h3>
        {companyHours.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">No data for this period</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="pb-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Company</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Bookings</th>
                <th className="pb-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {companyHours
                .sort((a, b) => b.totalHours - a.totalHours)
                .map((row) => (
                  <tr key={row.companyId}>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: row.color }} />
                        <span className="text-slate-700">{row.companyName}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right text-slate-600">{row.bookingCount}</td>
                    <td className="py-2 text-right font-medium text-slate-800">{row.totalHours}h</td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Peak times heatmap */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-medium text-slate-800 mb-4">Peak Usage (bookings by hour & day)</h3>
        <div className="overflow-x-auto">
          <table className="text-xs">
            <thead>
              <tr>
                <th className="w-12 text-left text-slate-400 font-normal pr-3">Hour</th>
                {DAY_LABELS.map((d) => (
                  <th key={d} className="w-12 text-center text-slate-500 font-medium pb-2">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapHours.map((hour) => (
                <tr key={hour}>
                  <td className="pr-3 text-slate-400 py-0.5">{hour}:00</td>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const val = getHeatmapValue(hour, day);
                    const intensity = val / maxPeak;
                    return (
                      <td key={day} className="p-0.5">
                        <div
                          className="w-10 h-7 rounded flex items-center justify-center text-xs font-medium transition-colors"
                          style={{
                            backgroundColor: intensity > 0
                              ? `rgba(59,130,246,${0.1 + intensity * 0.7})`
                              : '#F8FAFC',
                            color: intensity > 0.5 ? 'white' : '#64748B',
                          }}
                          title={`${DAY_LABELS[day]} ${hour}:00 — ${val} booking(s)`}
                        >
                          {val > 0 ? val : ''}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
