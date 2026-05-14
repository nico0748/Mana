import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { normalizeFields } from '../lib/text';

const router = Router();

// imageDataUrl は Base64 / generatedSvg は SVG 本文のため正規化しない。
// hall（"東1" 等）のみ trim+NFC で揃える。
const MAP_TEXT_FIELDS = ['hall'] as const;

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
  if (!(await guardLimit(res, req.user!, 'venueMaps'))) return;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, MAP_TEXT_FIELDS);
  const map = await prisma.venueMap.create({ data: { ...data, userId: uid } });
  res.status(201).json(toMap(map));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = normalizeFields(rest, MAP_TEXT_FIELDS);
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
