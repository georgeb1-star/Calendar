'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/my-bookings',
    label: 'My Bookings',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
];

const adminItems = [
  {
    href: '/admin',
    label: 'Admin',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/calendar'
      ? pathname === '/calendar'
      : pathname.startsWith(href);

  const handleNavClick = () => {
    onClose?.();
  };

  const sidebarContent = (
    <aside className="w-56 h-full flex flex-col border-r" style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-cream)' }}>
      {/* Logo */}
      <div className="px-6 py-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--th-border)' }}>
        <div className="flex flex-col items-start gap-1">
          <div className="w-8 h-8 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-px p-0.5 mb-2">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--th-text)' }}>
            Townhouse
          </span>
          <span className="text-[10px] tracking-[0.12em] uppercase" style={{ color: 'var(--th-muted)' }}>
            Meeting Rooms
          </span>
        </div>
        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded"
            style={{ color: 'var(--th-muted)' }}
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={handleNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium tracking-[0.1em] uppercase transition-colors ${
              isActive(item.href)
                ? 'bg-[#FAF0EE] text-[#E8917A]'
                : 'text-[#1A1A1A] hover:bg-[#F2D5CE]/30 hover:text-[#E8917A]'
            }`}
          >
            <span className={isActive(item.href) ? 'text-[#E8917A]' : 'text-[#8A7E78]'}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}

        {user?.role === 'ADMIN' && (
          <>
            <div className="pt-5 pb-2 px-3">
              <div className="h-px w-full mb-3" style={{ backgroundColor: 'var(--th-border)' }} />
              <p className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--th-muted)' }}>
                Admin
              </p>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium tracking-[0.1em] uppercase transition-colors ${
                  isActive(item.href)
                    ? 'bg-[#FAF0EE] text-[#E8917A]'
                    : 'text-[#1A1A1A] hover:bg-[#F2D5CE]/30 hover:text-[#E8917A]'
                }`}
              >
                <span className={isActive(item.href) ? 'text-[#E8917A]' : 'text-[#8A7E78]'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </>
        )}

        {user?.role === 'COMPANY_ADMIN' && (
          <>
            <div className="pt-5 pb-2 px-3">
              <div className="h-px w-full mb-3" style={{ backgroundColor: 'var(--th-border)' }} />
              <p className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--th-muted)' }}>
                Account
              </p>
            </div>
            <Link
              href="/company-users"
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium tracking-[0.1em] uppercase transition-colors ${
                isActive('/company-users')
                  ? 'bg-[#FAF0EE] text-[#E8917A]'
                  : 'text-[#1A1A1A] hover:bg-[#F2D5CE]/30 hover:text-[#E8917A]'
              }`}
            >
              <span className={isActive('/company-users') ? 'text-[#E8917A]' : 'text-[#8A7E78]'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              Users
            </Link>
            <Link
              href="/billing"
              onClick={handleNavClick}
              className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium tracking-[0.1em] uppercase transition-colors ${
                isActive('/billing')
                  ? 'bg-[#FAF0EE] text-[#E8917A]'
                  : 'text-[#1A1A1A] hover:bg-[#F2D5CE]/30 hover:text-[#E8917A]'
              }`}
            >
              <span className={isActive('/billing') ? 'text-[#E8917A]' : 'text-[#8A7E78]'}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </span>
              Billing
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div className="p-4 border-t" style={{ borderColor: 'var(--th-border)' }}>
        {user && (
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
              style={{ backgroundColor: 'var(--th-pink)' }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate tracking-wide" style={{ color: 'var(--th-text)' }}>
                {user.name}
              </p>
              <p className="text-[10px] truncate tracking-wide uppercase" style={{ color: 'var(--th-muted)' }}>
                {user.company.name}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 text-xs tracking-[0.1em] uppercase font-medium transition-colors hover:text-[#E8917A]"
          style={{ color: 'var(--th-muted)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex min-h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40"
            onClick={onClose}
          />
          {/* Drawer */}
          <div className="relative z-50 flex h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
