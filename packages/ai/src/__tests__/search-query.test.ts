// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AiError } from '../errors';
import { understandSearchQuery } from '../search-query';

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

describe('understandSearchQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rewrites natural language into compact search phrases', async () => {
    create.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              normalized_query: 'buy milk',
              search_phrases: ['buy milk', 'milk', 'purchase milk'],
              concepts: ['buy', 'shopping'],
            }),
          },
        },
      ],
    });

    const result = await understandSearchQuery(
      'is there a note where i talk about buying milk',
    );

    expect(result.normalized_query).toBe('buy milk');
    expect(result.search_phrases).toContain('milk');
  });

  it('retries once on invalid JSON', async () => {
    create
      .mockResolvedValueOnce({
        choices: [{ message: { content: '{invalid json' } }],
      })
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                normalized_query: 'purchasing something',
                search_phrases: ['purchase', 'buy something'],
                concepts: ['buy', 'purchase'],
              }),
            },
          },
        ],
      });

    const result = await understandSearchQuery(
      'is there a note where i talk about purchasing something',
    );

    expect(result.normalized_query).toBe('purchasing something');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('throws a typed AiError on API failure', async () => {
    create.mockRejectedValue(new Error('boom'));

    await expect(understandSearchQuery('milk')).rejects.toBeInstanceOf(AiError);
  });
});
