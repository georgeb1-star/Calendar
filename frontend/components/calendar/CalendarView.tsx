'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { subscribeToBookings } from '@/lib/supabase';
import DayView from './DayView';
import WeekView from './WeekView';
import MonthView from './MonthView';
import BookingModal from './BookingModal';

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
  const [view, setView] = useState<ViewMode>('week');
  const [date, setDate] = useState(new Date());
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ roomId?: string; start?: string; end?: string }>({});

  const load = useCallback(async () => {
    try {
      const [roomList, bookingList] = await Promise.all([
        api.rooms.list(),
        api.bookings.list(),
      ]);
      setRooms(roomList);
      setBookings(bookingList);
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
          <DayView date={date} rooms={rooms} bookings={bookings} selectedRoom={selectedRoom} onBookSlot={openModal} />
        )}
        {view === 'week' && (
          <WeekView
            date={date} rooms={rooms} bookings={bookings} selectedRoom={selectedRoom}
            onBookSlot={openModal}
            onSelectDay={d => { setDate(d); setView('day'); }}
          />
        )}
        {view === 'month' && (
          <MonthView date={date} bookings={bookings} onSelectDay={d => { setDate(d); setView('day'); }} />
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
    </div>
  );
}
