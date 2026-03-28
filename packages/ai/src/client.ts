import OpenAI from 'openai';

import { AiError } from './errors';

let client: OpenAI | null = null;

export function getOpenAIClient(apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    throw new AiError('OPENAI_API_KEY is required', {
      code: 'CONFIG',
    });
  }

  client ??= new OpenAI({ apiKey });
  return client;
}
