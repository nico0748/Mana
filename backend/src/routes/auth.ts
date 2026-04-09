import { Router } from 'express';
import { prisma } from '../prisma';

const router = Router();

const toUser = (u: any) => ({
  id: u.id,
  displayName: u.displayName,
  avatarUrl: u.avatarUrl,
  createdAt: u.createdAt instanceof Date ? u.createdAt.getTime() : u.createdAt,
  updatedAt: u.updatedAt instanceof Date ? u.updatedAt.getTime() : u.updatedAt,
});

/** Register a new user. Returns user info + token. */
router.post('/register', async (req, res) => {
  const { displayName } = req.body;
  if (!displayName || typeof displayName !== 'string' || displayName.trim().length === 0) {
    res.status(400).json({ error: 'displayName is required' });
    return;
  }
  if (displayName.trim().length > 30) {
    res.status(400).json({ error: 'displayName must be 30 characters or fewer' });
    return;
  }

  const user = await prisma.user.create({
    data: { displayName: displayName.trim() },
  });
  res.status(201).json({ ...toUser(user), token: user.token });
});

/** Login with an existing token. Returns user info. */
router.post('/login', async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'token is required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { token } });
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  res.json({ ...toUser(user), token: user.token });
});

/** Get current user info. Requires valid Bearer token. */
router.get('/me', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(toUser(user));
});

/** Update current user's display name. */
router.put('/me', async (req, res) => {
  if (!req.userId) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  const { displayName } = req.body;
  if (displayName !== undefined) {
    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      res.status(400).json({ error: 'displayName must be a non-empty string' });
      return;
    }
    if (displayName.trim().length > 30) {
      res.status(400).json({ error: 'displayName must be 30 characters or fewer' });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { ...(displayName && { displayName: displayName.trim() }) },
  });
  res.json(toUser(user));
});

export default router;
