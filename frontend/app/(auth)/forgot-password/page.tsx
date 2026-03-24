'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.forgotPassword(email);
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

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

        {submitted ? (
          /* Success state */
          <div>
            <div className="mb-6">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mb-5"
                style={{ backgroundColor: 'var(--th-pink-light)' }}
              >
                <svg className="w-5 h-5" style={{ color: 'var(--th-pink)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
                Check your inbox
              </p>
              <h2 className="text-2xl font-light tracking-wide mb-3" style={{ color: 'var(--th-text)' }}>
                Email sent
              </h2>
              <div className="w-6 h-px mb-5" style={{ backgroundColor: 'var(--th-pink)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
                If an account exists for <span className="font-medium" style={{ color: 'var(--th-text)' }}>{email}</span>, you'll receive a password reset link shortly. The link expires in 1 hour.
              </p>
            </div>
            <Link
              href="/login"
              className="flex items-center gap-2 text-[11px] tracking-wide transition-colors"
              style={{ color: 'var(--th-muted)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to sign in
            </Link>
          </div>
        ) : (
          /* Form state */
          <>
            <div className="mb-8">
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase mb-2" style={{ color: 'var(--th-muted)' }}>
                Password reset
              </p>
              <h2 className="text-2xl font-light tracking-wide mb-1" style={{ color: 'var(--th-text)' }}>
                Forgot your password?
              </h2>
              <div className="w-6 h-px mt-3 mb-4" style={{ backgroundColor: 'var(--th-pink)' }} />
              <p className="text-sm leading-relaxed" style={{ color: 'var(--th-muted)' }}>
                Enter your email and we'll send you a link to reset it.
              </p>
            </div>

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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-60 rounded"
                style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
                onMouseOver={e => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink-hover)')}
                onMouseOut={e => ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink)')}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-8">
              <Link
                href="/login"
                className="flex items-center gap-2 text-[11px] tracking-wide transition-colors"
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
      </div>
    </div>
  );
}
