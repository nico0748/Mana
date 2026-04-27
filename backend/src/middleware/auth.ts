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

    req.user = await prisma.user.upsert({
      where: { firebaseUid: decoded.uid },
      update: { email: decoded.email ?? undefined },
      create: {
        firebaseUid: decoded.uid,
        email: decoded.email ?? null,
        displayName: decoded.name ?? null,
      },
    });

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
