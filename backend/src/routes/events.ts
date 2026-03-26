import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

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
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const event = await prisma.doujinEvent.create({ data: { ...data, userId: uid } });
  res.status(201).json(toEvent(event));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
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
