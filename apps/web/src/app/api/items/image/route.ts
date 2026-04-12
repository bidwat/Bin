import { randomUUID } from 'node:crypto';

import type { Database } from '@bin/supabase';
import { AiError, describeImage } from '@bin/ai';
import { createAdminSupabaseClient } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { getServerEnv } from '@/lib/env';
import { mapItemRow } from '@/lib/items';

const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const STORAGE_BUCKET = 'item-attachments';
const allowedMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

function resolveImageMimeType(image: File) {
  const normalizedType = image.type.split(';')[0]?.trim().toLowerCase();

  if (normalizedType) {
    return normalizedType;
  }

  const lowerName = image.name.toLowerCase();

  if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (lowerName.endsWith('.png')) {
    return 'image/png';
  }

  if (lowerName.endsWith('.webp')) {
    return 'image/webp';
  }

  if (lowerName.endsWith('.heic')) {
    return 'image/heic';
  }

  if (lowerName.endsWith('.heif')) {
    return 'image/heif';
  }

  return '';
}

function extensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    case 'image/heif':
      return 'heif';
    default:
      return 'bin';
  }
}

async function ensureStorageBucket() {
  const env = getServerEnv();
  const admin = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );
  const { error } = await admin.storage.createBucket(STORAGE_BUCKET, {
    public: true,
    fileSizeLimit: `${MAX_IMAGE_BYTES}`,
    allowedMimeTypes,
  });

  if (
    error &&
    !error.message.toLowerCase().includes('already exists') &&
    !error.message.toLowerCase().includes('duplicate')
  ) {
    throw error;
  }

  const { error: updateError } = await admin.storage.updateBucket(
    STORAGE_BUCKET,
    {
      public: true,
      fileSizeLimit: `${MAX_IMAGE_BYTES}`,
      allowedMimeTypes,
    },
  );

  if (updateError && !updateError.message.toLowerCase().includes('not found')) {
    throw updateError;
  }

  return admin;
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

    if (error instanceof Error) {
      return jsonResponse(
        request,
        { error: error.message || 'Image capture failed' },
        { status: 500 },
      );
    }

    return jsonResponse(
      request,
      { error: 'Image capture failed' },
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
  const image = formData?.get('image');

  if (!(image instanceof File)) {
    return jsonResponse(
      request,
      { error: 'Image file is required' },
      { status: 422 },
    );
  }

  const mimeType = resolveImageMimeType(image);

  if (!allowedMimeTypes.includes(mimeType)) {
    return jsonResponse(
      request,
      { error: 'Unsupported image type' },
      { status: 422 },
    );
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonResponse(
      request,
      { error: 'Image file exceeds 20MB limit' },
      { status: 422 },
    );
  }

  const buffer = Buffer.from(await image.arrayBuffer());
  const description = (await describeImage(buffer, mimeType)).trim();

  if (!description) {
    return jsonResponse(
      request,
      { error: 'Image description was empty' },
      { status: 422 },
    );
  }

  const admin = await ensureStorageBucket();
  const extension = extensionForMimeType(mimeType);
  const storagePath = `${user.id}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return jsonResponse(
      request,
      { error: uploadError.message || 'Failed to upload image' },
      { status: 500 },
    );
  }

  const { data: publicUrlData } = admin.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const insertPayload: Database['public']['Tables']['items']['Insert'] = {
    user_id: user.id,
    raw_input: description,
    source: 'image',
    entities: {
      attachment_url: publicUrlData.publicUrl,
    },
  };

  const { data, error } = await supabase
    .from('items')
    .insert(insertPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to create image item' },
      { status: 500 },
    );
  }

  return jsonResponse(
    request,
    {
      item: mapItemRow(data),
      description,
    },
    { status: 201 },
  );
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
