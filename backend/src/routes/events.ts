import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toEvent = (e: any) => ({
  ...e,
  circles: undefined,
  createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : e.createdAt,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.getTime() : e.updatedAt,
});

router.get('/', async (_req, res) => {
  const events = await prisma.doujinEvent.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(events.map(toEvent));
});

router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const event = await prisma.doujinEvent.create({ data });
  res.status(201).json(toEvent(event));
});

router.put('/:id', async (req, res) => {
  const { id, createdAt, ...data } = req.body;
  const event = await prisma.doujinEvent.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toEvent(event));
});

router.delete('/:id', async (req, res) => {
  // Cascade: circles and their items are handled by Prisma schema onDelete: Cascade
  await prisma.doujinEvent.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
