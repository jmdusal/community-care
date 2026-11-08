import * as SecureStore from 'expo-secure-store';

/**
 * CommunityCare API client for the mobile app. Public screens need no account; signed-in
 * calls send the personal access token kept in the device's secure storage.
 * Base URL: EXPO_PUBLIC_API_URL (see .env.example).
 */
export const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://communitycare-api.test').replace(/\/$/, '');

const TOKEN_KEY = 'communitycare.token';

export type ApiErrorBody = { code: string; message: string; fields?: Record<string, string[]>; request_id?: string; retry_after?: number };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = 'ApiError';
  }

  /** First validation message for a field, if any. */
  field(name: string): string | undefined {
    return this.body.fields?.[name]?.[0];
  }
}

export type Paginated<T> = { data: T[]; meta: { page: number; per_page: number; total: number; last_page: number } };

let cachedToken: string | null | undefined;

export async function getToken(): Promise<string | null> {
  if (cachedToken === undefined) {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
  }

  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  }
}

const TRUSTED_KEY = 'communitycare.trusted_device';

/** "Remember this phone": the secret that lets this phone skip the two-factor code (per account email). */
export async function getTrustedDevice(email: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(TRUSTED_KEY).catch(() => null);
  if (!raw) {
    return null;
  }
  try {
    const saved = JSON.parse(raw) as { email: string; token: string };

    return saved.email === email.toLowerCase() ? saved.token : null;
  } catch {
    return null;
  }
}

export async function setTrustedDevice(email: string, token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TRUSTED_KEY, JSON.stringify({ email: email.toLowerCase(), token }));
  } else {
    await SecureStore.deleteItemAsync(TRUSTED_KEY).catch(() => undefined);
  }
}

/**
 * Any API call. Returns the whole JSON body. Throws ApiError with the API's standard
 * error object, or code "offline" when the server cannot be reached.
 */
export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}, timeoutMs = 15_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const token = await getToken();

  try {
    const response = await fetch(`${BASE_URL}/api/v1${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    const payload = response.status === 204 ? null : await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 && token) {
        await setToken(null); // the token was revoked (signed out elsewhere, suspended)
      }
      throw new ApiError(response.status, payload?.error ?? { code: 'http_error', message: `Request failed (${response.status}).` });
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, { code: 'offline', message: 'No connection. Check your internet and try again.' });
  } finally {
    clearTimeout(timer);
  }
}

export function apiGet<T>(path: string, timeoutMs = 15_000): Promise<T> {
  return apiFetch<T>(path, {}, timeoutMs);
}

/** Fire-and-forget POST (anonymous usage counts). */
export function apiPost(path: string, body: unknown): void {
  void apiFetch(path, { method: 'POST', body }).catch(() => undefined);
}
