import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toDist = (d: any) => ({
  ...d,
  createdAt: d.createdAt instanceof Date ? d.createdAt.getTime() : d.createdAt,
  updatedAt: d.updatedAt instanceof Date ? d.updatedAt.getTime() : d.updatedAt,
});

router.get('/', async (_req, res) => {
  const dists = await prisma.distribution.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(dists.map(toDist));
});

router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const dist = await prisma.distribution.create({ data });
  res.status(201).json(toDist(dist));
});

router.put('/:id', async (req, res) => {
  const { id, createdAt, ...data } = req.body;
  const dist = await prisma.distribution.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toDist(dist));
});

router.delete('/:id', async (req, res) => {
  await prisma.distribution.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
