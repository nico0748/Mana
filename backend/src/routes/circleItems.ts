import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const items = await prisma.circleItem.findMany({
    where: { circle: { userId: uid } },
  });
  res.json(items);
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, ...data } = req.body;
  // Verify circle ownership
  const circle = await prisma.circle.findFirst({
    where: { id: data.circleId, userId: uid },
  });
  if (!circle) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const item = await prisma.circleItem.create({ data });
  res.status(201).json(item);
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.circleItem.delete({
    where: { id: req.params.id, circle: { userId: uid } },
  });
  res.status(204).send();
});

export default router;
