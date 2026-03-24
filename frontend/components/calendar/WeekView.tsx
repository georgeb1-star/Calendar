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
const ROOM_COL_WIDTH = 180; // wide enough for content + room name

interface Room { id: string; name: string; capacity: number; amenities: string[]; }
interface Booking {
  id: string; title: string; roomId: string; userId: string;
  startTime: string; endTime: string; status: string;
  company: { name: string; color: string };
  user: { id: string; name: string; email: string; companyId: string };
  notes?: string | null;
}

interface WeekViewProps {
  date: Date;
  rooms: Room[];
  bookings: Booking[];
  selectedRoom: string;
  onBookSlot: (data: { roomId?: string; start?: string; end?: string }) => void;
  onSelectDay: (date: Date) => void;
  onClickBooking: (booking: Booking) => void;
  blackoutDates?: Set<string>;
  blackoutReasons?: Record<string, string>;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
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
    height: Math.max((durationMins / 60) * HOUR_HEIGHT, 22),
  };
}

function getCurrentTimeTop(): number {
  const now = new Date();
  const mins = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  return (mins / 60) * HOUR_HEIGHT;
}

interface LayoutBooking extends Booking {
  _col: number;
  _cols: number;
}

function layoutBookings(bookings: Booking[]): LayoutBooking[] {
  const sorted = [...bookings].sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const result: LayoutBooking[] = [];
  let group: Booking[] = [];
  let groupEnd = 0;

  for (const b of sorted) {
    const start = new Date(b.startTime).getTime();
    const end = new Date(b.endTime).getTime();
    if (group.length > 0 && start < groupEnd) {
      group.push(b);
      groupEnd = Math.max(groupEnd, end);
    } else {
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

// Shorten "Meeting Room 1" → "Rm 1" for the cramped sub-header in week view
function shortRoomName(name: string): string {
  return name.replace(/meeting room/i, 'Rm').replace(/room/i, 'Rm');
}

export default function WeekView({ date, rooms, bookings, selectedRoom, onBookSlot, onSelectDay, onClickBooking, blackoutDates, blackoutReasons }: WeekViewProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const today = new Date();

  const weekStart = startOfWeek(date);
  const weekDays = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const visibleRooms = selectedRoom === 'all' ? rooms : rooms.filter(r => r.id === selectedRoom);
  const hours = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => START_HOUR + i);
  const dayColWidth = visibleRooms.length * ROOM_COL_WIDTH;
  const totalWidth = TIME_GUTTER + weekDays.length * dayColWidth;

  useEffect(() => {
    if (scrollRef.current) {
      const isThisWeek = weekDays.some(d => isSameDay(d, today));
      const scrollTo = isThisWeek ? Math.max(getCurrentTimeTop() - 140, 0) : 0;
      scrollRef.current.scrollTop = scrollTo;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleGridClick(roomId: string, day: Date, e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snappedMins = Math.round((y / HOUR_HEIGHT) * 2) * 30;
    const h = START_HOUR + Math.floor(snappedMins / 60);
    const m = snappedMins % 60;
    const start = new Date(day);
    start.setHours(h, m, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    onBookSlot({ roomId, start: start.toISOString(), end: end.toISOString() });
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto" style={{ backgroundColor: '#fff' }}>
      <div style={{ minWidth: totalWidth }}>

        {/* ── Sticky header ── */}
        <div
          className="sticky top-0 z-20 flex bg-white"
          style={{ borderBottom: '2px solid var(--th-border)' }}
        >
          {/* Time gutter corner */}
          <div
            className="flex-shrink-0 bg-white"
            style={{ width: TIME_GUTTER, borderRight: '1px solid var(--th-divider)' }}
          />

          {/* Day columns */}
          {weekDays.map(day => {
            const isToday = isSameDay(day, today);
            const dayStr = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
            const isDayBlackout = blackoutDates?.has(dayStr) ?? false;
            const dayBlackoutReason = blackoutReasons?.[dayStr];
            return (
              <div
                key={day.toISOString()}
                className="flex-shrink-0"
                style={{
                  width: dayColWidth,
                  borderLeft: '1px solid var(--th-divider)',
                  backgroundColor: isDayBlackout ? '#FFFBEB' : isToday ? '#FAF0EE30' : 'transparent',
                }}
              >
                {/* Day label — clickable → day view */}
                <button
                  onClick={() => onSelectDay(day)}
                  className="w-full px-4 py-2.5 text-left transition-colors"
                  style={{ backgroundColor: 'transparent' }}
                  onMouseOver={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.03)')}
                  onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-[11px] font-semibold tracking-[0.12em] uppercase"
                      style={{ color: isDayBlackout ? '#D97706' : isToday ? 'var(--th-pink)' : 'var(--th-muted)' }}
                    >
                      {day.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </span>
                    <span
                      className="text-base font-bold leading-none"
                      style={{ color: isDayBlackout ? '#D97706' : isToday ? 'var(--th-pink)' : 'var(--th-text)' }}
                    >
                      {day.getDate()}
                    </span>
                    <span
                      className="text-[11px]"
                      style={{ color: 'var(--th-muted)' }}
                    >
                      {day.toLocaleDateString('en-GB', { month: 'short' })}
                    </span>
                    {isDayBlackout && (
                      <span className="text-[9px] font-semibold tracking-wide uppercase text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                        {dayBlackoutReason ?? 'Closed'}
                      </span>
                    )}
                    {isToday && (
                      <span
                        className="text-[9px] font-semibold tracking-[0.15em] uppercase px-1.5 py-0.5"
                        style={{
                          backgroundColor: 'var(--th-pink)',
                          color: '#fff',
                        }}
                      >
                        Today
                      </span>
                    )}
                  </div>
                </button>

                {/* Room sub-headers — only when showing both rooms */}
                {visibleRooms.length > 1 && (
                  <div
                    className="flex"
                    style={{ borderTop: '1px solid var(--th-divider)' }}
                  >
                    {visibleRooms.map((room, i) => (
                      <div
                        key={room.id}
                        className="flex-1 px-3 py-1.5"
                        style={{
                          width: ROOM_COL_WIDTH,
                          borderLeft: i > 0 ? '1px solid var(--th-divider)' : 'none',
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold tracking-[0.1em] uppercase truncate"
                          style={{ color: 'var(--th-text)' }}
                        >
                          {shortRoomName(room.name)}
                        </p>
                        <p
                          className="text-[9px] tracking-wide"
                          style={{ color: 'var(--th-muted)' }}
                        >
                          Cap. {room.capacity}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Grid body ── */}
        <div className="flex">

          {/* Sticky time gutter */}
          <div
            className="sticky left-0 z-10 bg-white flex-shrink-0"
            style={{
              width: TIME_GUTTER,
              height: GRID_HEIGHT,
              borderRight: '1px solid var(--th-divider)',
            }}
          >
            {hours.map(h => (
              <div
                key={h}
                className="absolute flex items-start justify-end pr-3"
                style={{
                  top: (h - START_HOUR) * HOUR_HEIGHT - 8,
                  left: 0,
                  right: 0,
                }}
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

          {/* Day columns */}
          {weekDays.map(day => {
            const isToday = isSameDay(day, today);
            const timeTop = isToday ? getCurrentTimeTop() : null;
            const dayStr2 = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
            const isDayBlackout = blackoutDates?.has(dayStr2) ?? false;

            return (
              <div
                key={day.toISOString()}
                className="flex flex-shrink-0"
                style={{
                  width: dayColWidth,
                  height: GRID_HEIGHT,
                  borderLeft: '1px solid var(--th-divider)',
                  backgroundColor: isToday ? '#FAF0EE0A' : 'transparent',
                }}
              >
                {visibleRooms.map((room, roomIdx) => {
                  const roomBookings = bookings.filter(b => {
                    if (['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status)) return false;
                    return b.roomId === room.id && isSameDay(new Date(b.startTime), day);
                  });

                  return (
                    <div
                      key={room.id}
                      className={`relative flex-shrink-0 ${isDayBlackout ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      style={{
                        width: ROOM_COL_WIDTH,
                        height: GRID_HEIGHT,
                        borderLeft: roomIdx > 0 ? '1px dashed var(--th-divider)' : 'none',
                        backgroundColor: isDayBlackout ? 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 4px, #FFFBEB 4px, #FFFBEB 12px)' : undefined,
                      }}
                      onClick={e => { if (!isDayBlackout) handleGridClick(room.id, day, e); }}
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

                      {/* Current time indicator */}
                      {timeTop !== null && (
                        <div
                          className="absolute left-0 right-0 z-20 pointer-events-none"
                          style={{ top: timeTop }}
                        >
                          <div
                            className="w-full"
                            style={{ height: 2, backgroundColor: 'var(--th-pink)', opacity: 0.8 }}
                          />
                          {roomIdx === 0 && (
                            <div
                              className="absolute rounded-full"
                              style={{
                                top: -4,
                                left: -4,
                                width: 10,
                                height: 10,
                                backgroundColor: 'var(--th-pink)',
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* Booking blocks */}
                      {layoutBookings(roomBookings).map(booking => {
                        const { top, height } = getBookingStyle(booking);
                        const pad = 3;
                        const colW = `calc((100% - ${pad * 2}px) / ${booking._cols})`;
                        const leftOff = `calc(${pad}px + (100% - ${pad * 2}px) / ${booking._cols} * ${booking._col})`;
                        return (
                          <div
                            key={booking.id}
                            className="absolute z-10 cursor-pointer"
                            style={{ top: top + 1, height: height - 2, left: leftOff, width: colW }}
                            onClick={e => { e.stopPropagation(); onClickBooking(booking); }}
                          >
                            <BookingSlot
                              booking={booking}
                              isOwn={booking.user.id === user?.id}
                              compact={visibleRooms.length > 1}
                            />
                          </div>
                        );
                      })}
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
