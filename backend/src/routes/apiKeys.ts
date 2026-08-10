import { Router } from 'express';
import { prisma } from '../prisma';
import { generateApiKey, hashApiKey, apiKeyPrefixOf } from '../middleware/auth';
import { normalizeFields } from '../lib/text';

const router = Router();

// 1 ユーザーあたりの有効キー数。無制限だと発行しっぱなしで管理不能になるため上限を設ける。
const MAX_ACTIVE_KEYS = 10;

// キーの管理自体は API キーでは行わせない。
// 許すと、漏れたキーで新しいキーを発行して元のキーを失効させても居座れてしまう。
// ブラウザで Firebase 認証を通した本人だけが発行・失効できるようにする。
//
// なお、このルーターはマウント時に requireAdmin も通しているので現状ここには
// 到達しないが、別の場所にマウントされても壊れないようルーター側にも残しておく。
router.use((req, res, next) => {
  if (req.authMethod === 'apiKey') {
    res.status(403).json({ error: 'api_key_cannot_manage_keys' });
    return;
  }
  next();
});

const toApiKey = (k: {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}) => ({
  id: k.id,
  name: k.name,
  prefix: k.prefix,
  lastUsedAt: k.lastUsedAt?.getTime() ?? null,
  revokedAt: k.revokedAt?.getTime() ?? null,
  createdAt: k.createdAt.getTime(),
});

// 一覧。平文は保存していないので返せるのは prefix まで。
router.get('/', async (req, res) => {
  const uid = req.user!.firebaseUid;
  const keys = await prisma.apiKey.findMany({
    where: { userId: uid },
    orderBy: { createdAt: 'desc' },
  });
  res.json(keys.map(toApiKey));
});

// 発行。平文を返すのはこのレスポンスの一度きり。
router.post('/', async (req, res) => {
  const uid = req.user!.firebaseUid;

  const { name } = normalizeFields((req.body ?? {}) as Record<string, unknown>, ['name']);
  const label = typeof name === 'string' ? name.trim() : '';
  if (!label) {
    res.status(400).json({ error: 'name_required' });
    return;
  }
  if (label.length > 60) {
    res.status(400).json({ error: 'name_too_long' });
    return;
  }

  const activeCount = await prisma.apiKey.count({ where: { userId: uid, revokedAt: null } });
  if (activeCount >= MAX_ACTIVE_KEYS) {
    res.status(409).json({ error: 'too_many_keys', limit: MAX_ACTIVE_KEYS });
    return;
  }

  const plaintext = generateApiKey();
  const created = await prisma.apiKey.create({
    data: {
      userId: uid,
      name: label,
      keyHash: hashApiKey(plaintext),
      prefix: apiKeyPrefixOf(plaintext),
    },
  });

  res.status(201).json({ ...toApiKey(created), key: plaintext });
});

// 失効。物理削除ではなく revokedAt を立てて履歴を残す。
router.delete('/:id', async (req, res) => {
  const uid = req.user!.firebaseUid;

  // userId を条件に含めることで、他人のキー ID を指定しても 0 件更新になる
  const { count } = await prisma.apiKey.updateMany({
    where: { id: req.params.id, userId: uid, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (count === 0) {
    res.status(404).json({ error: 'not_found' });
    return;
  }
  res.status(204).send();
});

export default router;
