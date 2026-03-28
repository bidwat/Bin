'use client';

import { createClient as createSupabaseClient } from '@bin/supabase';

import { getPublicEnv } from '@/lib/env';

type BrowserSupabaseClient = ReturnType<typeof createSupabaseClient>;

let browserClient: BrowserSupabaseClient | null = null;

export function createSupabaseBrowserClient(): BrowserSupabaseClient {
  if (!browserClient) {
    const env = getPublicEnv();
    browserClient = createSupabaseClient(
      env.supabaseUrl,
      env.supabasePublishableKey,
    );
  }

  return browserClient;
}
