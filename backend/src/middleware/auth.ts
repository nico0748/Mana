import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import type { User } from '@prisma/client';
import { prisma } from '../prisma';

declare global {
  namespace Express {
    interface Request {
      uid?: string;
      user?: User;
    }
  }
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
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.uid = decoded.uid;
    (req as any).uid = decoded.uid;

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
