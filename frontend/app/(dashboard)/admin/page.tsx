'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ApprovalQueue from '@/components/admin/ApprovalQueue';
import UserTable from '@/components/admin/UserTable';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import RoomTable from '@/components/admin/RoomTable';
import BlackoutDates from '@/components/admin/BlackoutDates';

type Tab = 'approvals' | 'users' | 'analytics' | 'rooms' | 'closures';

const OFFICE_ADMIN_ROLES = ['ADMIN', 'OFFICE_ADMIN', 'GLOBAL_ADMIN'];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('approvals');

  useEffect(() => {
    if (!loading && (!user || !OFFICE_ADMIN_ROLES.includes(user.role))) {
      router.push('/calendar');
    }
  }, [user, loading, router]);

  if (loading || !user || !OFFICE_ADMIN_ROLES.includes(user.role)) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'approvals', label: 'Approval Queue' },
    { id: 'users', label: 'User Management' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'closures', label: 'Office Closures' },
  ];

  const locationLabel = user.location?.name ?? 'Office';

  return (
    <div className="px-4 sm:px-6 py-6 sm:py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">{locationLabel} — manage bookings, users, and rooms</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'approvals' && <ApprovalQueue />}
      {tab === 'users' && <UserTable />}
      {tab === 'analytics' && <AnalyticsDashboard />}
      {tab === 'rooms' && <RoomTable />}
      {tab === 'closures' && <BlackoutDates />}
    </div>
  );
}
