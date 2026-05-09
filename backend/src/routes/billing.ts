import { Router } from 'express';
import { prisma } from '../prisma';
import { requireStripe } from '../lib/stripe';

const router = Router();

router.post('/checkout', async (req, res) => {
  try {
    const stripe = requireStripe();
    const user = req.user!;
    const { interval } = req.body as { interval?: 'monthly' | 'yearly' };

    const priceId = interval === 'yearly'
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;

    if (!priceId) {
      res.status(500).json({ error: 'price_not_configured' });
      return;
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { firebaseUid: user.firebaseUid },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { firebaseUid: user.firebaseUid },
        data: { stripeCustomerId: customerId },
      });
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/account?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/account?status=canceled`,
      allow_promotion_codes: true,
      locale: 'ja',
      subscription_data: {
        metadata: { firebaseUid: user.firebaseUid },
      },
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('billing/checkout error', err);
    // 詳細は console に出すだけにとどめ、クライアントには内部実装の詳細を漏らさない。
    const code = err?.message === 'billing_unavailable' ? 'billing_unavailable' : 'checkout_failed';
    res.status(code === 'billing_unavailable' ? 503 : 500).json({ error: code });
  }
});

router.post('/portal', async (req, res) => {
  try {
    const stripe = requireStripe();
    const user = req.user!;

    if (!user.stripeCustomerId) {
      res.status(400).json({ error: 'no_customer' });
      return;
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/account`,
    });

    res.json({ url: portal.url });
  } catch (err: any) {
    console.error('billing/portal error', err);
    const code = err?.message === 'billing_unavailable' ? 'billing_unavailable' : 'portal_failed';
    res.status(code === 'billing_unavailable' ? 503 : 500).json({ error: code });
  }
});

export default router;
