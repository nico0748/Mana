import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { normalizeFields } from '../lib/text';
import { sanitizeImageUrl } from '../lib/url';

const router = Router();

// Book の自由入力テキストフィールド。coverUrl / type / status はそれぞれ
// URL / 列挙値のため正規化すると壊れるので含めない。
const BOOK_TEXT_FIELDS = [
  'title', 'author', 'isbn', 'category', 'ndcCode',
  'memo', 'circleName', 'series', 'genre', 'tags',
] as const;

// coverUrl は <img src> / <a href> 双方に流れ込みうるため、保存前に必ず
// スキーム検証を通す（http(s) と data:image/* のみ許可）。
function prepareBookData<T extends Record<string, any>>(rest: T): T {
  const out = normalizeFields(rest, BOOK_TEXT_FIELDS);
  if ('coverUrl' in out && out.coverUrl !== undefined && out.coverUrl !== null && out.coverUrl !== '') {
    (out as any).coverUrl = sanitizeImageUrl(out.coverUrl) ?? null;
  }
  return out;
}

const toBook = (b: any) => ({
  ...b,
  userId: undefined,
  createdAt: b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt,
  updatedAt: b.updatedAt instanceof Date ? b.updatedAt.getTime() : b.updatedAt,
});

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const books = await prisma.book.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  });
  res.json(books.map(toBook));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  if (!(await guardLimit(res, req.user!, 'books'))) return;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareBookData(rest);
  const book = await prisma.book.create({ data: { ...data, userId: uid } });
  res.status(201).json(toBook(book));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareBookData(rest);
  const book = await prisma.book.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toBook(book));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.book.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
