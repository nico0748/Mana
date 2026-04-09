import { Router } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';

const router = Router();

function generateShareCode(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 8);
}

const toEvent = (e: any) => ({
  ...e,
  circles: undefined,
  createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : e.createdAt,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.getTime() : e.updatedAt,
});

// 自分のイベント一覧
router.get('/', async (_req, res) => {
  const events = await prisma.doujinEvent.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(events.map(toEvent));
});

// イベント作成
router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const event = await prisma.doujinEvent.create({ data });
  res.status(201).json(toEvent(event));
});

// イベント更新
router.put('/:id', async (req, res) => {
  const { id, createdAt, ...data } = req.body;
  const event = await prisma.doujinEvent.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toEvent(event));
});

// イベント削除
router.delete('/:id', async (req, res) => {
  await prisma.doujinEvent.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ──────────────────────────────────────────────────
// 共有機能（ここから新規追加分）
// ──────────────────────────────────────────────────

// shareCode を生成してイベントに付与
router.post('/:id/share', async (req, res) => {
  const event = await prisma.doujinEvent.findUnique({ where: { id: req.params.id } });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  // 既にコードがあればそのまま返す
  if (event.shareCode) {
    res.json(toEvent(event));
    return;
  }
  const updated = await prisma.doujinEvent.update({
    where: { id: req.params.id },
    data: { shareCode: generateShareCode() },
  });
  res.json(toEvent(updated));
});

// shareCode を無効化（共有停止）
router.delete('/:id/share', async (req, res) => {
  await prisma.doujinEvent.update({
    where: { id: req.params.id },
    data: { shareCode: null },
  });
  res.status(204).send();
});

// shareCode でイベント情報を取得（認証不要）
router.get('/shared/:code', async (req, res) => {
  const event = await prisma.doujinEvent.findUnique({
    where: { shareCode: req.params.code },
  });
  if (!event) {
    res.status(404).json({ error: 'Invalid share code' });
    return;
  }
  res.json(toEvent(event));
});

// shareCode でそのイベントのサークル一覧を取得（認証不要）
router.get('/shared/:code/circles', async (req, res) => {
  const event = await prisma.doujinEvent.findUnique({
    where: { shareCode: req.params.code },
  });
  if (!event) {
    res.status(404).json({ error: 'Invalid share code' });
    return;
  }
  const circles = await prisma.circle.findMany({
    where: { eventId: event.id },
    orderBy: { order: 'asc' },
  });
  const toCircle = (c: any) => ({
    ...c,
    items: undefined,
    event: undefined,
    createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : c.updatedAt,
  });
  res.json(circles.map(toCircle));
});

// shareCode でそのイベントのサークルアイテム一覧を取得（認証不要）
router.get('/shared/:code/circle-items', async (req, res) => {
  const event = await prisma.doujinEvent.findUnique({
    where: { shareCode: req.params.code },
  });
  if (!event) {
    res.status(404).json({ error: 'Invalid share code' });
    return;
  }
  const items = await prisma.circleItem.findMany({
    where: { circle: { eventId: event.id } },
  });
  res.json(items);
});

export default router;
