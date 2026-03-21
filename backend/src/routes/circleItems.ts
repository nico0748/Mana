import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const items = await prisma.circleItem.findMany();
  res.json(items);
});

router.post('/', async (req, res) => {
  const { id, ...data } = req.body;
  const item = await prisma.circleItem.create({ data });
  res.status(201).json(item);
});

router.delete('/:id', async (req, res) => {
  await prisma.circleItem.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
