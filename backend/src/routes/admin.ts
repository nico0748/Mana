import { Router, type Request } from 'express';
import admin from 'firebase-admin';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { effectivePlan } from '../lib/plans';
import { isInitialAdmin } from '../middleware/auth';

const router = Router();

const ALLOWED_ROLES = new Set(['user', 'admin']);

async function writeAudit(
  req: Request,
  action: string,
  targetUid: string | null,
  before: unknown,
  after: unknown,
) {
  await prisma.adminAuditLog.create({
    data: {
      actorUid: req.user!.firebaseUid,
      action,
      targetUid,
      before: (before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      after: (after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      ip: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    },
  });
}

const toUserView = (u: {
  firebaseUid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  proOverride: boolean;
  plan: string;
  planStatus: string;
  planExpiresAt: Date | null;
  createdAt: Date;
}) => ({
  firebaseUid: u.firebaseUid,
  email: u.email,
  displayName: u.displayName,
  role: u.role,
  proOverride: u.proOverride,
  effectivePlan: effectivePlan(u),
  planStatus: u.planStatus,
  planExpiresAt: u.planExpiresAt?.getTime() ?? null,
  isInitialAdmin: isInitialAdmin(u.firebaseUid),
  createdAt: u.createdAt.getTime(),
});

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const [totalUsers, adminCount, proOverrideCount, paidProCount, recentLogs] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'admin' } }),
    prisma.user.count({ where: { proOverride: true } }),
    prisma.user.count({
      where: {
        plan: 'pro',
        OR: [
          { planStatus: 'active' },
          { planStatus: 'trialing' },
          { planExpiresAt: { gt: new Date() } },
        ],
      },
    }),
    prisma.adminAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  res.json({
    totalUsers,
    adminCount,
    proOverrideCount,
    paidProCount,
    recentAuditLog: recentLogs.map((l) => ({
      id: l.id,
      actorUid: l.actorUid,
      action: l.action,
      targetUid: l.targetUid,
      before: l.before,
      after: l.after,
      createdAt: l.createdAt.getTime(),
    })),
  });
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10) || 50, 200);
  const cursor = req.query.cursor as string | undefined;

  const where: Prisma.UserWhereInput | undefined = q
    ? {
        OR: [
          { firebaseUid: { contains: q } },
          { email: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      }
    : undefined;

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { firebaseUid: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { firebaseUid: cursor }, skip: 1 } : {}),
  });

  const hasMore = users.length > limit;
  const items = (hasMore ? users.slice(0, limit) : users).map(toUserView);

  res.json({
    users: items,
    nextCursor: hasMore ? items[items.length - 1]?.firebaseUid ?? null : null,
  });
});

// ── PATCH /api/admin/users/:uid ──────────────────────────────────────────────
router.patch('/users/:uid', async (req, res) => {
  const targetUid = req.params.uid;
  const actorUid = req.user!.firebaseUid;
  const { role, proOverride } = req.body ?? {};

  const data: Prisma.UserUpdateInput = {};

  if (role !== undefined) {
    if (typeof role !== 'string' || !ALLOWED_ROLES.has(role)) {
      res.status(400).json({ error: 'invalid_role' });
      return;
    }
    if (targetUid === actorUid && role !== 'admin') {
      res.status(400).json({ error: 'cannot_demote_self' });
      return;
    }
    if (isInitialAdmin(targetUid) && role !== 'admin') {
      res.status(400).json({ error: 'cannot_modify_env_admin' });
      return;
    }
    data.role = role;
  }

  if (proOverride !== undefined) {
    if (typeof proOverride !== 'boolean') {
      res.status(400).json({ error: 'invalid_proOverride' });
      return;
    }
    if (isInitialAdmin(targetUid) && proOverride === false) {
      res.status(400).json({ error: 'cannot_modify_env_admin' });
      return;
    }
    data.proOverride = proOverride;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'no_changes' });
    return;
  }

  const before = await prisma.user.findUnique({ where: { firebaseUid: targetUid } });
  if (!before) {
    res.status(404).json({ error: 'not_found' });
    return;
  }

  const updated = await prisma.user.update({
    where: { firebaseUid: targetUid },
    data,
  });

  await writeAudit(
    req,
    'user.update',
    targetUid,
    { role: before.role, proOverride: before.proOverride },
    { role: updated.role, proOverride: updated.proOverride },
  );

  res.json(toUserView(updated));
});

// ── POST /api/admin/sync-firebase ────────────────────────────────────────────
router.post('/sync-firebase', async (req, res) => {
  const startedAt = Date.now();
  let created = 0;
  let updated = 0;
  let total = 0;
  let pageToken: string | undefined;

  try {
    do {
      const result = await admin.auth().listUsers(1000, pageToken);
      for (const u of result.users) {
        const existing = await prisma.user.findUnique({
          where: { firebaseUid: u.uid },
          select: { firebaseUid: true },
        });
        await prisma.user.upsert({
          where: { firebaseUid: u.uid },
          create: {
            firebaseUid: u.uid,
            email: u.email ?? null,
            displayName: u.displayName ?? null,
          },
          update: {
            email: u.email ?? null,
            displayName: u.displayName ?? null,
          },
        });
        if (existing) updated++;
        else created++;
        total++;
      }
      pageToken = result.pageToken;
    } while (pageToken);

    const duration = Date.now() - startedAt;

    await writeAudit(
      req,
      'sync_firebase',
      null,
      null,
      { created, updated, total, durationMs: duration },
    );

    res.json({ created, updated, total, durationMs: duration });
  } catch (err) {
    console.error('[sync-firebase] failed', err);
    res.status(500).json({ error: 'sync_failed', message: String(err) });
  }
});

// ── GET /api/admin/audit-log ─────────────────────────────────────────────────
router.get('/audit-log', async (req, res) => {
  const limit = Math.min(parseInt((req.query.limit as string) ?? '50', 10) || 50, 200);
  const cursor = req.query.cursor as string | undefined;

  const logs = await prisma.adminAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = logs.length > limit;
  const items = (hasMore ? logs.slice(0, limit) : logs).map((l) => ({
    id: l.id,
    actorUid: l.actorUid,
    action: l.action,
    targetUid: l.targetUid,
    before: l.before,
    after: l.after,
    ip: l.ip,
    createdAt: l.createdAt.getTime(),
  }));

  res.json({
    logs: items,
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null,
  });
});

export default router;
