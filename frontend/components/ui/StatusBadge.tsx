type Status = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const CONFIG: Record<Status, { label: string; classes: string }> = {
  PENDING_APPROVAL: { label: 'Pending', classes: 'bg-amber-100 text-amber-700 border-amber-200' },
  ACTIVE: { label: 'Active', classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  REJECTED: { label: 'Rejected', classes: 'bg-red-100 text-red-700 border-red-200' },
  COMPLETED: { label: 'Completed', classes: 'bg-slate-100 text-slate-600 border-slate-200' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-slate-100 text-slate-500 border-slate-200' },
  NO_SHOW: { label: 'No-show', classes: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { label, classes } = CONFIG[status] ?? { label: status, classes: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      {label}
    </span>
  );
}
