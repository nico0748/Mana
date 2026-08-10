import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;

  // API キーは MCP サーバなど常駐クライアント向けの長期クレデンシャルなので、
  // 万一漏れたときの被害を自分のデータの範囲に留めるため管理者操作には使わせない。
  if (req.authMethod === 'apiKey') {
    console.warn(
      `[admin-guard] forbidden: api key cannot access admin routes ` +
      `uid=${user?.firebaseUid ?? '<none>'} path=${req.method} ${req.originalUrl} ip=${req.ip}`,
    );
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  if (!user || user.role !== 'admin') {
    console.warn(
      `[admin-guard] forbidden: uid=${user?.firebaseUid ?? '<none>'} ` +
      `role=${user?.role ?? '<none>'} path=${req.method} ${req.originalUrl} ip=${req.ip}`,
    );
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

export const adminRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'too_many_requests' },
});

// Firebase API quota / DB write 負荷 / DoS を抑制するため sync は厳しく制限
export const adminSyncRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 2,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'sync_rate_limited' },
});
