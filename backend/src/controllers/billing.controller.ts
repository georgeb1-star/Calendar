import { Response } from 'express';
import { AuthRequest } from '../types';
import { subscriptionService } from '../services/subscription.service';
import { stripeService } from '../services/stripe.service';
import { PLAN_TOKENS } from '../config/plans';
import prisma from '../lib/prisma';

export const billingController = {
  async getSubscription(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const sub = await subscriptionService.getSubscription(companyId);

      res.json({
        plan: sub.plan,
        status: sub.status,
        currentPeriodEnd: sub.currentPeriodEnd,
        tokensPerDay: PLAN_TOKENS[sub.plan] ?? 3,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createCheckout(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { priceId, returnUrl } = req.body;

      if (!priceId || !returnUrl) {
        res.status(400).json({ error: 'priceId and returnUrl are required' });
        return;
      }

      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company) {
        res.status(404).json({ error: 'Company not found' });
        return;
      }

      const result = await stripeService.createCheckoutSession(
        companyId,
        company.name,
        priceId,
        returnUrl
      );

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },

  async createPortal(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.companyId;
      const { returnUrl } = req.body;

      if (!returnUrl) {
        res.status(400).json({ error: 'returnUrl is required' });
        return;
      }

      const result = await stripeService.createPortalSession(companyId, returnUrl);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
};
