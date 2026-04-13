import { getOpenAIClient } from './client';
import { AiError } from './errors';
import { IMAGE_DESCRIPTION_PROMPT } from './prompts/describe-image';

export async function describeImage(buffer: Buffer, mimeType: string) {
  const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;

  try {
    const response = await getOpenAIClient().responses.create({
      model: 'gpt-5-nano',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: IMAGE_DESCRIPTION_PROMPT }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: 'Extract visible text and describe the image for later recall.',
            },
            {
              type: 'input_image',
              image_url: dataUrl,
              detail: 'low',
            },
          ],
        },
      ],
    });

    const output = response.output_text.trim();

    if (!output) {
      throw new AiError('OpenAI returned an empty image description', {
        code: 'OPENAI',
      });
    }

    return output;
  } catch (error) {
    if (error instanceof AiError) {
      throw error;
    }

    throw new AiError('Image description failed', {
      code: 'OPENAI',
      cause: error,
    });
  }
}
