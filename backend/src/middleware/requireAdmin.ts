import type { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = req.user;
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
