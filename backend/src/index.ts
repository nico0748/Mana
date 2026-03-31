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
import authRouter from './routes/auth';
import { authenticate } from './middleware/auth';

const app = express();
const PORT = process.env.PORT ?? 3000;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
  origin: corsOrigin ?? '*',
  credentials: !!corsOrigin,
}));
app.use(express.json({ limit: '50mb' })); // large for image data URLs

// Public auth routes (no authenticate middleware)
app.use('/api/auth', authRouter);

app.use('/api', authenticate);
app.use('/api/books', booksRouter);
app.use('/api/events', eventsRouter);
app.use('/api/circles', circlesRouter);
app.use('/api/circle-items', circleItemsRouter);
app.use('/api/venue-maps', venueMapsRouter);
app.use('/api/distributions', distributionsRouter);
app.use('/api/sync', syncRouter);

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
