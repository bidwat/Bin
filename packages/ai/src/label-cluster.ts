import { ItemType } from '@bin/shared';

import { getOpenAIClient } from './client';
import { AiError } from './errors';
import { LABEL_CLUSTER_PROMPT } from './prompts/label-cluster';

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
          content: `${LABEL_CLUSTER_PROMPT}\n5. This label is for a ${level}.`,
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
