'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AuthGuard from '@/components/ui/AuthGuard';
import Sidebar from '@/components/ui/Sidebar';
import { useAuth } from '@/lib/hooks/useAuth';

function PendingApprovalScreen() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8" style={{ backgroundColor: 'var(--th-warm)' }}>
      <div className="w-10 h-10 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 mb-8">
        <div className="bg-[#1A1A1A]" />
        <div className="bg-[#1A1A1A]" />
        <div className="bg-[#1A1A1A]" />
        <div className="bg-[#1A1A1A]" />
      </div>
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
          Account Status
        </p>
        <h1 className="text-2xl font-light tracking-wide mb-4" style={{ color: 'var(--th-text)', fontFamily: 'Georgia, serif' }}>
          Awaiting Approval
        </h1>
        <div className="w-8 h-px mx-auto mb-6" style={{ backgroundColor: 'var(--th-pink)' }} />
        <p className="text-sm leading-relaxed mb-2" style={{ color: 'var(--th-muted)' }}>
          Your account has been created and is pending approval from your office administrator.
        </p>
        <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--th-muted)' }}>
          You'll receive an email once your account has been activated.
        </p>
        <button
          onClick={logout}
          className="text-xs tracking-[0.15em] uppercase underline underline-offset-2"
          style={{ color: 'var(--th-muted)' }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && user?.role === 'GLOBAL_ADMIN' && !pathname.startsWith('/global-admin')) {
      router.replace('/global-admin');
    }
  }, [user, loading, pathname, router]);

  if (!loading && user?.status === 'PENDING') {
    return <PendingApprovalScreen />;
  }

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-cream)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded"
            style={{ color: 'var(--th-text)' }}
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-px p-0.5">
              <div className="bg-[#1A1A1A]" />
              <div className="bg-[#1A1A1A]" />
              <div className="bg-[#1A1A1A]" />
              <div className="bg-[#1A1A1A]" />
            </div>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--th-text)' }}>
              Townhouse
            </span>
          </div>
          <div className="w-8" />
        </header>

        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardContent>{children}</DashboardContent>
    </AuthGuard>
  );
}
