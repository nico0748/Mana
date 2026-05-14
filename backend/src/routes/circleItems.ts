import { Router } from 'express';
import { prisma } from '../prisma';
import { normalizeFields } from '../lib/text';

const router = Router();

// CircleItem のテキストフィールド。coverUrl は URL なので除外、status 系も列挙値。
const ITEM_TEXT_FIELDS = ['title', 'type'] as const;

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const items = await prisma.circleItem.findMany({
    where: { circle: { userId: uid } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, ...rest } = req.body;
  // Verify circle ownership
  const circle = await prisma.circle.findFirst({
    where: { id: rest.circleId, userId: uid },
  });
  if (!circle) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const data = normalizeFields(rest, ITEM_TEXT_FIELDS);
  const item = await prisma.circleItem.create({ data });
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const item = await prisma.circleItem.findFirst({
    where: { id: req.params.id, circle: { userId: uid } },
  });
  if (!item) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const allowed = [
    'title', 'type', 'price', 'quantity', 'coverUrl',
    'status', 'onlineStatus', 'addedToLibraryBookId',
  ] as const;
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) filtered[key] = req.body[key];
  }
  const data = normalizeFields(filtered, ITEM_TEXT_FIELDS);
  const updated = await prisma.circleItem.update({
    where: { id: req.params.id },
    data,
  });
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.circleItem.delete({
    where: { id: req.params.id, circle: { userId: uid } },
  });
  res.status(204).send();
});

export default router;
