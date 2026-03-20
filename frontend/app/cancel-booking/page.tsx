'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function CancelBookingContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [refunded, setRefunded] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('No cancel token provided.');
      return;
    }

    setState('loading');

    fetch(`${API_BASE}/api/bookings/cancel-from-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to cancel booking');
        setRefunded(data.refunded);
        setState('success');
      })
      .catch((err) => {
        setErrorMessage(err.message);
        setState('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: '#F9F5F2' }}>
      <div className="bg-white shadow-lg max-w-md w-full">
        {/* Header bar */}
        <div className="px-8 py-5" style={{ backgroundColor: '#E8917A' }}>
          <p className="text-xs tracking-[0.3em] uppercase text-white font-medium" style={{ fontFamily: 'Georgia, serif' }}>
            Townhouse
          </p>
          <p className="text-[10px] tracking-[0.2em] uppercase mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Meeting Room Booking
          </p>
        </div>

        <div className="px-8 py-8">
          {state === 'loading' && (
            <div className="text-center py-4">
              <div
                className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
                style={{ borderColor: '#E8917A', borderTopColor: 'transparent' }}
              />
              <p className="text-sm" style={{ color: '#3D3530' }}>Cancelling your booking…</p>
            </div>
          )}

          {state === 'success' && (
            <div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: refunded ? '#D1FAE5' : '#FEF3C7' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  style={{ color: refunded ? '#059669' : '#D97706' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1
                className="text-xl font-medium text-center mb-3"
                style={{ fontFamily: 'Georgia, serif', color: '#1A1A1A' }}
              >
                Booking Cancelled
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: '#3D3530', lineHeight: '1.6' }}>
                {refunded
                  ? 'Your booking has been cancelled and your tokens have been refunded.'
                  : 'Your booking has been cancelled. No refund was applied — the cancellation was within 2 hours of the start time.'}
              </p>
              <div className="text-center">
                <Link
                  href="/calendar"
                  className="inline-block text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#E8917A', color: '#ffffff' }}
                >
                  Go to Calendar
                </Link>
              </div>
            </div>
          )}

          {state === 'error' && (
            <div>
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ backgroundColor: '#FEE2E2' }}
              >
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1
                className="text-xl font-medium text-center mb-3"
                style={{ fontFamily: 'Georgia, serif', color: '#1A1A1A' }}
              >
                Unable to Cancel
              </h1>
              <p className="text-sm text-center mb-6" style={{ color: '#3D3530', lineHeight: '1.6' }}>
                {errorMessage || 'This cancel link may have expired or the booking is already cancelled.'}
              </p>
              <div className="text-center">
                <Link
                  href="/calendar"
                  className="inline-block text-xs font-semibold tracking-[0.15em] uppercase px-6 py-3 transition-opacity hover:opacity-80"
                  style={{ backgroundColor: '#E8917A', color: '#ffffff' }}
                >
                  Go to Calendar
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CancelBookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F9F5F2' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E8917A', borderTopColor: 'transparent' }} />
      </div>
    }>
      <CancelBookingContent />
    </Suspense>
  );
}
