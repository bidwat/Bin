import { ItemType } from '@bin/shared';

import { getOpenAIClient } from './client';
import { AiError } from './errors';

function scopeLabel(typeScope: ItemType | null | undefined) {
  return typeScope ? `Type scope: ${typeScope}` : 'Type scope: mixed';
}

export async function labelCluster(
  sampleTexts: string[],
  typeScope: ItemType | null,
  level: 'collection' | 'subcluster' = 'collection',
) {
  try {
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You generate short, human-readable labels for clusters in a personal notes app.

Return plain text only.
Rules:
1. Write 2 to 5 words.
2. Be concrete and thematic, not generic.
3. Do not include quotation marks, numbering, or punctuation unless required.
4. Prefer labels a human would naturally use as a folder name.
5. This label is for a ${level}.`,
        },
        {
          role: 'user',
          content: `${scopeLabel(typeScope)}\n\nSample texts:\n- ${sampleTexts.join('\n- ')}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();

    if (!content) {
      throw new AiError('OpenAI returned an empty cluster label', {
        code: 'OPENAI',
      });
    }

    return content.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 80);
  } catch (error) {
    if (error instanceof AiError) {
      throw error;
    }

    throw new AiError('Cluster labeling failed', {
      code: 'OPENAI',
      cause: error,
    });
  }
}
