import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/items/[id]/snooze/route';

const { getAuthenticatedRouteContext } = vi.hoisted(() => ({
  getAuthenticatedRouteContext: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthenticatedRouteContext,
}));

describe('item snooze route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: null,
    });

    const response = await POST(
      new Request('http://localhost/api/items/item-1/snooze', {
        method: 'POST',
        body: JSON.stringify({ snooze_minutes: 15 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      {
        params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
      },
    );

    expect(response.status).toBe(401);
  });

  it('returns 422 for invalid snooze values', async () => {
    getAuthenticatedRouteContext.mockResolvedValue({
      client: {},
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/items/item-1/snooze', {
        method: 'POST',
        body: JSON.stringify({ snooze_minutes: 10 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      {
        params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
      },
    );

    expect(response.status).toBe(422);
  });

  it('updates reminder_at and reminder_status', async () => {
    const row = {
      id: '00000000-0000-4000-8000-000000000001',
      user_id: 'user-1',
      raw_input: 'Call mom tomorrow',
      cleaned_text: 'Call mom tomorrow',
      source: 'manual',
      type: 'reminder',
      actionability: 'now',
      entities: {},
      cluster_ids: [],
      sub_cluster_id: null,
      resurfacing_score: 1,
      processed: true,
      reminder_status: 'snoozed',
      reminder_at: '2026-04-13T02:00:00.000Z',
      created_at: '2026-04-13T01:00:00.000Z',
      last_surfaced_at: null,
    };

    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: row, error: null })),
          })),
        })),
      })),
    }));

    getAuthenticatedRouteContext.mockResolvedValue({
      client: {
        from: vi.fn(() => ({
          update,
        })),
      },
      user: { id: 'user-1', email: 'a@example.com' },
    });

    const response = await POST(
      new Request('http://localhost/api/items/item-1/snooze', {
        method: 'POST',
        body: JSON.stringify({ snooze_minutes: 60 }),
        headers: { 'Content-Type': 'application/json' },
      }),
      {
        params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
      },
    );

    const payload = (await response.json()) as {
      item: { reminderStatus: string };
    };

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        reminder_status: 'snoozed',
        reminder_at: expect.any(String),
      }),
    );
    expect(payload.item.reminderStatus).toBe('snoozed');
  });
});
