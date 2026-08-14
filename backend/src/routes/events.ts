import { Router } from 'express';
import { prisma } from '../prisma';
import { guardLimit } from '../lib/enforceLimit';
import { normalizeFields } from '../lib/text';
import { normalizeColorLabels } from '../lib/circleColors';

const router = Router();

// DoujinEvent のテキストフィールド。budget は数値、date は ISO 文字列のため trim だけ効く。
const EVENT_TEXT_FIELDS = ['name', 'date'] as const;

const toEvent = (e: any) => ({
  ...e,
  userId: undefined,
  circles: undefined,
  createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : e.createdAt,
  updatedAt: e.updatedAt instanceof Date ? e.updatedAt.getTime() : e.updatedAt,
});

// colorLabels はユーザー入力の Json。未知の色キーや空ラベルを持ち込ませないよう
// 保存前に正規化する。キーを送ってこなければ触らない（部分更新を壊さないため）。
function prepareEventData<T extends Record<string, any>>(rest: T): T {
  const data = normalizeFields(rest, EVENT_TEXT_FIELDS);
  if (!('colorLabels' in data)) return data;
  const out: Record<string, any> = { ...data };
  const labels = normalizeColorLabels(out.colorLabels);
  // 空になったら列ごと null にして「ラベル未設定」と同じ状態に揃える
  out.colorLabels = labels && Object.keys(labels).length > 0 ? labels : null;
  return out as T;
}

router.get('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const events = await prisma.doujinEvent.findMany({
    where: { userId: uid },
    // 手動並べ替え済みのものを先頭に。order 未設定（= 自動ソート対象）は末尾にまとめ、
    // 並び順の最終的な決定はクライアント側（開催日 / 名前 / 登録順）に委ねる。
    orderBy: [{ order: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
  });
  res.json(events.map(toEvent));
});

router.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  if (!(await guardLimit(res, req.user!, 'events'))) return;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareEventData(rest);
  const event = await prisma.doujinEvent.create({ data: { ...data, userId: uid } });
  res.status(201).json(toEvent(event));
});

// 手動並べ替えの一括保存。ids の並び順をそのまま order に割り当てる。
// `/:id` より先に定義しないと id = "reorder" として解釈されてしまう。
router.put('/reorder', async (req, res) => {
  const uid = (req as any).uid as string;
  const { ids } = req.body ?? {};

  if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) {
    return res.status(400).json({ error: 'ids must be an array of strings' });
  }
  if (new Set(ids).size !== ids.length) {
    return res.status(400).json({ error: 'ids must be unique' });
  }

  // updateMany に userId を含めることで、他ユーザーの即売会は 0 件更新となり書き換わらない。
  await prisma.$transaction(
    ids.map((id: string, index: number) =>
      prisma.doujinEvent.updateMany({
        where: { id, userId: uid },
        data: { order: index },
      })
    )
  );

  const events = await prisma.doujinEvent.findMany({
    where: { userId: uid },
    orderBy: [{ order: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
  });
  res.json(events.map(toEvent));
});

// 手動並べ替えの解除。全件の order を null に戻し、自動ソートへフォールバックさせる。
router.put('/reorder/reset', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.doujinEvent.updateMany({ where: { userId: uid }, data: { order: null } });
  const events = await prisma.doujinEvent.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'asc' },
  });
  res.json(events.map(toEvent));
});

router.put('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { id, createdAt, updatedAt, userId, ...rest } = req.body;
  const data = prepareEventData(rest);
  const event = await prisma.doujinEvent.update({
    where: { id: req.params.id, userId: uid },
    data,
  });
  res.json(toEvent(event));
});

router.delete('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  await prisma.doujinEvent.delete({ where: { id: req.params.id, userId: uid } });
  res.status(204).send();
});

export default router;
