import { getOpenAIClient } from './client';
import { AiError } from './errors';

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeStatus = 'status' in error ? error.status : undefined;
  const maybeCode = 'code' in error ? error.code : undefined;

  return maybeStatus === 429 || maybeCode === 'rate_limit_exceeded';
}

export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0]?.embedding ?? [];
    } catch (error) {
      const canRetry = attempt < 3 && isRateLimitError(error);

      if (!canRetry) {
        throw new AiError('Embedding request failed', {
          code: isRateLimitError(error) ? 'RATE_LIMIT' : 'OPENAI',
          cause: error,
          retriable: isRateLimitError(error),
        });
      }

      await delay(1000 * 2 ** attempt);
    }
  }

  throw new AiError('Embedding request failed after retries', {
    code: 'RATE_LIMIT',
    retriable: true,
  });
}
