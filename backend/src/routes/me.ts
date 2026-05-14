import { Router } from 'express';
import admin from 'firebase-admin';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { effectivePlan, PLAN_LIMITS } from '../lib/plans';
import { stripe } from '../lib/stripe';

const router = Router();

router.get('/', async (req, res) => {
  const user = req.user!;
  const plan = effectivePlan(user);

  const [books, circles, events, distributions, venueMaps] = await Promise.all([
    prisma.book.count({ where: { userId: user.firebaseUid } }),
    prisma.circle.count({ where: { userId: user.firebaseUid } }),
    prisma.doujinEvent.count({ where: { userId: user.firebaseUid } }),
    prisma.distribution.count({ where: { userId: user.firebaseUid } }),
    prisma.venueMap.count({ where: { userId: user.firebaseUid } }),
  ]);

  res.json({
    user: {
      firebaseUid: user.firebaseUid,
      email: user.email,
      role: user.role,
      proOverride: user.proOverride,
      plan,
      planStatus: user.planStatus,
      planInterval: user.planInterval,
      planExpiresAt: user.planExpiresAt?.getTime() ?? null,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      hasStripeCustomer: !!user.stripeCustomerId,
    },
    limits: PLAN_LIMITS[plan],
    usage: { books, circles, events, distributions, venueMaps },
  });
});

// ── DELETE /api/me — 自分のアカウントを完全に削除する ─────────────────────────
//
// 流れ:
// 1. リクエスト body の `confirm` 値が、ユーザー名 (displayName) または email に一致するか確認
// 2. アクティブな Stripe サブスクがあればキャンセル（best-effort、失敗しても続行）
// 3. ユーザーが所有するアプリ内データを 1 トランザクションで削除
//    - CircleItem は Circle に対して Cascade なので、Circle 削除で連動して消える
// 4. Firebase Auth ユーザーを削除（revoke + delete）
// 5. 監査ログ書き込み
//
// 削除の取り消しは不可。
router.delete('/', async (req, res) => {
  const user = req.user!;
  const uid = user.firebaseUid;

  const { confirm } = (req.body ?? {}) as { confirm?: unknown };
  if (typeof confirm !== 'string' || !confirm.trim()) {
    res.status(400).json({ error: 'confirm_required' });
    return;
  }

  // 比較対象は両側とも NFC 正規化する。
  // - 互換文字（半角/全角、合成文字 vs 分解文字、㌀のような互換漢字）でバイト列が一致せず
  //   ユーザーが「正しいユーザー名を入れたのに削除できない」UX バグを防ぐ。
  // - 同時に、悪意ある第三者が U+212A (Kelvin Sign) のような視覚的同一文字を
  //   入力した場合のなりすまし的バイパスを抑止する（このルートは認証必須なので
  //   攻撃面は限定的だが、ハードニングとして揃える）。
  const norm = (s: string) => s.normalize('NFC').trim();
  const typed = norm(confirm);

  // ユーザー名 (displayName) を最優先、未設定なら email を許容する。
  const expectedRaw = user.displayName || user.email || '';
  const expected = norm(expectedRaw);
  if (!expected) {
    // 確認に使える情報が DB にない（極めて稀）。サポート対応で進めてもらう。
    res.status(409).json({ error: 'confirmation_target_missing' });
    return;
  }
  if (typed !== expected) {
    res.status(400).json({ error: 'confirmation_mismatch' });
    return;
  }

  // ── (1) Stripe サブスクをキャンセル（失敗してもアカウント削除は進める）
  if (stripe && user.stripeSubscriptionId) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      console.warn('[self-delete] stripe cancel failed (continuing)', err);
    }
  }

  // ── (2) ユーザー所有データを削除 ──
  await prisma.$transaction(async tx => {
    // Circle 削除で CircleItem が Cascade で消える
    await tx.circle.deleteMany({ where: { userId: uid } });
    await tx.doujinEvent.deleteMany({ where: { userId: uid } });
    await tx.book.deleteMany({ where: { userId: uid } });
    await tx.venueMap.deleteMany({ where: { userId: uid } });
    await tx.distribution.deleteMany({ where: { userId: uid } });
    await tx.user.delete({ where: { firebaseUid: uid } });

    // 監査ログには「自己削除」を残す。actorUid は削除済みになるが、文字列フィールドなので問題なし。
    await tx.adminAuditLog.create({
      data: {
        actorUid: uid,
        action: 'self_delete',
        targetUid: uid,
        before: Prisma.JsonNull,
        after: Prisma.JsonNull,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      },
    });
  });

  // ── (3) Firebase Auth ユーザーを削除 ──
  try {
    // 既存 ID トークンも併せて無効化
    await admin.auth().revokeRefreshTokens(uid);
    await admin.auth().deleteUser(uid);
  } catch (err) {
    // Firebase 側の削除に失敗してもアプリ側のデータは消えているので 200 を返すが、ログには残す。
    console.error('[self-delete] firebase delete failed (data already removed)', err);
  }

  res.status(204).send();
});

export default router;
