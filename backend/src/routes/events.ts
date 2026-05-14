import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { normalizeFields } from '../lib/text';

const router = Router();

// DoujinEvent のテキストフィールド。budget は数値、date は ISO 文字列のため trim だけ効く。
const EVENT_TEXT_FIELDS = ['name', 'date'] as const;

const toEvent = (e: any) => ({
  ...e,
  userId: undefined,
  circles: undefined,
  createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : e.createdAt,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.getTime() : e.updatedAt,
});

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const events = await prisma.doujinEvent.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'asc' },
  });
  res.json(events.map(toEvent));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  if (!(await guardLimit(res, req.user!, 'events'))) return;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, EVENT_TEXT_FIELDS);
  const event = await prisma.doujinEvent.create({ data: { ...data, userId: uid } });
  res.status(201).json(toEvent(event));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, EVENT_TEXT_FIELDS);
  const event = await prisma.doujinEvent.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toEvent(event));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.doujinEvent.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
