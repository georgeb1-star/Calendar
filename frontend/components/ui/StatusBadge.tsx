type Status = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const CONFIG: Record<Status, { label: string; tooltip: string; classes: string }> = {
  PENDING_APPROVAL: {
    label: 'Awaiting Approval',
    tooltip: 'This booking is waiting for an admin to approve it. You will be notified by email once approved.',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  ACTIVE: {
    label: 'Confirmed',
    tooltip: 'This booking has been approved and is confirmed.',
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  REJECTED: {
    label: 'Rejected',
    tooltip: 'This booking was declined by an admin. Please contact your office administrator for more information.',
    classes: 'bg-red-100 text-red-700 border-red-200',
  },
  COMPLETED: {
    label: 'Completed',
    tooltip: 'This booking has ended.',
    classes: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    tooltip: 'This booking was cancelled.',
    classes: 'bg-slate-100 text-slate-500 border-slate-200',
  },
  NO_SHOW: {
    label: 'No-show',
    tooltip: 'No check-in was recorded for this booking.',
    classes: 'bg-rose-100 text-rose-700 border-rose-200',
  },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, tooltip, classes } = CONFIG[status] ?? { label: status, tooltip: '', classes: 'bg-slate-100 text-slate-600' };
  return (
    <span
      title={tooltip}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border cursor-default ${classes}`}
    >
      {label}
    </span>
  );
}
