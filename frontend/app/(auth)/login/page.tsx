'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/calendar');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--th-warm)' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-16"
        style={{ backgroundColor: 'var(--th-pink-light)' }}
      >
        {/* Townhouse grid logo */}
        <div className="w-16 h-16 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-0.5 p-1 mb-8">
          <div className="bg-[#1A1A1A]" />
          <div className="bg-[#1A1A1A]" />
          <div className="bg-[#1A1A1A]" />
          <div className="bg-[#1A1A1A]" />
        </div>
        <h1
          className="text-2xl font-light tracking-[0.3em] uppercase mb-3"
          style={{ color: 'var(--th-text)' }}
        >
          Townhouse
        </h1>
        <p
          className="text-xs tracking-[0.2em] uppercase"
          style={{ color: 'var(--th-muted)' }}
        >
          Meeting Room Booking
        </p>

        {/* Decorative pink line */}
        <div className="mt-12 w-16 h-px" style={{ backgroundColor: 'var(--th-pink)' }} />
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <div className="w-10 h-10 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-0.5 p-0.5 mx-auto mb-4">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase" style={{ color: 'var(--th-muted)' }}>
            Meeting Rooms
          </p>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2
              className="text-xs font-semibold tracking-[0.2em] uppercase mb-2"
              style={{ color: 'var(--th-muted)' }}
            >
              Welcome back
            </h2>
            <p className="text-xl font-light tracking-wide" style={{ color: 'var(--th-text)' }}>
              Sign in to your account
            </p>
            <div className="mt-3 w-8 h-px" style={{ backgroundColor: 'var(--th-pink)' }} />
          </div>

          {error && (
            <div
              className="mb-5 px-4 py-3 text-xs tracking-wide border"
              style={{
                backgroundColor: 'var(--th-pink-light)',
                borderColor: 'var(--th-pink-mid)',
                color: '#B85A45',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--th-muted)' }}
              >
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9]"
                style={{
                  borderColor: 'var(--th-border)',
                  color: 'var(--th-text)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              />
            </div>

            <div>
              <label
                className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--th-muted)' }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9]"
                style={{
                  borderColor: 'var(--th-border)',
                  color: 'var(--th-text)',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-60 mt-2"
              style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
              onMouseOver={e => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink-hover)')}
              onMouseOut={e => ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink)')}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--th-border)' }}>
            <p className="text-[10px] tracking-[0.1em] uppercase text-center mb-3" style={{ color: 'var(--th-muted)' }}>
              Demo credentials
            </p>
            <div className="space-y-1 text-[11px] text-center" style={{ color: 'var(--th-muted)' }}>
              <p>admin@acme.com / admin123</p>
              <p>bob@acme.com / password123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
