import { Router } from 'express';
import { prisma } from '../prisma';

const MAX_QUESTION_LEN = 200;
const MAX_ANSWER_LEN = 5000;

const toFaq = (f: any) => ({
  id: f.id,
  question: f.question,
  answer: f.answer,
  order: f.order,
  createdAt: f.createdAt instanceof Date ? f.createdAt.getTime() : f.createdAt,
  updatedAt: f.updatedAt instanceof Date ? f.updatedAt.getTime() : f.updatedAt,
});

interface ParsedFaq {
  question?: string;
  answer?: string;
  order?: number;
}

function parseInput(
  raw: any,
  options: { partial: boolean },
): { ok: true; data: ParsedFaq } | { ok: false; error: string } {
  if (raw == null || typeof raw !== 'object') return { ok: false, error: 'invalid_body' };
  const data: ParsedFaq = {};

  if (raw.question !== undefined) {
    if (typeof raw.question !== 'string' || !raw.question.trim()) return { ok: false, error: 'question_required' };
    if (raw.question.length > MAX_QUESTION_LEN) return { ok: false, error: 'question_too_long' };
    data.question = raw.question.trim();
  } else if (!options.partial) {
    return { ok: false, error: 'question_required' };
  }

  if (raw.answer !== undefined) {
    if (typeof raw.answer !== 'string' || !raw.answer.trim()) return { ok: false, error: 'answer_required' };
    if (raw.answer.length > MAX_ANSWER_LEN) return { ok: false, error: 'answer_too_long' };
    data.answer = raw.answer;
  } else if (!options.partial) {
    return { ok: false, error: 'answer_required' };
  }

  if (raw.order !== undefined && raw.order !== null) {
    const n = typeof raw.order === 'number' ? raw.order : Number(raw.order);
    if (!Number.isFinite(n) || !Number.isInteger(n)) return { ok: false, error: 'invalid_order' };
    data.order = n;
  }

  return { ok: true, data };
}

// ── 公開: 認証不要 (/about の FAQ セクションから取得) ────────────────────────
export const publicFaqsRouter = Router();

publicFaqsRouter.get('/', async (_req, res) => {
  const items = await prisma.faq.findMany({
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(items.map(toFaq));
});

// ── 管理者用 ────────────────────────────────────────────────────────────────
export const adminFaqsRouter = Router();

adminFaqsRouter.post('/', async (req, res) => {
  const result = parseInput(req.body, { partial: false });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  // order が省略された場合は末尾（既存の最大 order + 1）に追加。
  let order = result.data.order;
  if (order === undefined) {
    const last = await prisma.faq.findFirst({ orderBy: { order: 'desc' }, select: { order: true } });
    order = (last?.order ?? 0) + 1;
  }
  const created = await prisma.faq.create({
    data: {
      question: result.data.question!,
      answer: result.data.answer!,
      order,
    },
  });
  res.status(201).json(toFaq(created));
});

adminFaqsRouter.patch('/:id', async (req, res) => {
  const result = parseInput(req.body, { partial: true });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  if (Object.keys(result.data).length === 0) {
    res.status(400).json({ error: 'no_fields_to_update' });
    return;
  }
  try {
    const updated = await prisma.faq.update({
      where: { id: req.params.id },
      data: result.data,
    });
    res.json(toFaq(updated));
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});

adminFaqsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.faq.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});
