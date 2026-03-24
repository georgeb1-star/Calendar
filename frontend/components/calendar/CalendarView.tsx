'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/hooks/useAuth';
import { subscribeToBookings } from '@/lib/supabase';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import BookingModal from './BookingModal';
import StatusBadge from '@/components/ui/StatusBadge';

type ViewMode = 'day' | 'week' | 'month';

interface Room { id: string; name: string; capacity: number; amenities: string[]; }
interface Booking {
  id: string; title: string; roomId: string; userId: string;
  startTime: string; endTime: string; status: string;
  company: { name: string; color: string };
  user: { id: string; name: string; email: string; companyId: string };
  notes?: string | null;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatRange(view: ViewMode, date: Date): string {
  if (view === 'day') {
    return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (view === 'week') {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 4);
    const s = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const e = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${s} – ${e}`;
  }
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function navigate(view: ViewMode, date: Date, dir: -1 | 1): Date {
  const d = new Date(date);
  if (view === 'day') d.setDate(d.getDate() + dir);
  else if (view === 'week') d.setDate(d.getDate() + dir * 7);
  else d.setMonth(d.getMonth() + dir);
  return d;
}

const VIEWS: ViewMode[] = ['day', 'week', 'month'];

export default function CalendarView() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('week');
  const [date, setDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ roomId?: string; start?: string; end?: string }>({});
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [blackoutDates, setBlackoutDates] = useState<Set<string>>(new Set());
  const [blackoutReasons, setBlackoutReasons] = useState<Record<string, string>>({});
  // roomClosedDates: Map of "roomId|YYYY-MM-DD" -> reason
  const [roomClosedDates, setRoomClosedDates] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    try {
      const [roomList, bookingList, blackouts, roomClosures] = await Promise.all([
        api.rooms.list(),
        api.bookings.list(),
        api.bookings.blackoutDates().catch(() => [] as { date: string; reason: string | null }[]),
        api.bookings.roomClosures().catch(() => [] as { roomId: string; date: string; reason: string | null }[]),
      ]);
      setRooms(roomList);
      setBookings(bookingList);
      setBlackoutDates(new Set(blackouts.map((b: { date: string }) => b.date)));
      const reasons: Record<string, string> = {};
      blackouts.forEach((b: { date: string; reason: string | null }) => { if (b.reason) reasons[b.date] = b.reason; });
      setBlackoutReasons(reasons);
      const rcMap = new Map<string, string>();
      roomClosures.forEach((rc: { roomId: string; date: string; reason: string | null }) => {
        rcMap.set(`${rc.roomId}|${rc.date}`, rc.reason ?? '');
      });
      setRoomClosedDates(rcMap);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = subscribeToBookings(() => load());
    return () => { unsub?.(); };
  }, [load]);

  function openModal(data: { roomId?: string; start?: string; end?: string } = {}) {
    setPrefill(data);
    setModalOpen(true);
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b flex-shrink-0 gap-3 flex-wrap"
        style={{ borderColor: 'var(--th-border)', backgroundColor: '#ffffff' }}
      >
        {/* Left: navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDate(new Date())}
            className="px-3 py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase border transition-colors"
            style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
            onMouseOver={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--th-pink)';
              (e.currentTarget as HTMLElement).style.color = 'var(--th-pink)';
            }}
            onMouseOut={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--th-border)';
              (e.currentTarget as HTMLElement).style.color = 'var(--th-text)';
            }}
          >
            Today
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setDate(d => navigate(view, d, -1))}
              className="p-1.5 transition-colors"
              style={{ color: 'var(--th-muted)' }}
              onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-pink)')}
              onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-muted)')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setDate(d => navigate(view, d, 1))}
              className="p-1.5 transition-colors"
              style={{ color: 'var(--th-muted)' }}
              onMouseOver={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-pink)')}
              onMouseOut={e => ((e.currentTarget as HTMLElement).style.color = 'var(--th-muted)')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <h2 className="text-xs font-medium tracking-wide min-w-[200px]" style={{ color: 'var(--th-text)' }}>
            {formatRange(view, date)}
          </h2>
        </div>

        {/* Center: view toggle */}
        <div className="flex items-center border" style={{ borderColor: 'var(--th-border)' }}>
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-4 py-1.5 text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors"
              style={{
                backgroundColor: view === v ? 'var(--th-pink)' : 'transparent',
                color: view === v ? '#ffffff' : 'var(--th-muted)',
                borderRight: v !== 'month' ? `1px solid var(--th-border)` : 'none',
              }}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Right: room filter + book */}
        <div className="flex items-center gap-2">
          <select
            value={selectedRoom}
            onChange={e => setSelectedRoom(e.target.value)}
            className="text-[10px] font-semibold tracking-[0.12em] uppercase border px-3 py-1.5 focus:outline-none bg-white"
            style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
          >
            <option value="all">All rooms</option>
            {rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          <button
            onClick={() => openModal()}
            className="px-5 py-1.5 text-[10px] font-semibold tracking-[0.2em] uppercase transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
          >
            + Book Room
          </button>
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === 'day' && (
          <DayView date={date} rooms={rooms} bookings={bookings} selectedRoom={selectedRoom} onBookSlot={openModal} onClickBooking={setDetailBooking} blackoutDates={blackoutDates} blackoutReasons={blackoutReasons} roomClosedDates={roomClosedDates} />
        )}
        {view === 'week' && (
          <WeekView
            date={date} rooms={rooms} bookings={bookings} selectedRoom={selectedRoom}
            onBookSlot={openModal}
            onSelectDay={d => { setDate(d); setView('day'); }}
            onClickBooking={setDetailBooking}
            blackoutDates={blackoutDates}
            blackoutReasons={blackoutReasons}
            roomClosedDates={roomClosedDates}
          />
        )}
        {view === 'month' && (
          <MonthView date={date} bookings={bookings} onSelectDay={d => { setDate(d); setView('day'); }} blackoutDates={blackoutDates} />
        )}
      </div>

      <BookingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
        prefillRoomId={prefill.roomId}
        prefillStart={prefill.start}
        prefillEnd={prefill.end}
        rooms={rooms}
      />

      {/* Booking detail panel */}
      {detailBooking && (
        <BookingDetailPanel
          booking={detailBooking}
          currentUserId={user?.id}
          onClose={() => setDetailBooking(null)}
          onCancelled={() => { setDetailBooking(null); load(); }}
        />
      )}
    </div>
  );
}

function BookingDetailPanel({
  booking,
  currentUserId,
  onClose,
  onCancelled,
}: {
  booking: Booking;
  currentUserId?: string;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const isOwn = booking.user.id === currentUserId;
  const canCancel = isOwn && ['ACTIVE', 'PENDING_APPROVAL'].includes(booking.status);

  const color = booking.company.color || '#E8917A';
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const fmt = (d: Date) =>
    d.toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  const durationLabel = durationMins >= 60
    ? `${Math.floor(durationMins / 60)}h${durationMins % 60 > 0 ? ` ${durationMins % 60}min` : ''}`
    : `${durationMins}min`;

  async function handleCancel() {
    if (!confirm('Cancel this booking?')) return;
    setCancelling(true);
    setError('');
    try {
      await api.bookings.cancel(booking.id);
      onCancelled();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
      setCancelling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,26,26,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Coloured header strip */}
        <div className="px-5 py-4" style={{ backgroundColor: color + '22', borderLeft: `4px solid ${color}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase mb-1" style={{ color }}>
                {booking.company.name}
              </p>
              <h3 className="text-base font-medium leading-snug" style={{ color: 'var(--th-text)', fontFamily: 'Georgia, serif' }}>
                {booking.title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 flex-shrink-0 transition-colors"
              style={{ color: 'var(--th-muted)' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          {/* Date / time */}
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm" style={{ color: 'var(--th-text)' }}>
                {start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--th-muted)' }}>
                {fmtTime(start)} – {fmtTime(end)} · {durationLabel}
              </p>
            </div>
          </div>

          {/* Room */}
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--th-text)' }}>
              {(booking as any).room?.name ?? 'Room'}
            </p>
          </div>

          {/* Booked by */}
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <p className="text-sm" style={{ color: 'var(--th-text)' }}>
              {isOwn ? 'You' : booking.user.name}
              {isOwn && <span className="text-xs ml-1.5" style={{ color: 'var(--th-muted)' }}>(your booking)</span>}
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <StatusBadge status={booking.status as any} />
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--th-muted)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <p className="text-sm" style={{ color: 'var(--th-text)', lineHeight: '1.5' }}>{booking.notes}</p>
            </div>
          )}

          {error && (
            <p className="text-xs px-3 py-2 border" style={{ color: '#B85A45', backgroundColor: 'var(--th-pink-light)', borderColor: 'var(--th-pink-mid)' }}>
              {error}
            </p>
          )}
        </div>

        {canCancel && (
          <div className="px-5 pb-5">
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-2.5 text-xs font-semibold tracking-[0.15em] uppercase border transition-colors disabled:opacity-50"
              style={{ borderColor: 'var(--th-pink-mid)', color: '#B85A45', backgroundColor: 'var(--th-pink-light)' }}
            >
              {cancelling ? 'Cancelling…' : 'Cancel booking'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
