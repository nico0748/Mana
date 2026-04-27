import express, { Router } from 'express';
import type { Stripe } from 'stripe/cjs/stripe.core.js';
import { prisma } from '../prisma';
import { requireStripe } from '../lib/stripe';

const router = Router();

// Stripe Webhook は signed payload を raw body のまま検証する必要があるため、
// express.json より前にマウントすること。
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  let stripe;
  try {
    stripe = requireStripe();
  } catch (e: any) {
    res.status(503).send(`Stripe not configured: ${e.message}`);
    return;
  }

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    res.status(400).send('Missing signature or webhook secret');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed', err?.message);
    res.status(400).send(`Webhook Error: ${err?.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await syncSubscription(sub);
        }
        break;
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: 'free',
            planStatus: 'canceled',
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: null,
            stripePriceId: null,
            planExpiresAt: new Date(((sub as any).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
          },
        });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          const customerId = typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer.id;
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { planStatus: 'past_due' },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error', err);
    res.status(500).send('Handler error');
    return;
  }

  res.json({ received: true });
});

async function syncSubscription(sub: Stripe.Subscription) {
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const priceId = sub.items.data[0]?.price.id;
  const interval =
    priceId === process.env.STRIPE_PRICE_YEARLY ? 'yearly' :
    priceId === process.env.STRIPE_PRICE_MONTHLY ? 'monthly' :
    null;

  const isActive = sub.status === 'active' || sub.status === 'trialing';

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: isActive ? 'pro' : 'free',
      planStatus: sub.status,
      planInterval: interval ?? undefined,
      planExpiresAt: new Date(((sub as any).current_period_end ?? Math.floor(Date.now() / 1000)) * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId,
    },
  });
}

export default router;
