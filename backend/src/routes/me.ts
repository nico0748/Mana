import { Router } from 'express';
import { prisma } from '../prisma';
import { effectivePlan, PLAN_LIMITS } from '../lib/plans';

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

export default router;
