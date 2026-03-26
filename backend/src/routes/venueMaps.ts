import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toMap = (m: any) => ({
  ...m,
  userId: undefined,
  createdAt: m.createdAt instanceof Date ? m.createdAt.getTime() : m.createdAt,
  updatedAt: m.updatedAt instanceof Date ? m.updatedAt.getTime() : m.updatedAt,
});

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const maps = await prisma.venueMap.findMany({ where: { userId: uid } });
  res.json(maps.map(toMap));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const map = await prisma.venueMap.create({ data: { ...data, userId: uid } });
  res.status(201).json(toMap(map));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const map = await prisma.venueMap.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toMap(map));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.venueMap.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
