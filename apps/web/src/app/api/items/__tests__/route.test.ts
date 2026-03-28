import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET, POST } from '@/app/api/items/route';

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

describe('items route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for unauthenticated POST requests', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: null,
    });

    const response = await POST(
      new Request('http://localhost/api/items', {
        method: 'POST',
        body: JSON.stringify({ raw_input: 'hello' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('returns 422 for empty POST payloads', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/items', {
        method: 'POST',
        body: JSON.stringify({ raw_input: '   ' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(422);
  });

  it('creates an item for valid POST payloads', async () => {
    const createdRow = {
      id: 'item-1',
      user_id: 'user-1',
      raw_input: 'Buy milk',
      cleaned_text: null,
      source: 'manual',
      type: null,
      actionability: null,
      entities: {},
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

    const response = await POST(
      new Request('http://localhost/api/items', {
        method: 'POST',
        body: JSON.stringify({ raw_input: 'Buy milk' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as { item: { rawInput: string } };

    expect(response.status).toBe(201);
    expect(payload.item.rawInput).toBe('Buy milk');
  });

  it('returns 401 for unauthenticated GET requests', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: null,
    });

    const response = await GET(new Request('http://localhost/api/items'));

    expect(response.status).toBe(401);
  });

  it('returns items for authenticated GET requests and applies filters', async () => {
    const row = {
      id: 'item-1',
      user_id: 'user-1',
      raw_input: 'Buy milk',
      cleaned_text: null,
      source: 'manual',
      type: 'task',
      actionability: 'now',
      entities: {},
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: false,
      reminder_status: null,
      reminder_at: null,
      created_at: '2026-03-28T12:00:00.000Z',
      last_surfaced_at: null,
    };

    const query = {
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      lt: vi.fn(),
      eq: vi.fn(),
      then: (resolve: (value: unknown) => void) =>
        resolve({ data: [row], error: null }),
    };

    query.select.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.lt.mockReturnValue(query);
    query.eq.mockReturnValue(query);

    getAuthenticatedRouteContext.mockResolvedValue({
      client: {
        from: vi.fn(() => query),
      },
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await GET(
      new Request(
        'http://localhost/api/items?limit=20&cursor=2026-03-28T11:00:00.000Z&type=task&actionability=now',
      ),
    );

    const payload = (await response.json()) as {
      items: Array<{ rawInput: string }>;
      nextCursor: string | null;
    };

    expect(response.status).toBe(200);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]?.rawInput).toBe('Buy milk');
    expect(query.lt).toHaveBeenCalledWith(
      'created_at',
      '2026-03-28T11:00:00.000Z',
    );
    expect(query.eq).toHaveBeenNthCalledWith(1, 'type', 'task');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'actionability', 'now');
  });
});
