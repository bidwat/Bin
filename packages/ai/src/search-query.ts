import { z } from 'zod';

import { getOpenAIClient } from './client';
import { AiError } from './errors';
import { SEARCH_QUERY_PROMPT } from './prompts/search-query';

const searchQuerySchema = z.object({
  normalized_query: z.string().trim().min(1),
  search_phrases: z.array(z.string().trim().min(1)).max(6),
  concepts: z.array(z.string().trim().min(1)).max(6).default([]),
});

export type SearchQueryUnderstanding = z.infer<typeof searchQuerySchema>;

function buildMessages(rawQuery: string, retry = false) {
  return [
    {
      role: 'system' as const,
      content: SEARCH_QUERY_PROMPT,
    },
    {
      role: 'user' as const,
      content: rawQuery,
    },
    ...(retry
      ? [
          {
            role: 'user' as const,
            content:
              'Your last reply was invalid. Return only a valid JSON object that matches the schema exactly.',
          },
        ]
      : []),
  ];
}

function parseSearchQuery(content: string) {
  const parsedJson = JSON.parse(content) as unknown;
  return searchQuerySchema.parse(parsedJson);
}

export async function understandSearchQuery(query: string) {
  const client = getOpenAIClient();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-5-nano',
        response_format: { type: 'json_object' },
        messages: buildMessages(query, attempt > 0),
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new AiError('OpenAI returned an empty search query response', {
          code: 'OPENAI',
        });
      }

      return parseSearchQuery(content);
    } catch (error) {
      const shouldRetry =
        attempt === 0 &&
        (error instanceof SyntaxError || error instanceof z.ZodError);

      if (shouldRetry) {
        continue;
      }

      if (error instanceof AiError) {
        throw error;
      }

      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        throw new AiError('OpenAI returned invalid search query JSON', {
          code: 'VALIDATION',
          cause: error,
        });
      }

      throw new AiError('Search query understanding failed', {
        code: 'OPENAI',
        cause: error,
      });
    }
  }

  throw new AiError('Search query understanding failed after retry', {
    code: 'VALIDATION',
  });
}
