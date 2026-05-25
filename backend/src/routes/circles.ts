import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { sanitizeHttpUrl, sanitizeImageUrl } from '../lib/url';
import { normalizeFields } from '../lib/text';

const router = Router();

// Circle の自由入力テキスト。xUrl / menuImageUrl は URL のため別途 sanitize 系で検証する。
// status は列挙値で除外。
const CIRCLE_TEXT_FIELDS = ['name', 'author', 'hall', 'block', 'number'] as const;

const toCircle = (c: any) => ({
  ...c,
  userId: undefined,
  items: undefined,
  event: undefined,
  createdAt: c.createdAt instanceof Date ? c.createdAt.getTime() : c.createdAt,
  updatedAt: c.updatedAt instanceof Date ? c.updatedAt.getTime() : c.updatedAt,
});

// xUrl は <a href>、menuImageUrl は <img src> / <a href> に流れ込むため、
// スキームを必ずサーバ側で検証する。
// 不正な値（例: javascript:alert(1)）は黙って null に落として保存させる。
function sanitizeCircleInput<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = { ...data };
  if ('xUrl' in out && out.xUrl !== undefined && out.xUrl !== null && out.xUrl !== '') {
    out.xUrl = sanitizeHttpUrl(out.xUrl) ?? null;
  }
  if ('menuImageUrl' in out && out.menuImageUrl !== undefined && out.menuImageUrl !== null && out.menuImageUrl !== '') {
    out.menuImageUrl = sanitizeImageUrl(out.menuImageUrl) ?? null;
  }
  return out as T;
}

// 1 行で「xUrl の安全検証」と「テキストフィールドの NFC 正規化」を順に適用するヘルパ。
// 触るフィールドが互いに重ならないので順序は実質どちらでも良いが、URL の検証を先に
// やってから普通のテキスト正規化、という見通しのよい順番にしておく。
function prepareCircleData<T extends Record<string, any>>(rest: T): T {
  return normalizeFields(sanitizeCircleInput(rest), CIRCLE_TEXT_FIELDS);
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
  const data = prepareCircleData(rest);
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
      const data = prepareCircleData(rest);
      return prisma.circle.create({ data: { ...data, userId: uid } });
    })
  );
  res.status(201).json(circles.map(toCircle));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareCircleData(rest);
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
