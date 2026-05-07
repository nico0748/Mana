import { Router } from 'express';
import { prisma } from '../prisma';

const ALLOWED_CATEGORIES = new Set(['feature', 'fix', 'event', 'info']);
const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 20000;

const toAnnouncement = (a: any) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  imageUrl: a.imageUrl ?? null,
  category: a.category,
  createdAt: a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt,
  updatedAt: a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt,
});

// 公開: ログイン不要で閲覧可能
export const publicAnnouncementsRouter = Router();

publicAnnouncementsRouter.get('/', async (_req, res) => {
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(items.map(toAnnouncement));
});

// 管理者用: 認証 + admin ロール必須（mount 元の admin ルーターで保証される想定）
export const adminAnnouncementsRouter = Router();

adminAnnouncementsRouter.post('/', async (req, res) => {
  const { title, body, imageUrl, category } = req.body ?? {};
  if (typeof title !== 'string' || !title.trim()) {
    res.status(400).json({ error: 'title_required' });
    return;
  }
  if (typeof body !== 'string' || !body.trim()) {
    res.status(400).json({ error: 'body_required' });
    return;
  }
  if (title.length > MAX_TITLE_LEN) {
    res.status(400).json({ error: 'title_too_long' });
    return;
  }
  if (body.length > MAX_BODY_LEN) {
    res.status(400).json({ error: 'body_too_long' });
    return;
  }
  const cat = typeof category === 'string' && ALLOWED_CATEGORIES.has(category) ? category : 'info';
  const img = typeof imageUrl === 'string' && imageUrl.length > 0 ? imageUrl : null;

  const created = await prisma.announcement.create({
    data: { title: title.trim(), body, imageUrl: img, category: cat },
  });
  res.status(201).json(toAnnouncement(created));
});

adminAnnouncementsRouter.delete('/:id', async (req, res) => {
  await prisma.announcement.delete({ where: { id: req.params.id } });
  res.status(204).send();
});
