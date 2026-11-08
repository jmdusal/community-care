import { BASE_URL, getToken } from './api';

/**
 * A small client for Laravel Reverb (Pusher protocol) so the app gets notifications
 * live while it is open. Subscribes to the signed-in person's private channel
 * (users.{publicId}), authorised with their token. Reconnects with back-off.
 * Settings: EXPO_PUBLIC_REVERB_KEY / _HOST / _PORT / _SCHEME (see .env.example).
 */
const KEY = process.env.EXPO_PUBLIC_REVERB_KEY;
const HOST = process.env.EXPO_PUBLIC_REVERB_HOST ?? 'localhost';
const PORT = process.env.EXPO_PUBLIC_REVERB_PORT ?? '8080';
const SCHEME = process.env.EXPO_PUBLIC_REVERB_SCHEME ?? 'http';
const NOTIFICATION_EVENT = 'Illuminate\\Notifications\\Events\\BroadcastNotificationCreated';

export type LivePayload = { id: string; kind: string; title: string; body: string; path: string | null; refresh?: string[] };

export function connectLive(userPublicId: string, onNotification: (payload: LivePayload) => void, onState?: (connected: boolean) => void): () => void {
  if (!KEY) {
    return () => undefined;
  }

  const channel = `private-users.${userPublicId}`;
  let socket: WebSocket | null = null;
  let closed = false;
  let retry = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const open = () => {
    socket = new WebSocket(`${SCHEME === 'https' ? 'wss' : 'ws'}://${HOST}:${PORT}/app/${KEY}?protocol=7&client=js&version=8.4.0`);

    socket.onmessage = async (message) => {
      const event = JSON.parse(String(message.data)) as { event: string; channel?: string; data?: string };

      if (event.event === 'pusher:connection_established') {
        retry = 0;
        const socketId = (JSON.parse(event.data ?? '{}') as { socket_id: string }).socket_id;
        const token = await getToken();
        const response = await fetch(`${BASE_URL}/api/broadcasting/auth`, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ socket_id: socketId, channel_name: channel }),
        }).catch(() => null);
        const auth = response?.ok ? ((await response.json()) as { auth: string }).auth : null;
        if (auth) {
          socket?.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel, auth } }));
        }
      } else if (event.event === 'pusher_internal:subscription_succeeded') {
        onState?.(true);
      } else if (event.event === 'pusher:ping') {
        socket?.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      } else if (event.channel === channel && event.event === NOTIFICATION_EVENT && event.data) {
        onNotification(JSON.parse(event.data) as LivePayload);
      }
    };

    socket.onclose = () => {
      onState?.(false);
      if (!closed) {
        timer = setTimeout(open, Math.min(30_000, 1000 * 2 ** retry++));
      }
    };
  };

  open();

  return () => {
    closed = true;
    if (timer) {
      clearTimeout(timer);
    }
    socket?.close();
  };
}
