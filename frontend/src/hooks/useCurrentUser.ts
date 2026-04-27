import { useQuery } from '@tanstack/react-query';
import { meApi, type MeResponse, type ResourceKey } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

export function useCurrentUser() {
  const { user } = useAuth();
  return useQuery<MeResponse>({
    queryKey: ['me'],
    queryFn: () => meApi.get(),
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useResourceLimit(resource: ResourceKey) {
  const { data, isLoading } = useCurrentUser();
  if (!data) {
    return { isLoading, atLimit: false, limit: null as number | null, usage: 0, remaining: null as number | null, plan: 'free' as const };
  }
  const limit = data.limits[resource];
  const usage = data.usage[resource];
  const atLimit = limit !== null && usage >= limit;
  const remaining = limit === null ? null : Math.max(0, limit - usage);
  return { isLoading: false, atLimit, limit, usage, remaining, plan: data.user.plan };
}
