import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/search/route';

const {
  embedText,
  understandSearchQuery,
  createAdminSupabaseClient,
  getAuthenticatedRouteContext,
  getServerEnv,
} = vi.hoisted(() => ({
  embedText: vi.fn(),
  understandSearchQuery: vi.fn(),
  createAdminSupabaseClient: vi.fn(),
  getAuthenticatedRouteContext: vi.fn(),
  getServerEnv: vi.fn(),
}));

vi.mock('@bin/ai', () => ({
  AiError: class AiError extends Error {
    code: string;

    constructor(message: string, options: { code: string }) {
      super(message);
      this.code = options.code;
    }
  },
  embedText,
  understandSearchQuery,
}));

vi.mock('@bin/supabase', () => ({
  createAdminSupabaseClient,
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRouteContext,
}));

vi.mock('@/lib/env', () => ({
  getServerEnv,
}));

function createSearchClient({
  matches = [],
  items = [],
  keywordItems = [],
  allowHistoryInsert = true,
}: {
  matches?: Array<{ id: string; similarity: number }>;
  items?: Array<Record<string, unknown>>;
  keywordItems?: Array<Record<string, unknown>>;
  allowHistoryInsert?: boolean;
}) {
  return {
    rpc: vi.fn(async () => ({ data: matches, error: null })),
    from: vi.fn((table: string) => {
      if (table === 'items') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(() => ({
              eq: vi.fn(async () => ({ data: items, error: null })),
            })),
            eq: vi.fn(() => ({
              or: vi.fn(() => ({
                limit: vi.fn(async () => ({ data: keywordItems, error: null })),
              })),
            })),
          })),
        };
      }

      if (table === 'search_history') {
        return {
          insert: vi.fn(async () => ({
            data: allowHistoryInsert ? {} : null,
            error: allowHistoryInsert ? null : new Error('insert failed'),
          })),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('search route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    understandSearchQuery.mockResolvedValue({
      normalized_query: 'milk',
      search_phrases: ['milk'],
      concepts: [],
    });
    getServerEnv.mockReturnValue({
      supabaseUrl: 'https://supabase.example',
      supabasePublishableKey: 'publishable',
      supabaseSecretKey: 'secret',
      webhookSecret: 'webhook',
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({ user: null });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'milk' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid search requests', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: '' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(422);
  });

  it('returns search results for valid queries', async () => {
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    const row = {
      id: 'item-1',
      user_id: 'user-1',
      raw_input: 'Buy oat milk',
      cleaned_text: 'Buy oat milk',
      source: 'manual',
      type: 'task',
      actionability: 'now',
      entities: {},
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: null,
      reminder_at: null,
      created_at: '2026-03-28T12:00:00.000Z',
      last_surfaced_at: null,
    };
    createAdminSupabaseClient.mockReturnValue(
      createSearchClient({
        matches: [{ id: 'item-1', similarity: 0.91 }],
        items: [row],
        keywordItems: [row],
      }),
    );
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'oat milk' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as {
      results: Array<{ item: { rawInput: string }; similarity: number }>;
    };

    expect(response.status).toBe(200);
    expect(understandSearchQuery).toHaveBeenCalledWith('oat milk');
    expect(embedText).toHaveBeenCalledWith('oat milk');
    expect(payload.results).toHaveLength(1);
    expect(payload.results[0]?.item.rawInput).toBe('Buy oat milk');
    expect(payload.results[0]?.similarity).toBe(0.91);
  });

  it('returns an empty array when nothing matches', async () => {
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    createAdminSupabaseClient.mockReturnValue(createSearchClient({}));
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'nothing here' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as {
      results: unknown[];
    };

    expect(response.status).toBe(200);
    expect(payload.results).toEqual([]);
  });

  it('returns keyword matches even when vector search is empty', async () => {
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    const row = {
      id: 'item-2',
      user_id: 'user-1',
      raw_input: 'Buy milk tonight',
      cleaned_text: 'Buy milk tonight',
      source: 'manual',
      type: 'task',
      actionability: 'now',
      entities: {},
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: null,
      reminder_at: null,
      created_at: '2026-03-28T12:00:00.000Z',
      last_surfaced_at: null,
    };
    createAdminSupabaseClient.mockReturnValue(
      createSearchClient({
        matches: [],
        items: [row],
        keywordItems: [row],
      }),
    );
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'milk' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as {
      results: Array<{ item: { rawInput: string }; similarity: number }>;
    };

    expect(response.status).toBe(200);
    expect(payload.results[0]?.item.rawInput).toBe('Buy milk tonight');
  });

  it('uses normalized search phrases for natural-language queries', async () => {
    understandSearchQuery.mockResolvedValue({
      normalized_query: 'purchase milk',
      search_phrases: ['buy milk', 'milk'],
      concepts: ['shopping', 'buy'],
    });
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    const row = {
      id: 'item-3',
      user_id: 'user-1',
      raw_input: 'Buy milk tonight',
      cleaned_text: 'Buy milk tonight',
      source: 'manual',
      type: 'task',
      actionability: 'now',
      entities: {},
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: null,
      reminder_at: null,
      created_at: '2026-03-28T12:00:00.000Z',
      last_surfaced_at: null,
    };
    createAdminSupabaseClient.mockReturnValue(
      createSearchClient({
        matches: [{ id: 'item-3', similarity: 0.73 }],
        items: [row],
        keywordItems: [row],
      }),
    );
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'is there a note where i talk about buying milk',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const payload = (await response.json()) as {
      results: Array<{ item: { rawInput: string } }>;
    };

    expect(response.status).toBe(200);
    expect(embedText).toHaveBeenCalledWith(
      'is there a note where i talk about buying milk',
    );
    expect(embedText).toHaveBeenCalledWith('purchase milk');
    expect(embedText).toHaveBeenCalledWith('buy milk');
    expect(embedText).toHaveBeenCalledWith('milk');
    expect(embedText).toHaveBeenCalledWith('shopping');
    expect(payload.results[0]?.item.rawInput).toBe('Buy milk tonight');
  });

  it('falls back to the raw query plus heuristic variants when query understanding fails', async () => {
    understandSearchQuery.mockRejectedValue(new Error('openai down'));
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    createAdminSupabaseClient.mockReturnValue(createSearchClient({}));
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'buy milk' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(200);
    expect(embedText).toHaveBeenCalledTimes(5);
    expect(embedText).toHaveBeenCalledWith('buy milk');
    expect(embedText).toHaveBeenCalledWith('shopping');
  });

  it('derives heuristic purchase-related concepts from broad natural language queries', async () => {
    understandSearchQuery.mockRejectedValue(new Error('openai down'));
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    createAdminSupabaseClient.mockReturnValue(createSearchClient({}));
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'find me items where i talk about purchasing stuff',
        }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(200);
    expect(embedText).toHaveBeenCalledWith('purchase');
    expect(embedText).toHaveBeenCalledWith('buy');
    expect(embedText).toHaveBeenCalledWith('shopping');
  });
});
