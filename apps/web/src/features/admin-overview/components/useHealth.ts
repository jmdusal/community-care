import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../lib/api';

export type Health = {
  status: 'ok' | 'degraded';
  checks: Record<string, 'ok' | 'fail'>;
  drivers: { cache: string; queue: string };
  time: string;
};

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => apiRequest<Health>('/health'),
    refetchInterval: 30_000,
  });
}
