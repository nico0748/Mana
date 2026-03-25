import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

// Helper: convert Prisma Book to API shape (timestamps as epoch ms)
const toBook = (b: any) => ({
  ...b,
  createdAt: b.createdAt instanceof Date ? b.createdAt.getTime() : b.createdAt,
  updatedAt: b.updatedAt instanceof Date ? b.updatedAt.getTime() : b.updatedAt,
});

router.get('/', async (_req, res) => {
  const books = await prisma.book.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(books.map(toBook));
});

router.post('/', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const book = await prisma.book.create({ data });
  res.status(201).json(toBook(book));
});

router.put('/:id', async (req, res) => {
  const { id, createdAt, updatedAt, ...data } = req.body;
  const book = await prisma.book.update({
    where: { id: req.params.id },
    data,
  });
  res.json(toBook(book));
});

router.delete('/:id', async (req, res) => {
  await prisma.book.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
