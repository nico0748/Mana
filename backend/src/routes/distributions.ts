import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { normalizeFields } from '../lib/text';

const router = Router();

const DIST_TEXT_FIELDS = ['title'] as const;

const toDist = (d: any) => ({
  ...d,
  userId: undefined,
  createdAt: d.createdAt instanceof Date ? d.createdAt.getTime() : d.createdAt,
  updatedAt: d.updatedAt instanceof Date ? d.updatedAt.getTime() : d.updatedAt,
});

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const dists = await prisma.distribution.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  });
  res.json(dists.map(toDist));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  if (!(await guardLimit(res, req.user!, 'distributions'))) return;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, DIST_TEXT_FIELDS);
  const dist = await prisma.distribution.create({ data: { ...data, userId: uid } });
  res.status(201).json(toDist(dist));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, DIST_TEXT_FIELDS);
  const dist = await prisma.distribution.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toDist(dist));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.distribution.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
