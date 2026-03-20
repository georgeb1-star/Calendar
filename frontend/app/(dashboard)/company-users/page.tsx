'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';

interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACTIVE';
  createdAt: string;
}

export default function CompanyUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    if (!authLoading && user?.role !== 'COMPANY_ADMIN') {
      router.replace('/calendar');
    }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const data = tab === 'pending'
        ? await api.companyUsers.pending()
        : await api.companyUsers.all();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }, [tab]);

  useEffect(() => {
    if (!authLoading && user?.role === 'COMPANY_ADMIN') {
      load();
    }
  }, [user, authLoading, load]);

  if (authLoading) return null;
  if (!user || user.role !== 'COMPANY_ADMIN') return null;

  async function handleApprove(id: string) {
    setActionLoading(id + '_approve');
    try {
      await api.companyUsers.approve(id);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string, name: string) {
    if (!confirm(`Reject and delete ${name}'s account? They will need to register again.`)) return;
    setActionLoading(id + '_reject');
    try {
      await api.companyUsers.reject(id);
      load();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCount = users.filter(u => u.status === 'PENDING').length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-wide mb-1" style={{ color: 'var(--th-text)' }}>
          Users
        </h1>
        <p className="text-sm" style={{ color: 'var(--th-muted)' }}>
          Approve or reject new users requesting to join your company
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: 'var(--th-border)' }}>
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase border-b-2 -mb-px transition-colors flex items-center gap-2 ${
            tab === 'pending'
              ? 'border-[#E8917A] text-[#E8917A]'
              : 'border-transparent text-[#8A7E78] hover:text-[#1A1A1A]'
          }`}
        >
          Pending
          {pendingCount > 0 && tab !== 'pending' && (
            <span className="bg-[#E8917A] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-xs font-medium tracking-[0.1em] uppercase border-b-2 -mb-px transition-colors ${
            tab === 'all'
              ? 'border-[#E8917A] text-[#E8917A]'
              : 'border-transparent text-[#8A7E78] hover:text-[#1A1A1A]'
          }`}
        >
          All Users
        </button>
      </div>

      {/* Content */}
      {loadingUsers ? (
        <div className="text-sm text-center py-12" style={{ color: 'var(--th-muted)' }}>Loading…</div>
      ) : users.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-sm" style={{ color: 'var(--th-muted)' }}>
            {tab === 'pending' ? 'No pending requests' : 'No users found'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div
              key={u.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded border"
              style={{ borderColor: u.status === 'PENDING' ? 'var(--th-pink-mid)' : 'var(--th-border)', backgroundColor: u.status === 'PENDING' ? 'var(--th-pink-light)' : 'white' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--th-text)' }}>{u.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--th-muted)' }}>{u.email}</p>
                <p className="text-[10px] mt-1 tracking-wide uppercase" style={{ color: 'var(--th-muted)' }}>
                  Requested {new Date(u.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {u.status === 'PENDING' ? (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleApprove(u.id)}
                    disabled={actionLoading === u.id + '_approve'}
                    className="text-xs font-medium tracking-[0.1em] uppercase px-4 py-2 rounded border border-[#E8917A] text-[#E8917A] hover:bg-[#E8917A] hover:text-white transition-colors disabled:opacity-50"
                  >
                    {actionLoading === u.id + '_approve' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(u.id, u.name)}
                    disabled={actionLoading === u.id + '_reject'}
                    className="text-xs font-medium tracking-[0.1em] uppercase px-4 py-2 rounded border transition-colors disabled:opacity-50"
                    style={{ borderColor: 'var(--th-border)', color: 'var(--th-muted)' }}
                  >
                    {actionLoading === u.id + '_reject' ? 'Rejecting…' : 'Reject'}
                  </button>
                </div>
              ) : (
                <span className="text-[10px] font-medium tracking-[0.1em] uppercase px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 self-start sm:self-auto">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
