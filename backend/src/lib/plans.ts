export type Plan = 'free' | 'pro';

export interface PlanLimits {
  books: number | null;
  circles: number | null;
  events: number | null;
  distributions: number | null;
  venueMaps: number | null;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    books: 200,
    circles: 50,
    events: 3,
    distributions: 50,
    venueMaps: 10,
  },
  pro: {
    books: null,
    circles: null,
    events: null,
    distributions: null,
    venueMaps: null,
  },
};

export function effectivePlan(user: {
  plan: string;
  planStatus: string;
  planExpiresAt: Date | null;
  proOverride?: boolean;
}): Plan {
  if (user.proOverride) return 'pro';
  if (user.plan === 'pro' && (user.planStatus === 'active' || user.planStatus === 'trialing')) {
    return 'pro';
  }
  if (user.plan === 'pro' && user.planExpiresAt && user.planExpiresAt.getTime() > Date.now()) {
    return 'pro';
  }
  return 'free';
}
