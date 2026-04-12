import { getOpenAIClient } from './client';
import { AiError } from './errors';

const IMAGE_DESCRIPTION_PROMPT = `You are describing an image so it can be stored as a capture in a personal inbox app.

Return plain text only.

Priorities:
1. If there is readable text, include the important text first.
2. Then describe the image concisely in 1-3 sentences.
3. Mention obvious entities like people, places, brands, products, dates, or screens when visible.
4. Do not mention that you are an AI or that this is an uploaded image.
5. Do not use markdown or bullet points.`;

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
