import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import booksRouter from './routes/books';
import eventsRouter from './routes/events';
import circlesRouter from './routes/circles';
import circleItemsRouter from './routes/circleItems';
import venueMapsRouter from './routes/venueMaps';
import distributionsRouter from './routes/distributions';
import syncRouter from './routes/sync';
import meRouter from './routes/me';
import apiKeysRouter from './routes/apiKeys';
import billingRouter from './routes/billing';
import webhookRouter from './routes/webhook';
import adminRouter from './routes/admin';
import { publicAnnouncementsRouter } from './routes/announcements';
import {
  publicEventTemplatesRouter,
  userEventTemplatesRouter,
} from './routes/eventTemplates';
import { publicFaqsRouter } from './routes/faqs';
import { publicBookSearchRouter } from './routes/bookSearch';
import { authenticate } from './middleware/auth';
import { requireAdmin, adminRateLimit } from './middleware/requireAdmin';

const app = express();
const PORT = process.env.PORT ?? 3000;

// X-Powered-By: Express ヘッダーを除去（サーバー情報の露出防止）
app.disable('x-powered-by');

// Cloudflare 経由の場合は CF-Connecting-IP を信頼する
app.set('trust proxy', 1);

// CORS: CORS_ORIGIN（カンマ区切りで複数可）が指定された場合のみ、その origin に対して
// CORS を許可する。本番の Docker 構成では frontend(Nginx) → backend が同一オリジン経由で
// プロキシされるため、デフォルトでは CORS を一切有効化しない（オープンな `*` フォールバックは廃止）。
// 開発時に http://localhost:5173 等から直接叩く場合は CORS_ORIGIN を明示すること。
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (corsOrigins.length > 0) {
  app.use(
    cors({
      origin: corsOrigins,
      credentials: true,
    }),
  );
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('[cors] CORS_ORIGIN is not set; cross-origin requests are disabled. ' +
    'Set CORS_ORIGIN to a comma-separated list of allowed origins for browser dev servers.');
}

// Stripe Webhook は raw body 必須かつ認証不要なので、
// express.json と authenticate より前にマウントする。
// Stripe の webhook payload は通常 数十KB なのでアプリ全体の JSON 上限とは別に小さく保つ。
app.use('/api/webhook/stripe', webhookRouter);

// 画像は R2 へ直接 PUT に移行済みのため、JSON ボディは常識的なサイズに絞る。
// VenueMap.imageDataUrl 等の旧 Base64 経路を残す間は数 MB の余裕を持たせるが、
// 50mb（旧設定）は DoS の温床になるため許容しない。
app.use(express.json({ limit: '2mb' }));

// 公開エンドポイント (認証不要)。authenticate より前にマウントする。
app.use('/api/public/announcements', publicAnnouncementsRouter);
app.use('/api/public/event-templates', publicEventTemplatesRouter);
app.use('/api/public/faqs', publicFaqsRouter);
app.use('/api/public/book-search', publicBookSearchRouter);

app.use('/api', authenticate);
app.use('/api/admin', adminRateLimit, requireAdmin, adminRouter);
// /api/me/api-keys は /api/me より先に登録する（me 側の '/' ハンドラに吸われないように）
app.use('/api/me/api-keys', apiKeysRouter);
app.use('/api/me', meRouter);
app.use('/api/billing', billingRouter);
app.use('/api/books', booksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/circles', circlesRouter);
app.use('/api/circle-items', circleItemsRouter);
app.use('/api/venue-maps', venueMapsRouter);
app.use('/api/distributions', distributionsRouter);
app.use('/api/sync', syncRouter);
app.use('/api/event-templates', userEventTemplatesRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
