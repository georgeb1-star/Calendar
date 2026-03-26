'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [locationId, setLocationId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [locations, setLocations] = useState<{ id: string; name: string; address?: string }[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.auth.getLocations().then(setLocations).catch(() => {});
  }, []);

  useEffect(() => {
    if (!locationId) { setCompanies([]); return; }
    api.auth.getCompanies(locationId).then(setCompanies).catch(() => {});
    setCompanyId('');
  }, [locationId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await api.auth.register({ name, email, password, locationId, companyId });
      setAuth(result.token, result.user);
      router.push('/calendar');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
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
        <div className="mt-12 w-16 h-px" style={{ backgroundColor: 'var(--th-pink)' }} />
      </div>

      {/* Right signup form */}
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
              Get started
            </h2>
            <p className="text-xl font-light tracking-wide" style={{ color: 'var(--th-text)' }}>
              Create your account
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
                Full name
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                placeholder="Jane Smith"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9]"
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
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9]"
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors placeholder-[#C5BDB9]"
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
                Office location
              </label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                required
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors appearance-none"
                style={{ borderColor: 'var(--th-border)', color: locationId ? '#000000' : '#C5BDB9' }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              >
                <option value="" disabled>Select your office</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}{loc.address ? ` — ${loc.address}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-[10px] font-semibold tracking-[0.15em] uppercase mb-2"
                style={{ color: 'var(--th-muted)' }}
              >
                Company
              </label>
              <select
                value={companyId}
                onChange={e => setCompanyId(e.target.value)}
                required
                disabled={!locationId}
                className="w-full px-4 py-3 text-sm border bg-white focus:outline-none transition-colors appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--th-border)', color: (companyId || locationId) ? '#000000' : '#C5BDB9' }}
                onFocus={e => (e.target.style.borderColor = 'var(--th-pink)')}
                onBlur={e => (e.target.style.borderColor = 'var(--th-border)')}
              >
                <option value="" disabled>
                  {locationId ? 'Select your company' : 'Select an office first'}
                </option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-xs font-semibold tracking-[0.2em] uppercase transition-opacity disabled:opacity-60 mt-2"
              style={{ backgroundColor: 'var(--th-pink)', color: '#ffffff' }}
              onMouseOver={e => !loading && ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink-hover)')}
              onMouseOut={e => ((e.target as HTMLElement).style.backgroundColor = 'var(--th-pink)')}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--th-border)' }}>
            <p className="text-[11px]" style={{ color: 'var(--th-muted)' }}>
              Already have an account?{' '}
              <Link
                href="/login"
                className="underline underline-offset-2"
                style={{ color: 'var(--th-text)' }}
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
