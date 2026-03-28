import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processItem } from '@/services/processItem';

const { classifyItem, embedText, createAdminSupabaseClient, getServerEnv } =
  vi.hoisted(() => ({
    classifyItem: vi.fn(),
    embedText: vi.fn(),
    createAdminSupabaseClient: vi.fn(),
    getServerEnv: vi.fn(),
  }));

vi.mock('@bin/ai', () => ({
  classifyItem,
  embedText,
}));

vi.mock('@bin/supabase', () => ({
  createAdminSupabaseClient,
}));

vi.mock('@/lib/env', () => ({
  getServerEnv,
}));

function createAdminClient({
  itemRow,
  memoryRows = [],
  updatedRow,
}: {
  itemRow: Record<string, unknown>;
  memoryRows?: Array<{ statement: string }>;
  updatedRow?: Record<string, unknown>;
}) {
  const itemsSelectSingle = vi.fn(async () => ({ data: itemRow, error: null }));
  const memoryLimit = vi.fn(async () => ({ data: memoryRows, error: null }));
  const updateSingle = vi.fn(async () => ({
    data: updatedRow ?? itemRow,
    error: null,
  }));

  const itemsSelect = {
    eq: vi.fn(() => ({
      single: itemsSelectSingle,
    })),
  };

  const memorySelect = {
    eq: vi.fn(() => ({
      order: vi.fn(() => ({
        limit: memoryLimit,
      })),
    })),
  };

  const itemsUpdate = {
    eq: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: updateSingle,
        })),
      })),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === 'items') {
        return {
          select: vi.fn(() => itemsSelect),
          update: vi.fn(() => itemsUpdate),
        };
      }

      if (table === 'user_memory') {
        return {
          select: vi.fn(() => memorySelect),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    }),
  };
}

describe('processItem', () => {
  const itemRow = {
    id: 'item-1',
    user_id: 'user-1',
    raw_input: 'remind me to call mom tomorrow at 7pm',
    cleaned_text: null,
    source: 'manual',
    type: null,
    actionability: null,
    entities: {},
    embedding: null,
    cluster_ids: [],
    sub_cluster_id: null,
    resurfacing_score: 1,
    processed: false,
    reminder_status: null,
    reminder_at: null,
    created_at: '2026-03-28T12:00:00.000Z',
    last_surfaced_at: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnv.mockReturnValue({
      supabaseUrl: 'https://supabase.example',
      supabasePublishableKey: 'publishable',
      supabaseSecretKey: 'secret',
      webhookSecret: 'webhook',
    });
  });

  it('updates an item with classification results', async () => {
    classifyItem.mockResolvedValue({
      cleaned_text: 'Call mom tomorrow at 7:00 PM.',
      type: 'reminder',
      actionability: 'now',
      entities: {
        people: ['mom'],
        dates: ['tomorrow 7pm'],
        places: [],
        urls: [],
      },
      reminder_at: '2026-03-29T19:00:00',
      confidence: 0.93,
    });
    embedText.mockResolvedValue([0.1, 0.2, 0.3]);
    createAdminSupabaseClient.mockReturnValue(
      createAdminClient({
        itemRow,
        memoryRows: [{ statement: 'Family reminders matter.' }],
        updatedRow: {
          ...itemRow,
          cleaned_text: 'Call mom tomorrow at 7:00 PM.',
          type: 'reminder',
          actionability: 'now',
          entities: {
            people: ['mom'],
            dates: ['tomorrow 7pm'],
            places: [],
            urls: [],
          },
          embedding: '[0.1,0.2,0.3]',
          processed: true,
          reminder_at: '2026-03-29T19:00:00',
        },
      }),
    );

    const result = await processItem('item-1');

    expect(classifyItem).toHaveBeenCalledWith(itemRow.raw_input, [
      'Family reminders matter.',
    ]);
    expect(embedText).toHaveBeenCalledWith('Call mom tomorrow at 7:00 PM.');
    expect(result.processed).toBe(true);
    expect(result.reminderAt).toBe('2026-03-29T19:00:00');
  });

  it('leaves the item unprocessed when classification fails', async () => {
    classifyItem.mockRejectedValue(new Error('boom'));
    createAdminSupabaseClient.mockReturnValue(createAdminClient({ itemRow }));

    await expect(processItem('item-1')).rejects.toThrow('boom');
    expect(embedText).not.toHaveBeenCalled();
  });

  it('throws when the item is already processed', async () => {
    createAdminSupabaseClient.mockReturnValue(
      createAdminClient({
        itemRow: {
          ...itemRow,
          processed: true,
        },
      }),
    );

    await expect(processItem('item-1')).rejects.toMatchObject({
      status: 409,
    });
  });
});
