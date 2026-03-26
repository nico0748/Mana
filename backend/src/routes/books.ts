import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

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
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
  const book = await prisma.book.create({ data: { ...data, userId: uid } });
  res.status(201).json(toBook(book));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...data } = req.body;
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
