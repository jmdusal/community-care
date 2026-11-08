import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { readCookie } from './api';

/**
 * Live connection to Laravel Reverb (WebSockets). Private channels are authorised by
 * POST /api/broadcasting/auth with the same cookie session and XSRF token as every
 * other API call. Returns null when Reverb is not configured (VITE_REVERB_APP_KEY).
 */
let echo: Echo<'reverb'> | null | undefined;

export function getEcho(): Echo<'reverb'> | null {
  if (echo !== undefined) {
    return echo;
  }

  const key = import.meta.env.VITE_REVERB_APP_KEY as string | undefined;
  if (!key) {
    echo = null;

    return echo;
  }

  const scheme = (import.meta.env.VITE_REVERB_SCHEME as string | undefined) ?? 'http';
  const port = Number(import.meta.env.VITE_REVERB_PORT ?? (scheme === 'https' ? 443 : 80));

  echo = new Echo({
    broadcaster: 'reverb',
    Pusher,
    key,
    wsHost: (import.meta.env.VITE_REVERB_HOST as string | undefined) ?? window.location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    channelAuthorization: {
      endpoint: '/api/broadcasting/auth',
      transport: 'ajax',
      headersProvider: () => ({ Accept: 'application/json', 'X-XSRF-TOKEN': readCookie('XSRF-TOKEN') ?? '' }),
    },
  });

  return echo;
}

/** Closes the connection (on sign-out), so the next user starts clean. */
export function disconnectEcho(): void {
  echo?.disconnect();
  echo = undefined;
}
