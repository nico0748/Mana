import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';

const router = Router();

// 認証ユーザー自身の Book のみ export する。
// (以前は where 句が無く、認証済みなら誰でも全ユーザーの本棚を取得できる
//  権限事故になっていた)
router.get('/export', async (req, res) => {
  const uid = (req as any).uid as string;
  const books = await prisma.book.findMany({ where: { userId: uid } });
  res.json({
    books: books.map(b => ({
      ...b,
      userId: undefined,
      createdAt: b.createdAt.getTime(),
      updatedAt: b.updatedAt.getTime(),
    })),
  });
});

router.post('/import', async (req, res) => {
  const uid = (req as any).uid as string;
  const { books } = req.body as { books: any[] };
  if (!Array.isArray(books)) {
    res.status(400).json({ error: 'books must be an array' });
    return;
  }
  if (!(await guardLimit(res, req.user!, 'books', books.length))) return;

  let imported = 0;
  for (const book of books) {
    // クライアントから来た id / createdAt / updatedAt / userId は一切信用しない。
    // 既存レコードを更新するのは、その id が「自分の所有」だった場合のみ。
    // 他人の id を指定された場合は新規 ID で create にフォールバックする
    // (以前は id だけで upsert していたため、他ユーザーの Book を上書きできた)。
    const { id, createdAt, updatedAt, userId, ...rest } = book;

    const existing = typeof id === 'string'
      ? await prisma.book.findUnique({ where: { id } })
      : null;

    if (existing && existing.userId === uid) {
      await prisma.book.update({
        where: { id: existing.id },
        data: rest,
      });
    } else {
      await prisma.book.create({
        data: { ...rest, userId: uid },
      });
    }
    imported++;
  }
  res.json({ imported });
});

export default router;
