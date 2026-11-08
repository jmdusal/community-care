import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiFetch } from './api';
import { connectLive, type LivePayload } from './live';

export type AppNotification = { id: string; kind: string; title: string; body: string; path: string | null; read: boolean; created_at: string };

type ListResponse = { data: AppNotification[]; meta: { unread: number } };

export function useNotifications(enabled: boolean) {
  return useQuery({ queryKey: ['notifications'], queryFn: () => apiFetch<ListResponse>('/me/notifications'), enabled, staleTime: 30_000 });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiFetch('/me/notifications/read-all', { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/**
 * While the app is open: new notifications arrive live, update the bell and refresh
 * what they concern (e.g. My appointments). Returns the newest one for a banner.
 */
export function useLiveNotifications(userPublicId: string | undefined) {
  const queryClient = useQueryClient();
  const [latest, setLatest] = useState<LivePayload | null>(null);

  useEffect(() => {
    if (!userPublicId) {
      return;
    }

    return connectLive(userPublicId, (payload) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      void queryClient.invalidateQueries({ queryKey: ['my-appointments'] });
      void queryClient.invalidateQueries({ queryKey: ['staff-appointments'] });
      setLatest(payload);
    });
  }, [userPublicId, queryClient]);

  return { latest, dismiss: () => setLatest(null) };
}

/** Maps a web path from a notification to the matching app screen. */
export function appRouteFor(path: string | null): string {
  if (path?.startsWith('/facilities/')) {
    return path;
  }
  if (path?.startsWith('/programs/')) {
    return path;
  }

  return '/account';
}
