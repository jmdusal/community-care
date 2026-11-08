import { describe, expect, it } from 'vitest';
import { ApiError, apiRequest } from './api';

function fakeFetch(status: number, body: string): typeof fetch {
  return async () => new Response(body, { status, headers: { 'Content-Type': 'application/json' } });
}

describe('apiRequest', () => {
  it('returns the data envelope on success', async () => {
    const data = await apiRequest<{ status: string }>('/health', {}, fakeFetch(200, '{"data":{"status":"ok"}}'));

    expect(data).toEqual({ status: 'ok' });
  });

  it('throws ApiError carrying the standard error object', async () => {
    const body = '{"error":{"code":"forbidden","message":"You are not allowed to do this.","request_id":"req_1"}}';

    await expect(apiRequest('/admin/settings', {}, fakeFetch(403, body))).rejects.toMatchObject({
      status: 403,
      body: { code: 'forbidden', request_id: 'req_1' },
    });
  });

  it('falls back to a readable error when the response is not JSON', async () => {
    const request = apiRequest('/health', {}, fakeFetch(502, '<html>Bad gateway</html>'));

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({ status: 502, body: { code: 'server_unreachable' } });
  });
});
