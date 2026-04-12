import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/search/recent/route';

const {
  createAdminSupabaseClient,
  getAuthenticatedRouteContext,
  getServerEnv,
} = vi.hoisted(() => ({
  createAdminSupabaseClient: vi.fn(),
  getAuthenticatedRouteContext: vi.fn(),
  getServerEnv: vi.fn(),
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

describe('recent search route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnv.mockReturnValue({
      supabaseUrl: 'https://supabase.example',
      supabasePublishableKey: 'publishable',
      supabaseSecretKey: 'secret',
      webhookSecret: 'webhook',
    });
  });

  it('returns 401 for unauthenticated requests', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({ user: null });

    const response = await GET(
      new Request('http://localhost/api/search/recent'),
    );

    expect(response.status).toBe(401);
  });

  it('returns distinct recent queries', async () => {
    const order = vi.fn(() => ({
      limit: vi.fn(async () => ({
        data: [
          { query: 'startup idea', created_at: '2026-04-12T10:00:00.000Z' },
          { query: 'milk', created_at: '2026-04-12T09:00:00.000Z' },
          { query: 'startup idea', created_at: '2026-04-12T08:00:00.000Z' },
        ],
        error: null,
      })),
    }));

    createAdminSupabaseClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order,
          })),
        })),
      })),
    });
    getAuthenticatedRouteContext.mockResolvedValue({
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await GET(
      new Request('http://localhost/api/search/recent'),
    );

    const payload = (await response.json()) as { recent: string[] };

    expect(response.status).toBe(200);
    expect(payload.recent).toEqual(['startup idea', 'milk']);
  });
});
