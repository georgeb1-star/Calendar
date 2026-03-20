import { Router, Request, Response } from 'express';
import { stripeService } from '../services/stripe.service';
import { subscriptionService } from '../services/subscription.service';

const router = Router();

router.post('/stripe', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.body as Buffer, sig);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
    return;
  }

  try {
    await subscriptionService.handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
