import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toCircle = (c: any) => ({
  ...c,
  items: undefined,
  event: undefined,
  createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
  updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : c.updatedAt,
});

router.get('/', async (_req, res) => {
  const circles = await prisma.circle.findMany({ orderBy: { order: 'asc' } });
  res.json(circles.map(toCircle));
});

router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const circle = await prisma.circle.create({ data });
  res.status(201).json(toCircle(circle));
});

// Bulk create for CSV import
router.post('/bulk', async (req, res) => {
  const rows: any[] = req.body;
  const circles = await prisma.$transaction(
    rows.map(({ id, createdAt, updatedAt, ...data }) =>
      prisma.circle.create({ data })
    )
  );
  res.status(201).json(circles.map(toCircle));
});

router.put('/:id', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const circle = await prisma.circle.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toCircle(circle));
});

router.delete('/:id', async (req, res) => {
  await prisma.circle.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
