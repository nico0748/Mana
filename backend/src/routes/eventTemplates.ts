import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected']);

interface SnapshotMap {
  hall: string;
  imageDataUrl: string;
  generatedSvg: string | null;
}

interface SnapshotCircle {
  name: string;
  author: string;
  hall: string;
  block: string;
  number: string;
  order: number;
  xUrl: string | null;
  menuImageUrl: string | null;
  mapX: number | null;
  mapY: number | null;
}

const isSnapshotMaps = (v: unknown): v is SnapshotMap[] =>
  Array.isArray(v) && v.every(m => m && typeof m === 'object' && typeof (m as any).hall === 'string');

const isSnapshotCircles = (v: unknown): v is SnapshotCircle[] =>
  Array.isArray(v) && v.every(c => c && typeof c === 'object' && typeof (c as any).name === 'string');

const summarize = (t: any) => {
  const maps: SnapshotMap[] = isSnapshotMaps(t.venueMaps) ? t.venueMaps : [];
  const circles: SnapshotCircle[] = isSnapshotCircles(t.circles) ? t.circles : [];
  return {
    id: t.id,
    name: t.name,
    date: t.date,
    halls: maps.map(m => m.hall),
    hallCount: maps.length,
    circleCount: circles.length,
    createdAt: t.createdAt instanceof Date ? t.createdAt.getTime() : t.createdAt,
  };
};

const detail = (t: any) => {
  const maps: SnapshotMap[] = isSnapshotMaps(t.venueMaps) ? t.venueMaps : [];
  const circles: SnapshotCircle[] = isSnapshotCircles(t.circles) ? t.circles : [];
  return {
    id: t.id,
    name: t.name,
    date: t.date,
    venueMaps: maps,
    circles,
    hallCount: maps.length,
    circleCount: circles.length,
    createdAt: t.createdAt instanceof Date ? t.createdAt.getTime() : t.createdAt,
  };
};

const adminView = (t: any) => ({
  ...detail(t),
  status: t.status,
  submittedByUid: t.submittedByUid,
  sourceEventId: t.sourceEventId ?? null,
  reviewedByUid: t.reviewedByUid ?? null,
  reviewedAt: t.reviewedAt instanceof Date ? t.reviewedAt.getTime() : (t.reviewedAt ?? null),
  rejectionReason: t.rejectionReason ?? null,
  updatedAt: t.updatedAt instanceof Date ? t.updatedAt.getTime() : t.updatedAt,
});

// ── 公開: 認証不要（/templates ページから取得） ──────────────────────────────
export const publicEventTemplatesRouter = Router();

publicEventTemplatesRouter.get('/', async (_req, res) => {
  const items = await prisma.eventTemplate.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items.map(summarize));
});

publicEventTemplatesRouter.get('/:id', async (req, res) => {
  const item = await prisma.eventTemplate.findFirst({
    where: { id: req.params.id, status: 'approved' },
  });
  if (!item) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.json(detail(item));
});

// ── ログインユーザー: 申請 + 自分の申請一覧 ────────────────────────────────
export const userEventTemplatesRouter = Router();

userEventTemplatesRouter.get('/mine', async (req, res) => {
  const uid = (req as any).uid as string;
  const items = await prisma.eventTemplate.findMany({
    where: { submittedByUid: uid },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items.map(adminView));
});

userEventTemplatesRouter.post('/', async (req, res) => {
  const uid = (req as any).uid as string;
  const { eventId } = req.body ?? {};
  if (typeof eventId !== 'string' || !eventId) {
    res.status(400).json({ error: 'eventId_required' });
    return;
  }

  // 元イベントは申請者のものに限定
  const event = await prisma.doujinEvent.findFirst({
    where: { id: eventId, userId: uid },
  });
  if (!event) {
    res.status(404).json({ error: 'event_not_found' });
    return;
  }

  // 既に同イベントの pending 申請がある場合は重複作成しない
  const existingPending = await prisma.eventTemplate.findFirst({
    where: { submittedByUid: uid, sourceEventId: event.id, status: 'pending' },
  });
  if (existingPending) {
    res.status(409).json({ error: 'already_pending' });
    return;
  }

  // 申請者所有のホールマップをスナップショット
  const venueMaps = await prisma.venueMap.findMany({
    where: { eventId, userId: uid },
    orderBy: { hall: 'asc' },
  });
  const mapSnapshot: SnapshotMap[] = venueMaps.map(m => ({
    hall: m.hall,
    imageDataUrl: m.imageDataUrl,
    generatedSvg: m.generatedSvg ?? null,
  }));

  // サークル情報をスナップショット（status / 紐づくアイテムは含めない）。
  // インポート時はユーザーが「サークルも含める」を選んだときだけ実体化される。
  const circles = await prisma.circle.findMany({
    where: { eventId, userId: uid },
    orderBy: { order: 'asc' },
  });
  const circleSnapshot: SnapshotCircle[] = circles.map(c => ({
    name: c.name,
    author: c.author,
    hall: c.hall,
    block: c.block,
    number: c.number,
    order: c.order,
    xUrl: c.xUrl ?? null,
    menuImageUrl: c.menuImageUrl ?? null,
    mapX: c.mapX ?? null,
    mapY: c.mapY ?? null,
  }));

  const created = await prisma.eventTemplate.create({
    data: {
      name: event.name,
      date: event.date,
      venueMaps: mapSnapshot as unknown as Prisma.InputJsonValue,
      circles: circleSnapshot as unknown as Prisma.InputJsonValue,
      submittedByUid: uid,
      sourceEventId: event.id,
      status: 'pending',
    },
  });
  res.status(201).json(adminView(created));
});

// ── 管理者: 一覧 + 承認/却下/削除 ──────────────────────────────────────────
export const adminEventTemplatesRouter = Router();

adminEventTemplatesRouter.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' && ALLOWED_STATUSES.has(req.query.status)
    ? req.query.status
    : undefined;
  const items = await prisma.eventTemplate.findMany({
    where: status ? { status } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(items.map(adminView));
});

adminEventTemplatesRouter.patch('/:id', async (req, res) => {
  const uid = (req as any).uid as string;
  const { status, rejectionReason } = req.body ?? {};
  if (typeof status !== 'string' || !ALLOWED_STATUSES.has(status)) {
    res.status(400).json({ error: 'invalid_status' });
    return;
  }
  const reason =
    status === 'rejected' && typeof rejectionReason === 'string' && rejectionReason.trim().length > 0
      ? rejectionReason.trim()
      : null;
  try {
    const updated = await prisma.eventTemplate.update({
      where: { id: req.params.id },
      data: {
        status,
        reviewedByUid: uid,
        reviewedAt: new Date(),
        rejectionReason: reason,
      },
    });
    res.json(adminView(updated));
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});

adminEventTemplatesRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.eventTemplate.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});
