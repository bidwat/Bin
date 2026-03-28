// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { embedText } from '../embed';
import { AiError } from '../errors';

const create = vi.fn();

vi.mock('../client', () => ({
  getOpenAIClient: () => ({
    embeddings: {
      create,
    },
  }),
}));

describe('embedText', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it('calls the correct model and returns an embedding', async () => {
    const embedding = Array.from({ length: 1536 }, (_, index) => index / 1000);
    create.mockResolvedValue({
      data: [{ embedding }],
    });

    const result = await embedText('hello');
    expect(result).toHaveLength(1536);
    expect(create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'hello',
    });
  });

  it('retries on rate limit errors', async () => {
    const embedding = Array.from({ length: 1536 }, () => 0.1);
    create
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ data: [{ embedding }] });

    const promise = embedText('retry me');
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result).toHaveLength(1536);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries', async () => {
    create.mockRejectedValue({ status: 429 });

    const expectation = expect(
      embedText('still failing'),
    ).rejects.toBeInstanceOf(AiError);
    await vi.runAllTimersAsync();
    await expectation;
    expect(create).toHaveBeenCalledTimes(4);
  });
});
