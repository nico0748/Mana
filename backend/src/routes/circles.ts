import { Router, type Response } from 'express';
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

// name 以外は UI 上も任意入力。normalizeText は「空文字は未入力」とみなして null を
// 返すが、Circle のこれらの列は Prisma 側で NOT NULL なので、空欄で送られてくると
// create/update が検証エラー（500）になる。正規化後に null へ落ちた分を空文字へ戻す。
// name はここに含めない。空文字に均してしまうと NOT NULL をすり抜けて
// 名無しのサークルが保存できてしまうため、下の requireName で 400 にする。
const CIRCLE_OPTIONAL_TEXT_FIELDS = ['author', 'hall', 'block', 'number'] as const;

function coerceOptionalText<T extends Record<string, any>>(data: T): T {
  const out: Record<string, any> = { ...data };
  for (const field of CIRCLE_OPTIONAL_TEXT_FIELDS) {
    if (field in out && out[field] === null) out[field] = '';
  }
  return out as T;
}

/**
 * サークル名の必須チェック。正規化後に null（= 空欄や空白のみ）なら 400 を返す。
 * PUT は部分更新なので、name を送ってきたときだけ検証する。
 * 検証に通らなければ res を送信済みにして false を返す。
 */
function requireName(data: Record<string, any>, res: Response, opts: { partial: boolean }): boolean {
  if (opts.partial && !('name' in data)) return true;
  if (typeof data.name === 'string' && data.name.length > 0) return true;
  res.status(400).json({ error: 'name_required' });
  return false;
}

// 1 行で「xUrl の安全検証」と「テキストフィールドの NFC 正規化」を順に適用するヘルパ。
// 触るフィールドが互いに重ならないので順序は実質どちらでも良いが、URL の検証を先に
// やってから普通のテキスト正規化、という見通しのよい順番にしておく。
function prepareCircleData<T extends Record<string, any>>(rest: T): T {
  return coerceOptionalText(normalizeFields(sanitizeCircleInput(rest), CIRCLE_TEXT_FIELDS));
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
  if (!requireName(data, res, { partial: false })) return;
  const circle = await prisma.circle.create({ data: { ...data, userId: uid } });
  res.status(201).json(toCircle(circle));
});

// Bulk create for CSV import
router.post('/bulk', async (req, res) => {
  const uid = (req as any).uid as string;
  const rows: any[] = req.body;
  if (!(await guardLimit(res, req.user!, 'circles', rows.length))) return;

  // 1 行でも名前が空なら取り込み全体を止める。名無しのサークルが混ざると
  // 買い物リスト上で識別できなくなるため、部分的に通すより差し戻す方がよい。
  const prepared = rows.map(({ id, createdAt, updatedAt, userId, ...rest }) => prepareCircleData(rest));
  const blankAt = prepared.findIndex(d => typeof d.name !== 'string' || d.name.length === 0);
  if (blankAt >= 0) {
    res.status(400).json({ error: 'name_required', row: blankAt });
    return;
  }

  const circles = await prisma.$transaction(
    prepared.map(data => prisma.circle.create({ data: { ...data, userId: uid } }))
  );
  res.status(201).json(circles.map(toCircle));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareCircleData(rest);
  if (!requireName(data, res, { partial: true })) return;
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
