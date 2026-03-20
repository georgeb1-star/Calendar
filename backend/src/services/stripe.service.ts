import Stripe from 'stripe';
import prisma from '../lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
});

export const stripeService = {
  async getOrCreateCustomer(companyId: string, companyName: string): Promise<string> {
    const existing = await prisma.subscription.findUnique({
      where: { companyId },
    });

    if (existing?.stripeCustomerId) {
      return existing.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      name: companyName,
      metadata: { companyId },
    });

    await prisma.subscription.upsert({
      where: { companyId },
      create: {
        companyId,
        stripeCustomerId: customer.id,
      },
      update: {
        stripeCustomerId: customer.id,
      },
    });

    return customer.id;
  },

  async createCheckoutSession(
    companyId: string,
    companyName: string,
    priceId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const customerId = await stripeService.getOrCreateCustomer(companyId, companyName);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: returnUrl + '?checkout=success',
      cancel_url: returnUrl + '?checkout=canceled',
      metadata: { companyId },
    });

    return { url: session.url! };
  },

  async createPortalSession(companyId: string, returnUrl: string): Promise<{ url: string }> {
    const sub = await prisma.subscription.findUnique({ where: { companyId } });
    if (!sub?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this company');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  },

  constructWebhookEvent(payload: Buffer, sig: string): Stripe.Event {
    return stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  },
};
