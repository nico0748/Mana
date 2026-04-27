import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';

const router = Router();

const toCircle = (c: any) => ({
  ...c,
  userId: undefined,
  items: undefined,
  event: undefined,
  createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
  updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : c.updatedAt,
});

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const circles = await prisma.circle.findMany({
    where: { userId: uid },
    orderBy: { order: 'asc' },
  });
  res.json(circles.map(toCircle));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  if (!(await guardLimit(res, req.user!, 'circles'))) return;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const circle = await prisma.circle.create({ data: { ...data, userId: uid } });
  res.status(201).json(toCircle(circle));
});

// Bulk create for CSV import
router.post('/bulk', async (req, res) => {
  const uid = (req as any).uid as string;
  const rows: any[] = req.body;
  if (!(await guardLimit(res, req.user!, 'circles', rows.length))) return;
  const circles = await prisma.$transaction(
    rows.map(({ id, createdAt, updatedAt, userId, ...data }) =>
      prisma.circle.create({ data: { ...data, userId: uid } })
    )
  );
  res.status(201).json(circles.map(toCircle));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const circle = await prisma.circle.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toCircle(circle));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.circle.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
