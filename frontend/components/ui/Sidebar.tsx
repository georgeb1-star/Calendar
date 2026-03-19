'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

const navItems = [
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

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string) =>
    href === '/calendar'
      ? pathname === '/calendar' || pathname === '/'
      : pathname.startsWith(href);

  return (
    <aside className="w-56 min-h-screen flex flex-col border-r" style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-cream)' }}>
      {/* Logo */}
      <div className="px-6 py-6 border-b" style={{ borderColor: 'var(--th-border)' }}>
        <div className="flex flex-col items-start gap-1">
          {/* Townhouse-style window/grid icon */}
          <div className="w-8 h-8 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-px p-0.5 mb-2">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <span
            className="text-xs font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--th-text)' }}
          >
            Townhouse
          </span>
          <span
            className="text-[10px] tracking-[0.12em] uppercase"
            style={{ color: 'var(--th-muted)' }}
          >
            Meeting Rooms
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
}
