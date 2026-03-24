'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        className="hidden lg:flex lg:w-[45%] flex-col justify-between p-14"
        style={{ backgroundColor: 'var(--th-pink-light)' }}
      >
        {/* Top logo mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-[3px] p-[3px]">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <span
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--th-text)' }}
          >
            Townhouse
          </span>
        </div>

        {/* Centre copy */}
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.25em] uppercase mb-4"
            style={{ color: 'var(--th-pink)' }}
          >
            Meeting Room Booking
          </p>
          <h1
            className="text-4xl font-light leading-snug mb-6"
            style={{ color: 'var(--th-text)' }}
          >
            Your workspace,<br />perfectly scheduled.
          </h1>
          <div className="w-10 h-px" style={{ backgroundColor: 'var(--th-pink)' }} />
        </div>

        {/* Bottom tagline */}
        <p className="text-xs tracking-wide" style={{ color: 'var(--th-muted)' }}>
          Manage rooms across every location — all in one place.
        </p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">

        {/* Mobile logo */}
        <div className="lg:hidden text-center mb-10">
          <div className="w-9 h-9 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-[3px] p-[3px] mx-auto mb-3">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <span className="text-xs tracking-[0.2em] uppercase font-semibold" style={{ color: 'var(--th-text)' }}>
            Townhouse
          </span>
        </div>

        <div className="w-full max-w-[360px]">

          {/* Heading */}
          <div className="mb-8">
            <p
              className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2"
              style={{ color: 'var(--th-muted)' }}
            >
              Welcome back
            </p>
            <h2 className="text-2xl font-light tracking-wide" style={{ color: 'var(--th-text)' }}>
              Sign in
            </h2>
            <div className="mt-3 w-6 h-px" style={{ backgroundColor: 'var(--th-pink)' }} />
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-5 px-4 py-3 text-xs tracking-wide border rounded"
              style={{
                backgroundColor: 'var(--th-pink-light)',
                borderColor: 'var(--th-pink-mid)',
                color: '#B85A45',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
                autoComplete="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9] rounded"
                style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  className="block text-[10px] font-semibold tracking-[0.15em] uppercase"
                  style={{ color: 'var(--th-muted)' }}
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[10px] tracking-wide transition-colors"
                  style={{ color: 'var(--th-muted)' }}
                  onMouseOver={e => ((e.target as HTMLElement).style.color = 'var(--th-text)')}
                  onMouseOut={e => ((e.target as HTMLElement).style.color = 'var(--th-muted)')}
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9] rounded"
                style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-60 rounded mt-1"
              style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
              onMouseOver={e => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink-hover)')}
              onMouseOut={e => ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink)')}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[11px]" style={{ color: 'var(--th-muted)' }}>
              Don&apos;t have an account?{' '}
              <Link
                href="/signup"
                className="font-medium underline underline-offset-2 transition-colors"
                style={{ color: 'var(--th-text)' }}
              >
                Create one
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
