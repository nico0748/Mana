import { Router } from 'express';
import { prisma } from '../prisma';

const ALLOWED_CATEGORIES = new Set(['feature', 'fix', 'event', 'info']);
const MAX_TITLE_LEN = 200;
const MAX_BODY_LEN = 20000;

const toAnnouncement = (a: any) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  imageUrl: a.imageUrl ?? null,
  category: a.category,
  createdAt: a.createdAt instanceof Date ? a.createdAt.getTime() : a.createdAt,
  updatedAt: a.updatedAt instanceof Date ? a.updatedAt.getTime() : a.updatedAt,
});

// 公開: ログイン不要で閲覧可能
export const publicAnnouncementsRouter = Router();

publicAnnouncementsRouter.get('/', async (_req, res) => {
  const items = await prisma.announcement.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(items.map(toAnnouncement));
});

// 管理者用: 認証 + admin ロール必須（mount 元の admin ルーターで保証される想定）
export const adminAnnouncementsRouter = Router();

interface ParsedAnnouncement {
  title?: string;
  body?: string;
  imageUrl?: string | null;
  category?: string;
  createdAt?: Date;
}

// body をバリデートして Prisma 用データに整形する。
// partial=true (PATCH) のときは未指定フィールドを許容する。
function parseInput(
  raw: any,
  options: { partial: boolean },
): { ok: true; data: ParsedAnnouncement } | { ok: false; error: string } {
  if (raw == null || typeof raw !== 'object') return { ok: false, error: 'invalid_body' };
  const data: ParsedAnnouncement = {};

  if (raw.title !== undefined) {
    if (typeof raw.title !== 'string' || !raw.title.trim()) return { ok: false, error: 'title_required' };
    if (raw.title.length > MAX_TITLE_LEN) return { ok: false, error: 'title_too_long' };
    data.title = raw.title.trim();
  } else if (!options.partial) {
    return { ok: false, error: 'title_required' };
  }

  if (raw.body !== undefined) {
    if (typeof raw.body !== 'string' || !raw.body.trim()) return { ok: false, error: 'body_required' };
    if (raw.body.length > MAX_BODY_LEN) return { ok: false, error: 'body_too_long' };
    data.body = raw.body;
  } else if (!options.partial) {
    return { ok: false, error: 'body_required' };
  }

  // imageUrl: string=設定, null=クリア, undefined=変更しない
  if (raw.imageUrl !== undefined) {
    if (raw.imageUrl === null) {
      data.imageUrl = null;
    } else if (typeof raw.imageUrl === 'string') {
      data.imageUrl = raw.imageUrl.length > 0 ? raw.imageUrl : null;
    } else {
      return { ok: false, error: 'invalid_image' };
    }
  }

  if (raw.category !== undefined) {
    if (typeof raw.category !== 'string' || !ALLOWED_CATEGORIES.has(raw.category)) {
      return { ok: false, error: 'invalid_category' };
    }
    data.category = raw.category;
  }

  // createdAt: epoch ms (number) を受け取り Date に変換する。
  // 投稿日時を編集する／投稿時に過去日付を設定するためのフィールド。
  if (raw.createdAt !== undefined && raw.createdAt !== null) {
    const ms = typeof raw.createdAt === 'number' ? raw.createdAt : Number(raw.createdAt);
    if (!Number.isFinite(ms)) return { ok: false, error: 'invalid_created_at' };
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return { ok: false, error: 'invalid_created_at' };
    data.createdAt = d;
  }

  return { ok: true, data };
}

adminAnnouncementsRouter.post('/', async (req, res) => {
  const result = parseInput(req.body, { partial: false });
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  const { title, body, imageUrl, category, createdAt } = result.data;
  const created = await prisma.announcement.create({
    data: {
      title: title!,
      body: body!,
      imageUrl: imageUrl ?? null,
      category: category ?? 'info',
      ...(createdAt ? { createdAt } : {}),
    },
  });
  res.status(201).json(toAnnouncement(created));
});

adminAnnouncementsRouter.patch('/:id', async (req, res) => {
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
    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: result.data,
    });
    res.json(toAnnouncement(updated));
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});

adminAnnouncementsRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err: any) {
    if (err?.code === 'P2025') {
      res.status(404).json({ error: 'not_found' });
      return;
    }
    throw err;
  }
});
