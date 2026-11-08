import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiRaw } from './api';
import { getEcho } from './realtime';

export type AppNotification = {
  id: string;
  kind: 'appointment' | 'change_request' | 'program' | 'system';
  title: string;
  body: string;
  path: string | null;
  read: boolean;
  created_at: string;
};

type ListResponse = { data: AppNotification[]; meta: { unread: number } };

/** Payload pushed over Reverb by InAppNotification::toBroadcast. */
type LivePayload = Omit<AppNotification, 'read'> & { refresh?: string[] };

export function useNotifications(enabled: boolean) {
  return useQuery({ queryKey: ['notifications'], queryFn: () => apiRaw<ListResponse>('/me/notifications'), enabled, staleTime: 60_000 });
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string | 'all') => apiRaw<{ meta: { unread: number } }>(id === 'all' ? '/me/notifications/read-all' : `/me/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

/**
 * Listens on the user's private channel. Each new notification is added to the bell,
 * shown as a toast, and refreshes the data on screen that it concerns (e.g. the
 * appointment list), so nobody has to reload the page.
 */
export function useLiveNotifications(userPublicId: string | undefined) {
  const queryClient = useQueryClient();
  const [latest, setLatest] = useState<LivePayload | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const echo = getEcho();
    if (!echo || !userPublicId) {
      return;
    }

    const channelName = `users.${userPublicId}`;
    const channel = echo.private(channelName);

    channel.notification((payload: LivePayload) => {
      queryClient.setQueryData<ListResponse>(['notifications'], (current) =>
        current
          ? { data: [{ ...payload, read: false }, ...current.data.filter((item) => item.id !== payload.id)].slice(0, 30), meta: { unread: current.meta.unread + 1 } }
          : current,
      );
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      (payload.refresh ?? []).forEach((key) => void queryClient.invalidateQueries({ queryKey: [key] }));
      setLatest(payload);
    });

    const connection = echo.connector.pusher.connection;
    const onState = () => setConnected(connection.state === 'connected');
    connection.bind('state_change', onState);
    onState();

    return () => {
      connection.unbind('state_change', onState);
      echo.leave(channelName);
    };
  }, [userPublicId, queryClient]);

  return { latest, dismiss: () => setLatest(null), connected };
}
