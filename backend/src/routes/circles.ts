import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { sanitizeHttpUrl } from '../lib/url';

const router = Router();

const toCircle = (c: any) => ({
  ...c,
  userId: undefined,
  items: undefined,
  event: undefined,
  createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
  updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : c.updatedAt,
});

// xUrl は <a href> に流れ込むため、http(s):// 以外のスキームを撥ねる必須のサーバ側ガード。
// 不正な値（例: javascript:alert(1)）は黙って null に落として保存させる。
function sanitizeCircleInput<T extends Record<string, any>>(data: T): T {
  if ('xUrl' in data && data.xUrl !== undefined && data.xUrl !== null && data.xUrl !== '') {
    const safe = sanitizeHttpUrl(data.xUrl);
    return { ...data, xUrl: safe ?? null };
  }
  return data;
}

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
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = sanitizeCircleInput(rest);
  const circle = await prisma.circle.create({ data: { ...data, userId: uid } });
  res.status(201).json(toCircle(circle));
});

// Bulk create for CSV import
router.post('/bulk', async (req, res) => {
  const uid = (req as any).uid as string;
  const rows: any[] = req.body;
  if (!(await guardLimit(res, req.user!, 'circles', rows.length))) return;
  const circles = await prisma.$transaction(
    rows.map(({ id, createdAt, updatedAt, userId, ...rest }) => {
      const data = sanitizeCircleInput(rest);
      return prisma.circle.create({ data: { ...data, userId: uid } });
    })
  );
  res.status(201).json(circles.map(toCircle));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = sanitizeCircleInput(rest);
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
