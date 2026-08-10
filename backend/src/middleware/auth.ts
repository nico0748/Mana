import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';
import type { User } from '@prisma/client';
import { prisma } from '../prisma';

declare global {
  namespace Express {
    interface Request {
      uid?: string;
      user?: User;
      /** どの資格情報で認証されたか。API キーには管理者権限を与えないための判別に使う */
      authMethod?: 'firebase' | 'apiKey';
    }
  }
}

export const API_KEY_PREFIX = 'mana_sk_';

/** API キーの平文からハッシュを作る。DB には常にこのハッシュだけを保存する */
export function hashApiKey(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex');
}

/** 新しい API キーの平文を生成する。照合はハッシュの完全一致で行うので推測困難であればよい */
export function generateApiKey(): string {
  return API_KEY_PREFIX + crypto.randomBytes(32).toString('base64url');
}

/** 一覧画面でキーを見分けるための先頭部分 */
export function apiKeyPrefixOf(plaintext: string): string {
  return plaintext.slice(0, API_KEY_PREFIX.length + 6);
}

// lastUsedAt を毎リクエスト更新すると書き込みが増えるので、この間隔を空けて間引く
const LAST_USED_THROTTLE_MS = 60_000;

/**
 * X-API-Key ヘッダーによる認証。
 * ブラウザは Firebase ID トークン（有効期限 1 時間）を使うが、MCP サーバのような
 * 常駐クライアントは更新できないため、失効可能な長期キーを別途受け付ける。
 */
async function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const presented = req.headers['x-api-key'];
  if (typeof presented !== 'string' || !presented) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: hashApiKey(presented) },
    include: { user: true },
  });

  // 存在しないキーと失効済みキーは区別せず同じ応答にする
  if (!record || record.revokedAt) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  req.uid = record.userId;
  (req as any).uid = record.userId;
  req.user = record.user;
  req.authMethod = 'apiKey';

  const stale =
    !record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > LAST_USED_THROTTLE_MS;
  if (stale) {
    // 最終利用日時の記録は本筋ではないので、失敗してもリクエストは通す
    prisma.apiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(err => console.warn('[auth] failed to touch apiKey.lastUsedAt', err));
  }

  next();
}

// Initialize Firebase Admin (once)
if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_B64 ?? '';
  const serviceAccount = raw
    ? JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
    : undefined;

  admin.initializeApp(
    serviceAccount
      ? { credential: admin.credential.cert(serviceAccount) }
      : undefined // uses GOOGLE_APPLICATION_CREDENTIALS if set
  );
}

const INITIAL_ADMIN_UIDS = (process.env.INITIAL_ADMIN_UIDS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export function isInitialAdmin(uid: string): boolean {
  return INITIAL_ADMIN_UIDS.includes(uid);
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  // API キーが提示されていればそちらを優先する（Firebase トークンとは併用しない）
  if (req.headers['x-api-key']) {
    await authenticateApiKey(req, res, next);
    return;
  }

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    (req as any).uid = decoded.uid;
    req.authMethod = 'firebase';

    const adminFlags = isInitialAdmin(decoded.uid)
      ? { role: 'admin', proOverride: true }
      : {};

    req.user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { email: decoded.email ?? undefined, ...adminFlags },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
        ...adminFlags,
      },
    });

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
