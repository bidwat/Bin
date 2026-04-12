import type { Database } from '@bin/supabase';
import { AiError, transcribeAudio } from '@bin/ai';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { mapItemRow } from '@/lib/items';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const allowedMimePrefixes = [
  'audio/aac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
];

function parseMode(mode: FormDataEntryValue | null) {
  return mode === 'preview' ? 'preview' : 'create';
}

function resolveMimeType(audio: File) {
  const normalizedType = audio.type.split(';')[0]?.trim().toLowerCase();

  if (normalizedType) {
    return normalizedType;
  }

  const lowerName = audio.name.toLowerCase();

  if (lowerName.endsWith('.m4a')) return 'audio/m4a';
  if (lowerName.endsWith('.mp3')) return 'audio/mp3';
  if (lowerName.endsWith('.mp4')) return 'audio/mp4';
  if (lowerName.endsWith('.ogg')) return 'audio/ogg';
  if (lowerName.endsWith('.wav')) return 'audio/wav';
  if (lowerName.endsWith('.webm')) return 'audio/webm';

  return '';
}

export async function POST(request: Request) {
  try {
    return await handlePost(request);
  } catch (error) {
    if (error instanceof AiError) {
      const detail =
        process.env.NODE_ENV === 'development' && error.cause instanceof Error
          ? error.cause.message
          : undefined;

      return jsonResponse(
        request,
        {
          error: error.message,
          ...(detail ? { detail } : {}),
        },
        { status: 502 },
      );
    }

    return jsonResponse(
      request,
      { error: 'Voice transcription failed' },
      { status: 500 },
    );
  }
}

async function handlePost(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const audio = formData?.get('audio');
  const mode = parseMode(formData?.get('mode') ?? null);

  if (!(audio instanceof File)) {
    return jsonResponse(
      request,
      { error: 'Audio file is required' },
      { status: 422 },
    );
  }

  const mimeType = resolveMimeType(audio);

  if (!allowedMimePrefixes.some((prefix) => mimeType.startsWith(prefix))) {
    return jsonResponse(
      request,
      { error: 'Unsupported audio type' },
      { status: 422 },
    );
  }

  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonResponse(
      request,
      { error: 'Audio file exceeds 25MB limit' },
      { status: 422 },
    );
  }

  const transcript = (
    await transcribeAudio(Buffer.from(await audio.arrayBuffer()), mimeType)
  ).trim();

  if (!transcript) {
    return jsonResponse(
      request,
      { error: 'Transcription was empty' },
      { status: 422 },
    );
  }

  if (mode === 'preview') {
    return jsonResponse(request, { transcript });
  }

  const insertPayload: Database['public']['Tables']['items']['Insert'] = {
    user_id: user.id,
    raw_input: transcript,
    source: 'voice',
  };

  const { data, error } = await supabase
    .from('items')
    .insert(insertPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to create voice item' },
      { status: 500 },
    );
  }

  return jsonResponse(
    request,
    { item: mapItemRow(data), transcript },
    { status: 201 },
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
