// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { classifyItem } from '../classify';
import { AiError } from '../errors';

const create = vi.fn();

vi.mock('../client', () => ({
  getOpenAIClient: () => ({
    chat: {
      completions: {
        create,
      },
    },
  }),
}));

describe('classifyItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('classifies a task capture', async () => {
    create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              cleaned_text: 'Buy oat milk after work.',
              type: 'task',
              actionability: 'now',
              entities: { people: [], dates: [], places: [], urls: [] },
              reminder_at: null,
              confidence: 0.95,
            }),
          },
        },
      ],
    });

    const result = await classifyItem('buy oat milk after work', []);
    expect(result.type).toBe('task');
  });

  it('classifies a reminder with a date', async () => {
    create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
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
              confidence: 0.91,
            }),
          },
        },
      ],
    });

    const result = await classifyItem(
      'remind me to call mom tomorrow at 7pm',
      [],
    );
    expect(result.type).toBe('reminder');
    expect(result.reminder_at).toBe('2026-03-29T19:00:00');
  });

  it('retries once when the model returns invalid JSON', async () => {
    create
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{invalid json' } }],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                cleaned_text: 'Save article.',
                type: 'reference',
                actionability: 'eventually',
                entities: {
                  people: [],
                  dates: [],
                  places: [],
                  urls: ['https://example.com'],
                },
                reminder_at: null,
                confidence: 0.9,
              }),
            },
          },
        ],
      });

    const result = await classifyItem('https://example.com article', []);
    expect(result.type).toBe('reference');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('throws a typed AiError on API failure', async () => {
    create.mockRejectedValue(new Error('boom'));

    await expect(classifyItem('hello', [])).rejects.toBeInstanceOf(AiError);
  });
});
