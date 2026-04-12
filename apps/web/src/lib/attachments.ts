'use client';

import { createSupabaseBrowserClient } from '@/lib/supabase/client';

const STORAGE_BUCKET = 'item-attachments';

function normalizeAttachmentPath(path: string) {
  return path.startsWith(`${STORAGE_BUCKET}/`)
    ? path.slice(STORAGE_BUCKET.length + 1)
    : path;
}

export function getAttachmentUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const supabase = createSupabaseBrowserClient();
  const { data } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(normalizeAttachmentPath(path));

  return data.publicUrl;
}
