import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toMap = (m: any) => ({
  ...m,
  createdAt: m.createdAt instanceof Date ? m.createdAt.getTime() : m.createdAt,
  updatedAt: m.updatedAt instanceof Date ? m.updatedAt.getTime() : m.updatedAt,
});

router.get('/', async (_req, res) => {
  const maps = await prisma.venueMap.findMany();
  res.json(maps.map(toMap));
});

router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const map = await prisma.venueMap.create({ data });
  res.status(201).json(toMap(map));
});

router.put('/:id', async (req, res) => {
  const { id, createdAt, ...data } = req.body;
  const map = await prisma.venueMap.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toMap(map));
});

router.delete('/:id', async (req, res) => {
  await prisma.venueMap.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
