interface BookingSlotProps {
  booking: {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    company: { name: string; color: string };
    user: { name: string };
    notes?: string | null;
  };
  isOwn: boolean;
  compact?: boolean;
}

export default function BookingSlot({ booking, isOwn, compact = false }: BookingSlotProps) {
  const color = booking.company.color || '#E8917A';
  const start = new Date(booking.startTime);
  const end = new Date(booking.endTime);
  const fmt = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isPending = booking.status === 'PENDING_APPROVAL';
  const durationMins = (end.getTime() - start.getTime()) / 60000;
  const isShort = durationMins <= 30; // ≤30 min: single line only

  const timeRange = `${fmt(start)} – ${fmt(end)}`;

  return (
    <div
      title={`${booking.title} · ${booking.company.name}\n${timeRange}${booking.notes ? '\n' + booking.notes : ''}`}
      className="h-full w-full overflow-hidden"
      style={{
        backgroundColor: color + (isOwn ? '20' : '12'),
        borderLeft: `3px solid ${color}`,
        opacity: isPending ? 0.82 : 1,
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-start gap-0.5 overflow-hidden min-w-0">
        {/* Title row */}
        <p
          className="font-semibold leading-tight truncate min-w-0"
          style={{ color, fontSize: 11 }}
        >
          {isPending && '⏳ '}
          {booking.title}
        </p>

        {/* Time — hide on very short slots */}
        {!isShort && (
          <p
            className="leading-tight truncate tabular-nums"
            style={{ color: 'var(--th-muted)', fontSize: 10 }}
          >
            {timeRange}
          </p>
        )}

        {/* Company — only in day view (non-compact) and tall enough blocks */}
        {!compact && durationMins > 60 && (
          <p
            className="leading-tight truncate"
            style={{ color: color + 'bb', fontSize: 10 }}
          >
            {booking.company.name}
          </p>
        )}
      </div>
    </div>
  );
}
