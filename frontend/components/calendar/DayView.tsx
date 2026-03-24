'use client';

import { useRef, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import BookingSlot from './BookingSlot';

const HOUR_HEIGHT = 64;
const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const GRID_HEIGHT = HOUR_HEIGHT * TOTAL_HOURS;
const TIME_GUTTER = 68;

interface Room { id: string; name: string; capacity: number; amenities: string[]; }
interface Booking {
  id: string; title: string; roomId: string; userId: string;
  startTime: string; endTime: string; status: string;
  company: { name: string; color: string };
  user: { id: string; name: string; email: string; companyId: string };
  notes?: string | null;
}

interface DayViewProps {
  date: Date;
  rooms: Room[];
  bookings: Booking[];
  selectedRoom: string;
  onBookSlot: (data: { roomId?: string; start?: string; end?: string }) => void;
  onClickBooking: (booking: Booking) => void;
  blackoutDates?: Set<string>;
  blackoutReasons?: Record<string, string>;
  roomClosedDates?: Map<string, string>;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function getBookingStyle(booking: Booking): { top: number; height: number } {
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const startMins = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  return {
    top: (startMins / 60) * HOUR_HEIGHT,
    height: Math.max((durationMins / 60) * HOUR_HEIGHT, 24),
  };
}

interface LayoutBooking extends Booking {
  _col: number;
  _cols: number;
}

function layoutBookings(bookings: Booking[]): LayoutBooking[] {
  // Sort by start time
  const sorted = [...bookings].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const result: LayoutBooking[] = [];
  // Groups of overlapping bookings
  let group: Booking[] = [];
  let groupEnd = 0;

  for (const b of sorted) {
    const start = new Date(b.startTime).getTime();
    const end = new Date(b.endTime).getTime();
    if (group.length > 0 && start < groupEnd) {
      group.push(b);
      groupEnd = Math.max(groupEnd, end);
    } else {
      // Flush previous group
      group.forEach((gb, i) =>
        result.push({ ...gb, _col: i, _cols: group.length })
      );
      group = [b];
      groupEnd = end;
    }
  }
  group.forEach((gb, i) =>
    result.push({ ...gb, _col: i, _cols: group.length })
  );
  return result;
}

function getCurrentTimeTop(): number {
  const now = new Date();
  const mins = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  return (mins / 60) * HOUR_HEIGHT;
}

export default function DayView({ date, rooms, bookings, selectedRoom, onBookSlot, onClickBooking, blackoutDates, blackoutReasons, roomClosedDates }: DayViewProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(date, new Date());
  const visibleRooms = selectedRoom === 'all' ? rooms : rooms.filter(r => r.id === selectedRoom);

  const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  const isBlackout = blackoutDates?.has(dateStr) ?? false;
  const blackoutReason = blackoutReasons?.[dateStr];

  const dayBookings = bookings.filter(b => {
    if (['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status)) return false;
    return isSameDay(new Date(b.startTime), date);
  });

  useEffect(() => {
    if (scrollRef.current) {
      const scrollTo = isToday ? Math.max(getCurrentTimeTop() - 140, 0) : 0;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, [isToday]);

  function handleGridClick(roomId: string, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snappedMins = Math.round((y / HOUR_HEIGHT) * 2) * 30;
    const h = START_HOUR + Math.floor(snappedMins / 60);
    const m = snappedMins % 60;
    const start = new Date(date);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    onBookSlot({ roomId, start: start.toISOString(), end: end.toISOString() });
  }

  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#fff' }}>

      {/* Blackout banner */}
      {isBlackout && (
        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="text-sm text-amber-700 font-medium">
            Office closed{blackoutReason ? ` — ${blackoutReason}` : ''}. Bookings are not available on this day.
          </p>
        </div>
      )}

      {/* Room column headers */}
      <div
        className="flex flex-shrink-0 bg-white"
        style={{ borderBottom: '2px solid var(--th-border)' }}
      >
        <div className="flex-shrink-0" style={{ width: TIME_GUTTER, borderRight: '1px solid var(--th-divider)' }} />
        {visibleRooms.map(room => {
          const roomClosed = roomClosedDates?.has(`${room.id}|${dateStr}`) ?? false;
          const roomClosedReason = roomClosedDates?.get(`${room.id}|${dateStr}`);
          return (
            <div
              key={room.id}
              className="flex-1 px-5 py-3"
              style={{ borderLeft: '1px solid var(--th-divider)' }}
            >
              <p
                className="text-xs font-semibold tracking-[0.12em] uppercase"
                style={{ color: roomClosed ? '#D97706' : 'var(--th-text)' }}
              >
                {room.name}
              </p>
              <p className="text-[10px] mt-0.5 tracking-wide" style={{ color: 'var(--th-muted)' }}>
                {roomClosed
                  ? <span className="text-amber-600 font-medium">{roomClosedReason || 'Unavailable today'}</span>
                  : `Up to ${room.capacity} people`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex" style={{ height: GRID_HEIGHT }}>

          {/* Time gutter */}
          <div
            className="flex-shrink-0 relative bg-white"
            style={{ width: TIME_GUTTER, borderRight: '1px solid var(--th-divider)' }}
          >
            {hours.map(h => (
              <div
                key={h}
                className="absolute flex items-start justify-end pr-3"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT - 8, left: 0, right: 0 }}
              >
                <span
                  className="text-[11px] font-medium leading-none tabular-nums"
                  style={{ color: 'var(--th-muted)' }}
                >
                  {h < END_HOUR ? `${h.toString().padStart(2, '0')}:00` : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Room columns */}
          {visibleRooms.map(room => {
            const roomBookings = dayBookings.filter(b => b.roomId === room.id);
            const roomClosed = roomClosedDates?.has(`${room.id}|${dateStr}`) ?? false;
            const columnBlocked = isBlackout || roomClosed;
            return (
              <div
                key={room.id}
                className={`flex-1 relative ${columnBlocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                style={{
                  height: GRID_HEIGHT,
                  borderLeft: '1px solid var(--th-divider)',
                  backgroundImage: columnBlocked ? 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 4px, #FFFBEB 4px, #FFFBEB 12px)' : undefined,
                  backgroundColor: !columnBlocked && isToday ? '#FAF0EE08' : undefined,
                }}
                onClick={e => { if (!columnBlocked) handleGridClick(room.id, e); }}
              >
                {/* Hour lines */}
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0"
                    style={{
                      top: (h - START_HOUR) * HOUR_HEIGHT,
                      borderTop: `1px solid ${i === 0 ? 'var(--th-border)' : 'var(--th-divider)'}`,
                    }}
                  />
                ))}
                {/* Half-hour lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`hh-${i}`}
                    className="absolute left-0 right-0"
                    style={{
                      top: (i + 0.5) * HOUR_HEIGHT,
                      borderTop: '1px solid #F5EFEC',
                    }}
                  />
                ))}

                {/* Current time */}
                {isToday && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: getCurrentTimeTop() }}
                  >
                    <div
                      className="rounded-full flex-shrink-0"
                      style={{
                        width: 10,
                        height: 10,
                        marginLeft: -5,
                        backgroundColor: 'var(--th-pink)',
                      }}
                    />
                    <div
                      className="flex-1"
                      style={{ height: 2, backgroundColor: 'var(--th-pink)', opacity: 0.8 }}
                    />
                  </div>
                )}

                {/* Booking blocks */}
                {layoutBookings(roomBookings).map(booking => {
                  const { top, height } = getBookingStyle(booking);
                  const pad = 4;
                  const colW = `calc((100% - ${pad * 2}px) / ${booking._cols})`;
                  const leftOff = `calc(${pad}px + (100% - ${pad * 2}px) / ${booking._cols} * ${booking._col})`;
                  return (
                    <div
                      key={booking.id}
                      className="absolute z-10 cursor-pointer"
                      style={{ top: top + 1, height: height - 2, left: leftOff, width: colW }}
                      onClick={e => { e.stopPropagation(); onClickBooking(booking); }}
                    >
                      <BookingSlot booking={booking} isOwn={booking.user.id === user?.id} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
