'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { api } from '@/lib/api';

const PLANS = [
  {
    key: 'FREE',
    name: 'Free',
    price: '£0',
    tokens: 3,
    priceId: null,
  },
  {
    key: 'PRO',
    name: 'Pro',
    price: '£20',
    tokens: 6,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  },
  {
    key: 'MAX',
    name: 'Max',
    price: '£50',
    tokens: 12,
    priceId: process.env.NEXT_PUBLIC_STRIPE_MAX_PRICE_ID,
  },
];

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscription] = useState<{
    plan: string;
    status: string;
    currentPeriodEnd: string | null;
    tokensPerDay: number;
  } | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    if (!authLoading && user?.role !== 'COMPANY_ADMIN') {
      router.replace('/calendar');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === 'COMPANY_ADMIN') {
      api.billing.subscription()
        .then(setSubscription)
        .catch(console.error)
        .finally(() => setLoadingSubscription(false));
    }
  }, [user, authLoading]);

  if (authLoading || loadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-sm" style={{ color: 'var(--th-muted)' }}>Loading…</div>
      </div>
    );
  }

  if (!user || user.role !== 'COMPANY_ADMIN') return null;

  const currentPlan = subscription?.plan ?? 'FREE';
  const isPaidPlan = currentPlan !== 'FREE';

  async function handleUpgrade(priceId: string, planKey: string) {
    setCheckoutLoading(planKey);
    try {
      const { url } = await api.billing.checkout(priceId, window.location.href);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const { url } = await api.billing.portal(window.location.href);
      window.location.href = url;
    } catch (err: any) {
      alert(err.message);
      setPortalLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-xl font-semibold tracking-wide mb-1"
          style={{ color: 'var(--th-text)' }}
        >
          Billing & Subscription
        </h1>
        <p className="text-sm" style={{ color: 'var(--th-muted)' }}>
          Manage your company's daily token allowance
        </p>
      </div>

      {/* Status banners */}
      {checkoutStatus === 'success' && (
        <div className="mb-6 px-4 py-3 rounded border border-green-200 bg-green-50 text-sm text-green-800">
          Subscription activated successfully. Your token allowance has been updated.
        </div>
      )}
      {checkoutStatus === 'canceled' && (
        <div className="mb-6 px-4 py-3 rounded border border-amber-200 bg-amber-50 text-sm text-amber-800">
          Checkout was cancelled. No changes were made.
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.key;
          return (
            <div
              key={plan.key}
              className={`rounded border p-5 flex flex-col gap-3 transition-all ${
                isCurrent
                  ? 'border-[#E8917A] bg-[#FAF0EE]'
                  : 'border-[var(--th-border)] bg-white'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="text-sm font-semibold tracking-wide"
                    style={{ color: 'var(--th-text)' }}
                  >
                    {plan.name}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-medium text-[#E8917A] bg-[#FAF0EE] border border-[#E8917A]/30 px-1.5 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-lg font-bold" style={{ color: 'var(--th-text)' }}>
                  {plan.price}
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--th-muted)' }}>
                    /month
                  </span>
                </p>
              </div>

              <p className="text-sm" style={{ color: 'var(--th-muted)' }}>
                <span className="font-semibold" style={{ color: 'var(--th-text)' }}>
                  {plan.tokens}
                </span>{' '}
                tokens / day
              </p>

              {!isCurrent && plan.priceId ? (
                <button
                  onClick={() => handleUpgrade(plan.priceId!, plan.key)}
                  disabled={checkoutLoading === plan.key}
                  className="mt-auto text-xs font-medium tracking-[0.1em] uppercase px-3 py-2 rounded border border-[#E8917A] text-[#E8917A] hover:bg-[#E8917A] hover:text-white transition-colors disabled:opacity-50"
                >
                  {checkoutLoading === plan.key ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </button>
              ) : isCurrent ? (
                <div className="mt-auto text-xs text-[#E8917A] font-medium">
                  ✓ Active plan
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Manage subscription */}
      {isPaidPlan && subscription && (
        <div
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 rounded border"
          style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-cream)' }}
        >
          <div className="text-sm" style={{ color: 'var(--th-muted)' }}>
            {subscription.currentPeriodEnd ? (
              <>
                Renews:{' '}
                <span style={{ color: 'var(--th-text)' }} className="font-medium">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </>
            ) : (
              'Subscription active'
            )}
          </div>
          <button
            onClick={handlePortal}
            disabled={portalLoading}
            className="text-xs font-medium tracking-[0.1em] uppercase px-4 py-2 rounded border transition-colors disabled:opacity-50"
            style={{
              borderColor: 'var(--th-border)',
              color: 'var(--th-text)',
            }}
          >
            {portalLoading ? 'Redirecting…' : 'Manage subscription →'}
          </button>
        </div>
      )}
    </div>
  );
}
