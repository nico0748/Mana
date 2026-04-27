import type { Response } from 'express';
import type { User } from '@prisma/client';
import { prisma } from '../prisma';
import { PLAN_LIMITS, effectivePlan, type PlanLimits } from './plans';

export type Resource = keyof PlanLimits;

const COUNTERS: Record<Resource, (uid: string) => Promise<number>> = {
  books:         (uid) => prisma.book.count({ where: { userId: uid } }),
  circles:       (uid) => prisma.circle.count({ where: { userId: uid } }),
  events:        (uid) => prisma.doujinEvent.count({ where: { userId: uid } }),
  distributions: (uid) => prisma.distribution.count({ where: { userId: uid } }),
  venueMaps:     (uid) => prisma.venueMap.count({ where: { userId: uid } }),
};

export async function guardLimit(
  res: Response,
  user: User,
  resource: Resource,
  increment = 1,
): Promise<boolean> {
  const plan = effectivePlan(user);
  const limit = PLAN_LIMITS[plan][resource];
  if (limit === null) return true;

  const current = await COUNTERS[resource](user.firebaseUid);
  if (current + increment > limit) {
    res.status(402).json({
      error: 'plan_limit_exceeded',
      resource,
      limit,
      current,
      message: `${resource} の上限 (${limit}) に達しています。Pro にアップグレードすると無制限で利用できます。`,
    });
    return false;
  }
  return true;
}
