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

export async function transcribeAudio(buffer: Buffer, mimeType: string) {
  try {
    const arrayBuffer = Uint8Array.from(buffer).buffer;
    const file = new File(
      [arrayBuffer],
      `capture.${extensionForMimeType(mimeType)}`,
      {
        type: mimeType,
      },
    );

    const response = await getOpenAIClient().audio.transcriptions.create({
      file,
      model: 'whisper-1',
    });

    return response.text;
  } catch (error) {
    throw new AiError('Transcription failed', {
      code: 'OPENAI',
      cause: error,
    });
  }
}
