import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY;

export const stripe = secret
  ? new Stripe(secret)
  : null;

export function requireStripe() {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in env.');
  }
  return stripe;
}
