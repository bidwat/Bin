import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/items/url/route';

const { getAuthenticatedRouteContext } = vi.hoisted(() => ({
  getAuthenticatedRouteContext: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRouteContext,
}));

function createInsertChain(result: unknown) {
  return {
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => result),
      })),
    })),
  };
}

describe('items url route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('creates an item for a valid URL', async () => {
    const createdRow = {
      id: 'item-1',
      user_id: 'user-1',
      raw_input: 'URL: Example Domain\n\nExample body.\n\nhttps://example.com',
      cleaned_text: null,
      source: 'url',
      type: null,
      actionability: null,
      entities: { urls: ['https://example.com'] },
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: false,
      reminder_status: null,
      reminder_at: null,
      created_at: '2026-03-28T12:00:00.000Z',
      last_surfaced_at: null,
    };

    getAuthenticatedRouteContext.mockResolvedValue({
      client: {
        from: vi.fn(() => createInsertChain({ data: createdRow, error: null })),
      },
      user: { id: 'user-1', email: 'a@example.com' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () =>
          '<html><head><title>Example Domain</title></head><body>Example body.</body></html>',
      })),
    );

    const response = await POST(
      new Request('http://localhost/api/items/url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as {
      item: { source: string; entities: { urls?: string[] } };
    };

    expect(response.status).toBe(201);
    expect(payload.item.source).toBe('url');
    expect(payload.item.entities.urls).toEqual(['https://example.com']);
  });

  it('returns 422 for invalid URLs', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/items/url', {
        method: 'POST',
        body: JSON.stringify({ url: 'notaurl' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(422);
  });

  it('falls back to the URL when the title is missing', async () => {
    const from = vi.fn(() =>
      createInsertChain({
        data: {
          id: 'item-2',
          user_id: 'user-1',
          raw_input:
            'URL: https://example.com\n\nBody copy\n\nhttps://example.com',
          cleaned_text: null,
          source: 'url',
          type: null,
          actionability: null,
          entities: { urls: ['https://example.com'] },
          cluster_ids: [],
          sub_cluster_id: null,
          resurfacing_score: 1,
          processed: false,
          reminder_status: null,
          reminder_at: null,
          created_at: '2026-03-28T12:00:00.000Z',
          last_surfaced_at: null,
        },
        error: null,
      }),
    );

    getAuthenticatedRouteContext.mockResolvedValue({
      client: { from },
      user: { id: 'user-1', email: 'a@example.com' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        text: async () => '<html><body>Body copy</body></html>',
      })),
    );

    const response = await POST(
      new Request('http://localhost/api/items/url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalled();
  });

  it('returns 502 when the remote server cannot be fetched', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: { id: 'user-1', email: 'a@example.com' },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 503,
      })),
    );

    const response = await POST(
      new Request('http://localhost/api/items/url', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://example.com' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(502);
  });
});
