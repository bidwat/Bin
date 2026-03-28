import { Actionability, ItemType } from '@bin/shared';
import { z } from 'zod';

import { getOpenAIClient } from './client';
import { AiError } from './errors';
import { CLASSIFY_PROMPT } from './prompts/classify';

export const classificationSchema = z.object({
  cleaned_text: z.string().trim().min(1),
  type: z.nativeEnum(ItemType),
  actionability: z.nativeEnum(Actionability),
  entities: z.object({
    people: z.array(z.string()),
    dates: z.array(z.string()),
    places: z.array(z.string()),
    urls: z.array(z.string()),
  }),
  reminder_at: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

function buildMessages(rawInput: string, userMemory: string[], retry = false) {
  const memoryBlock =
    userMemory.length > 0
      ? `User memory:\n- ${userMemory.join('\n- ')}`
      : 'User memory: none';

  return [
    {
      role: 'system' as const,
      content: CLASSIFY_PROMPT,
    },
    {
      role: 'user' as const,
      content: `${memoryBlock}\n\nRaw input:\n${rawInput}`,
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

function parseClassification(content: string) {
  const parsedJson = JSON.parse(content) as unknown;
  return classificationSchema.parse(parsedJson);
}

export async function classifyItem(rawInput: string, userMemory: string[]) {
  const client = getOpenAIClient();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-5-nano',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: buildMessages(rawInput, userMemory, attempt > 0),
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new AiError('OpenAI returned an empty classification response', {
          code: 'OPENAI',
        });
      }

      return parseClassification(content);
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
        throw new AiError('OpenAI returned invalid classification JSON', {
          code: 'VALIDATION',
          cause: error,
        });
      }

      throw new AiError('Classification failed', {
        code: 'OPENAI',
        cause: error,
      });
    }
  }

  throw new AiError('Classification failed after retry', {
    code: 'VALIDATION',
  });
}
