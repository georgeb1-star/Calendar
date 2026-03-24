'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await api.auth.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="text-center">
        <p className="text-sm mb-4" style={{ color: 'var(--th-muted)' }}>
          This reset link is invalid. Please request a new one.
        </p>
        <Link href="/forgot-password" className="text-sm underline underline-offset-2" style={{ color: 'var(--th-text)' }}>
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
          Password reset
        </p>
        <h2 className="text-2xl font-light tracking-wide mb-1" style={{ color: 'var(--th-text)' }}>
          {done ? 'Password updated' : 'Choose a new password'}
        </h2>
        <div className="w-6 h-px mt-3" style={{ backgroundColor: 'var(--th-pink)' }} />
      </div>

      {done ? (
        <div>
          <div
            className="mb-5 px-4 py-3 text-sm border rounded"
            style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#166534' }}
          >
            Your password has been updated. Redirecting you to sign in…
          </div>
          <Link href="/login" className="text-[11px] underline underline-offset-2" style={{ color: 'var(--th-muted)' }}>
            Go to sign in
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div
              className="mb-5 px-4 py-3 text-xs tracking-wide border rounded"
              style={{ backgroundColor: 'var(--th-pink-light)', borderColor: 'var(--th-pink-mid)', color: '#B85A45' }}
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
                New password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Min. 8 characters"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9] rounded"
                style={{ borderColor: 'var(--th-border)', color: 'var(--th-text)' }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              />
            </div>

            <div>
              <label
                className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--th-muted)' }}
              >
                Confirm password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
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
              className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-60 rounded"
              style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
              onMouseOver={e => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink-hover)')}
              onMouseOut={e => ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink)')}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>

          <div className="mt-8">
            <Link
              href="/login"
              className="flex items-center gap-2 text-[11px] tracking-wide"
              style={{ color: 'var(--th-muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ backgroundColor: 'var(--th-warm)' }}>
      <div className="w-full max-w-[360px]">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-7 h-7 border-2 border-[#1A1A1A] grid grid-cols-2 grid-rows-2 gap-[3px] p-[3px]">
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
            <div className="bg-[#1A1A1A]" />
          </div>
          <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: 'var(--th-text)' }}>
            Townhouse
          </span>
        </div>

        <Suspense fallback={<p className="text-sm" style={{ color: 'var(--th-muted)' }}>Loading…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
