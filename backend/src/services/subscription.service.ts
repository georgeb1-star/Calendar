import Stripe from 'stripe';
import prisma from '../lib/prisma';
import { PLAN_TOKENS, PRICE_TO_PLAN } from '../config/plans';
import { notificationService } from './notification.service';

const PLAN_AMOUNTS: Record<string, string> = { FREE: '£0', PRO: '£20', MAX: '£50' };

function getTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const subscriptionService = {
  async getSubscription(companyId: string) {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) {
      return {
        plan: 'FREE' as const,
        status: 'active',
        currentPeriodEnd: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    }
    return sub;
  },

  async syncPlanToTokens(companyId: string, plan: string) {
    const tokensTotal = PLAN_TOKENS[plan] ?? 3;
    const date = getTodayDate();

    await prisma.companyDailyTokens.upsert({
      where: { companyId_date: { companyId, date } },
      create: { companyId, date, tokensTotal, tokensUsed: 0 },
      update: { tokensTotal },
    });
  },

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const priceId = subscription.items.data[0]?.price.id;
        const plan = (priceId && PRICE_TO_PLAN[priceId]) ? PRICE_TO_PLAN[priceId] : 'FREE';
        const status = subscription.status;
        // billing_cycle_anchor is the next billing date in Stripe v20+
        const currentPeriodEnd = new Date(subscription.billing_cycle_anchor * 1000);

        const sub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });
        if (!sub) break;

        await prisma.subscription.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            plan: plan as any,
            status,
            stripePriceId: priceId ?? null,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd,
          },
        });

        if (status === 'active') {
          await subscriptionService.syncPlanToTokens(sub.companyId, plan);

          // Send receipt email to COMPANY_ADMIN on new subscription
          if (event.type === 'customer.subscription.created') {
            const admin = await prisma.user.findFirst({
              where: { companyId: sub.companyId, role: 'COMPANY_ADMIN' },
            });
            if (admin) {
              await notificationService.sendSubscriptionReceipt({
                userEmail: admin.email,
                userName: admin.name,
                plan,
                tokensPerDay: PLAN_TOKENS[plan] ?? 3,
                amount: PLAN_AMOUNTS[plan] ?? '£0',
              }).catch(console.error);
            }
          }
        } else {
          await subscriptionService.syncPlanToTokens(sub.companyId, 'FREE');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const sub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: subscription.customer as string },
        });
        if (!sub) break;

        await prisma.subscription.update({
          where: { stripeCustomerId: subscription.customer as string },
          data: {
            plan: 'FREE',
            status: 'canceled',
            stripeSubscriptionId: null,
            stripePriceId: null,
          },
        });

        await subscriptionService.syncPlanToTokens(sub.companyId, 'FREE');
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        const sub = await prisma.subscription.findUnique({
          where: { stripeCustomerId: invoice.customer as string },
        });
        if (!sub) break;

        await prisma.subscription.update({
          where: { stripeCustomerId: invoice.customer as string },
          data: { status: 'past_due' },
        });

        await subscriptionService.syncPlanToTokens(sub.companyId, 'FREE');
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.customer) {
          await prisma.subscription.update({
            where: { stripeCustomerId: session.customer as string },
            data: { stripeSubscriptionId: session.subscription as string },
          });
        }
        break;
      }
    }
  },
};
