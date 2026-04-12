import { toFile } from 'openai';

import { getOpenAIClient } from './client';
import { AiError } from './errors';

function extensionForMimeType(mimeType: string) {
  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('wav')) return 'wav';
  return 'audio';
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isConnectionError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const maybeCause = 'cause' in error ? error.cause : undefined;
  const maybeMessage = 'message' in error ? String(error.message) : '';
  const maybeCode =
    maybeCause && typeof maybeCause === 'object' && 'code' in maybeCause
      ? maybeCause.code
      : undefined;

  return (
    maybeCode === 'ECONNRESET' ||
    maybeCode === 'ETIMEDOUT' ||
    maybeMessage.toLowerCase().includes('connection error')
  );
}

export async function transcribeAudio(buffer: Buffer, mimeType: string) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const file = await toFile(
        buffer,
        `capture.${extensionForMimeType(mimeType)}`,
        {
          type: mimeType,
        },
      );

      const response = await getOpenAIClient().audio.transcriptions.create(
        {
          file,
          model: 'gpt-4o-mini-transcribe',
          language: 'en',
        },
        {
          maxRetries: 0,
          timeout: 30_000,
        },
      );

      return response.text;
    } catch (error) {
      const canRetry = attempt < 1 && isConnectionError(error);

      if (canRetry) {
        await delay(1000 * (attempt + 1));
        continue;
      }

      throw new AiError('Transcription failed', {
        code: isConnectionError(error) ? 'RATE_LIMIT' : 'OPENAI',
        cause: error,
        retriable: isConnectionError(error),
      });
    }
  }

  throw new AiError('Transcription failed after retries', {
    code: 'OPENAI',
    retriable: true,
  });
}
