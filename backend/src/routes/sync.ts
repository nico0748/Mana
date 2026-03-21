import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.get('/export', async (_req, res) => {
  const books = await prisma.book.findMany();
  res.json({
    books: books.map(b => ({
      ...b,
      createdAt: b.createdAt.getTime(),
      updatedAt: b.updatedAt.getTime(),
    })),
  });
});

router.post('/import', async (req, res) => {
  const { books } = req.body as { books: any[] };
  let imported = 0;
  for (const book of books) {
    const { createdAt, updatedAt, ...rest } = book;
    await prisma.book.upsert({
      where: { id: book.id },
      update: rest,
      create: rest,
    });
    imported++;
  }
  res.json({ imported });
});

export default router;
