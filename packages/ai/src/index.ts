import OpenAI from 'openai';

export const PROMPTS = {
  classifyInput: `Rewrite the input as clean text, split distinct thoughts, classify each item, and extract entities.`,
  labelCluster: `Given related item texts, produce a short descriptive collection label.`,
  summarizeDigest: `Summarize the user's most relevant items into a concise daily digest.`,
} as const;

let client: OpenAI | null = null;

export function getOpenAIClient(apiKey = process.env.OPENAI_API_KEY) {
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  client ??= new OpenAI({ apiKey });
  return client;
}

export async function createEmbedding(input: string) {
  return getOpenAIClient().embeddings.create({
    model: 'text-embedding-3-small',
    input,
  });
}
