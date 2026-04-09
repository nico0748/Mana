import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';

/** Extend Express Request with optional userId set by auth middleware. */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/**
 * Optional auth middleware.
 * If a valid Bearer token is present, attaches `req.userId`.
 * If no token or invalid token, the request continues without userId.
 * Existing endpoints keep working for unauthenticated users.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice(7);
  try {
    const user = await prisma.user.findUnique({ where: { token } });
    if (user) {
      req.userId = user.id;
    }
  } catch {
    // DB error — continue without auth
  }
  next();
}
