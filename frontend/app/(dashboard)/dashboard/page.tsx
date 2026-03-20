'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import StatusBadge from '@/components/ui/StatusBadge';

interface Booking {
  id: string;
  title: string;
  status: string;
  startTime: string;
  endTime: string;
  room: { name: string };
  recurringId?: string | null;
}

interface TokenBalance {
  tokensTotal: number;
  tokensUsed: number;
  tokensRemaining: number;
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function isFuture(iso: string): boolean {
  return new Date(iso) > new Date();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [invited, setInvited] = useState<Booking[]>([]);
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [mine, inv, bal] = await Promise.all([
          api.bookings.mine(),
          api.bookings.invited(),
          api.bookings.tokenBalance(),
        ]);
        setMyBookings(mine);
        setInvited(inv);
        setBalance(bal);
      } catch {
        // non-critical failures
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const allBookings = [
    ...myBookings.map((b) => ({ ...b, _source: 'mine' as const })),
    ...invited.map((b) => ({ ...b, _source: 'invited' as const })),
  ].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const todaysBookings = allBookings.filter(
    (b) => isToday(b.startTime) && !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status)
  );

  const upcomingBookings = allBookings
    .filter(
      (b) =>
        isFuture(b.startTime) &&
        !isToday(b.startTime) &&
        !['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status)
    )
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--th-pink)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  const usedPct = balance ? Math.round((balance.tokensUsed / balance.tokensTotal) * 100) : 0;

  return (
    <div className="px-6 py-8 max-w-5xl space-y-8">
      {/* Greeting */}
      <div>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-1" style={{ color: 'var(--th-muted)' }}>
          Overview
        </p>
        <h1 className="text-2xl font-medium tracking-wide" style={{ color: 'var(--th-text)', fontFamily: 'Georgia, serif' }}>
          Good {getGreeting()}, {user?.name.split(' ')[0]}
        </h1>
      </div>

      {/* Token Balance */}
      {balance && (
        <section>
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--th-muted)' }}>
            Token Balance — Today
          </p>
          <div className="border p-5" style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-cream)' }}>
            <div className="flex items-end gap-4 mb-3">
              <span className="text-3xl font-medium" style={{ color: 'var(--th-text)', fontFamily: 'Georgia, serif' }}>
                {balance.tokensRemaining.toFixed(2)}
              </span>
              <span className="text-sm pb-1" style={{ color: 'var(--th-muted)' }}>
                of {balance.tokensTotal} tokens remaining
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--th-border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(usedPct, 100)}%`,
                  backgroundColor: usedPct > 80 ? '#E8917A' : '#8CC5A3',
                }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--th-muted)' }}>
              {balance.tokensUsed.toFixed(2)} used today
            </p>
          </div>
        </section>
      )}

      {/* Today's Bookings */}
      <section>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--th-muted)' }}>
          Today's Bookings
        </p>
        {todaysBookings.length === 0 ? (
          <p className="text-sm py-4" style={{ color: 'var(--th-muted)' }}>No bookings today.</p>
        ) : (
          <div className="border divide-y" style={{ borderColor: 'var(--th-border)', backgroundColor: '#ffffff' }}>
            {todaysBookings.map((b) => (
              <div key={b.id + b._source} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>{b.title}</p>
                    {b._source === 'invited' && (
                      <span className="text-[10px] px-2 py-0.5 tracking-[0.1em] uppercase border" style={{ color: 'var(--th-muted)', borderColor: 'var(--th-border)' }}>
                        Invited
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--th-muted)' }}>
                    {b.room?.name} · {fmtTime(b.startTime)} – {fmtTime(b.endTime)}
                  </p>
                </div>
                <StatusBadge status={b.status as any} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      <section>
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--th-muted)' }}>
          Upcoming
        </p>
        {upcomingBookings.length === 0 ? (
          <p className="text-sm py-4" style={{ color: 'var(--th-muted)' }}>No upcoming bookings.</p>
        ) : (
          <div className="border divide-y" style={{ borderColor: 'var(--th-border)', backgroundColor: '#ffffff' }}>
            {upcomingBookings.map((b) => (
              <div key={b.id + b._source} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>{b.title}</p>
                    {b._source === 'invited' && (
                      <span className="text-[10px] px-2 py-0.5 tracking-[0.1em] uppercase border" style={{ color: 'var(--th-muted)', borderColor: 'var(--th-border)' }}>
                        Invited
                      </span>
                    )}
                    {b.recurringId && (
                      <span className="text-[10px] px-2 py-0.5 tracking-[0.1em] uppercase border" style={{ color: '#7C6FCD', borderColor: '#C4BCEF' }}>
                        Recurring
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--th-muted)' }}>
                    {b.room?.name} · {fmt(b.startTime)}
                  </p>
                </div>
                <StatusBadge status={b.status as any} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
