'use client';

interface Booking {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  company: { name: string; color: string };
}

interface MonthViewProps {
  date: Date;
  bookings: Booking[];
  onSelectDay: (date: Date) => void;
  blackoutDates?: Set<string>;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthView({ date, bookings, onSelectDay, blackoutDates }: MonthViewProps) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const today = new Date();

  // First day of month, then find the Monday of that week
  const firstDay = new Date(year, month, 1);
  const startDay = new Date(firstDay);
  const dayOfWeek = firstDay.getDay();
  startDay.setDate(firstDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return d;
  });

  function getDayBookings(day: Date) {
    return bookings.filter(b => {
      if (['CANCELLED', 'REJECTED', 'NO_SHOW'].includes(b.status)) return false;
      return isSameDay(new Date(b.startTime), day);
    });
  }

  return (
    <div className="flex flex-col h-full p-4 overflow-auto">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map(d => (
          <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden flex-1">
        {days.map(day => {
          const dayBookings = getDayBookings(day);
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const isPast = day < new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const dayStr = `${day.getFullYear()}-${(day.getMonth() + 1).toString().padStart(2, '0')}-${day.getDate().toString().padStart(2, '0')}`;
          const isBlackout = blackoutDates?.has(dayStr) ?? false;

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`
                p-2 text-left hover:bg-slate-50 transition-colors min-h-[90px] flex flex-col
                ${!isCurrentMonth ? 'opacity-35' : ''}
                ${isPast && isCurrentMonth && !isBlackout ? 'bg-slate-50/60' : ''}
              `}
              style={{
                backgroundColor: isBlackout && isCurrentMonth
                  ? undefined
                  : undefined,
                backgroundImage: isBlackout && isCurrentMonth
                  ? 'repeating-linear-gradient(45deg, #FEF3C7, #FEF3C7 4px, #FFFBEB 4px, #FFFBEB 12px)'
                  : undefined,
              }}
            >
              <span className={`
                inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full mb-1 flex-shrink-0
                ${isToday ? 'bg-blue-600 text-white' : isBlackout ? 'text-amber-600' : 'text-slate-700 hover:bg-slate-100'}
              `}>
                {day.getDate()}
              </span>

              {isBlackout && isCurrentMonth && (
                <span className="text-[9px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded mb-1 self-start">
                  Closed
                </span>
              )}

              <div className="flex flex-col gap-0.5 overflow-hidden w-full">
                {dayBookings.slice(0, 3).map(b => (
                  <div
                    key={b.id}
                    className="text-xs px-1.5 py-0.5 rounded truncate font-medium"
                    style={{
                      backgroundColor: b.company.color + '1a',
                      color: b.company.color,
                    }}
                  >
                    {b.title}
                  </div>
                ))}
                {dayBookings.length > 3 && (
                  <span className="text-xs text-slate-400 pl-1">
                    +{dayBookings.length - 3} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
