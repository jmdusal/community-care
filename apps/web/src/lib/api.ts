/**
 * Minimal client for the CommunityCare API (/api/v1).
 * Replaced by the client generated from docs/api-spec.yaml once the contract stabilizes.
 *
 * The web app signs in with a Sanctum cookie session: before the first state-changing
 * request it fetches /sanctum/csrf-cookie, then sends the XSRF-TOKEN cookie back as a header.
 */

/** The standard error object every API error uses (docs/api.md, section 9.8). */
export type ApiErrorBody = {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  retry_after?: number;
  request_id?: string;
};

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

export type Paginated<T> = {
  data: T[];
  meta: { page: number; per_page: number; total: number; last_page: number };
  links: { next: string | null; prev: string | null };
};

type Fetcher = typeof fetch;

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export async function apiRequest<T>(path: string, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<T> {
  const payload = await send(path, init, fetcher);

  return (payload as { data: T }).data;
}

/** Like apiRequest but returns the whole body (data + meta + links), for paginated lists. */
export async function apiList<T>(path: string, fetcher: Fetcher = fetch): Promise<Paginated<T>> {
  return (await send(path, {}, fetcher)) as Paginated<T>;
}

/** Whole response body for endpoints that return data plus meta. */
export async function apiRaw<T>(path: string, init: RequestInit = {}, fetcher: Fetcher = fetch): Promise<T> {
  return (await send(path, init, fetcher)) as T;
}

export async function ensureCsrfCookie(fetcher: Fetcher = fetch): Promise<void> {
  await fetcher('/sanctum/csrf-cookie', { credentials: 'include', headers: { Accept: 'application/json' } });
}

async function send(path: string, init: RequestInit, fetcher: Fetcher): Promise<unknown> {
  const method = (init.method ?? 'GET').toUpperCase();
  const isForm = typeof FormData !== 'undefined' && init.body instanceof FormData;
  const xsrf = SAFE_METHODS.includes(method) ? null : readCookie('XSRF-TOKEN');

  const response = await fetcher(`/api/v1${path}`, {
    ...init,
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init.body && !isForm ? { 'Content-Type': 'application/json' } : {}),
      ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      ...init.headers,
    },
  });

  const payload = await readJson(response);

  if (!response.ok) {
    throw new ApiError(response.status, isErrorPayload(payload) ? payload.error : fallbackError(response.status));
  }

  return payload;
}

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));

  return match ? decodeURIComponent(match[1]) : null;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text === '') {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isErrorPayload(payload: unknown): payload is { error: ApiErrorBody } {
  return typeof payload === 'object' && payload !== null && 'error' in payload && typeof (payload as { error: unknown }).error === 'object';
}

function fallbackError(status: number): ApiErrorBody {
  return { code: status >= 500 ? 'server_unreachable' : 'http_error', message: `The API returned an unexpected response (${status}).` };
}
