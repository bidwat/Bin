import { beforeEach, describe, expect, it, vi } from 'vitest';

import { POST } from '@/app/api/cron/reminders/route';

const { createAdminSupabaseClient, getServerEnv, sendPushNotification } =
  vi.hoisted(() => ({
    createAdminSupabaseClient: vi.fn(),
    getServerEnv: vi.fn(),
    sendPushNotification: vi.fn(),
  }));

vi.mock('@bin/supabase', () => ({
  createAdminSupabaseClient,
}));

vi.mock('@/lib/env', () => ({
  getServerEnv,
}));

vi.mock('@/services/sendPushNotification', () => ({
  sendPushNotification,
}));

describe('reminders cron route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnv.mockReturnValue({
      supabaseUrl: 'https://supabase.example',
      supabasePublishableKey: 'publishable',
      supabaseSecretKey: 'secret',
      webhookSecret: 'webhook',
      cronSecret: 'cron-secret',
    });
  });

  it('returns 401 for invalid cron secret', async () => {
    const response = await POST(
      new Request('http://localhost/api/cron/reminders', {
        method: 'POST',
        headers: { Authorization: 'Bearer wrong' },
      }),
    );

    expect(response.status).toBe(401);
  });

  it('sends reminder pushes and marks items sent', async () => {
    const updates: unknown[] = [];

    createAdminSupabaseClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'items') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(() => ({
                not: vi.fn(() => ({
                  lte: vi.fn(() => ({
                    gt: vi.fn(async () => ({
                      data: [
                        {
                          id: '00000000-0000-4000-8000-000000000001',
                          user_id: 'user-1',
                          raw_input: 'Call mom',
                          cleaned_text: 'Call mom',
                          source: 'manual',
                          type: 'reminder',
                          actionability: 'now',
                          entities: {},
                          cluster_ids: [],
                          sub_cluster_id: null,
                          resurfacing_score: 1,
                          processed: true,
                          reminder_status: 'pending',
                          reminder_at: '2026-04-13T01:00:00.000Z',
                          created_at: '2026-04-12T23:00:00.000Z',
                          last_surfaced_at: null,
                        },
                      ],
                      error: null,
                    })),
                  })),
                })),
              })),
            })),
            update: vi.fn((payload: unknown) => {
              updates.push(payload);
              return {
                eq: vi.fn(async () => ({ error: null })),
              };
            }),
          };
        }

        if (table === 'users') {
          return {
            select: vi.fn(() => ({
              in: vi.fn(async () => ({
                data: [{ id: 'user-1', push_token: 'ExponentPushToken[test]' }],
                error: null,
              })),
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    sendPushNotification.mockResolvedValue({
      delivered: true,
      invalidatedToken: false,
    });

    const response = await POST(
      new Request('http://localhost/api/cron/reminders', {
        method: 'POST',
        headers: { Authorization: 'Bearer cron-secret' },
      }),
    );

    const payload = (await response.json()) as {
      processed: number;
      notified: number;
      skipped: number;
    };

    expect(response.status).toBe(200);
    expect(sendPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        pushToken: 'ExponentPushToken[test]',
      }),
    );
    expect(updates).toContainEqual({ reminder_status: 'sent' });
    expect(payload).toEqual({
      processed: 1,
      notified: 1,
      skipped: 0,
    });
  });
});
