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
import billingRouter from './routes/billing';
import webhookRouter from './routes/webhook';
import adminRouter from './routes/admin';
import { publicAnnouncementsRouter } from './routes/announcements';
import {
  publicEventTemplatesRouter,
  userEventTemplatesRouter,
} from './routes/eventTemplates';
import { authenticate } from './middleware/auth';
import { requireAdmin, adminRateLimit } from './middleware/requireAdmin';

const app = express();
const PORT = process.env.PORT ?? 3000;

// X-Powered-By: Express ヘッダーを除去（サーバー情報の露出防止）
app.disable('x-powered-by');

// Cloudflare 経由の場合は CF-Connecting-IP を信頼する
app.set('trust proxy', 1);

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ?? '*',
  credentials: !!corsOrigin,
}));

// Stripe Webhook は raw body 必須かつ認証不要なので、
// express.json と authenticate より前にマウントする。
app.use('/api/webhook/stripe', webhookRouter);

app.use(express.json({ limit: '50mb' })); // large for image data URLs

// 公開エンドポイント (認証不要)。authenticate より前にマウントする。
app.use('/api/public/announcements', publicAnnouncementsRouter);
app.use('/api/public/event-templates', publicEventTemplatesRouter);

app.use('/api', authenticate);
app.use('/api/admin', adminRateLimit, requireAdmin, adminRouter);
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
