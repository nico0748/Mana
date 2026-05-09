import Stripe from 'stripe';

const secret = process.env.STRIPE_SECRET_KEY;

export const stripe = secret
  ? new Stripe(secret)
  : null;

export function requireStripe() {
  if (!stripe) {
    // ユーザーに見える可能性があるため、環境変数名等の内部実装ヒントは含めない。
    // 詳細はサーバーログ側で検知可能（process.env.STRIPE_SECRET_KEY が未設定）。
    throw new Error('billing_unavailable');
  }
  return stripe;
}
