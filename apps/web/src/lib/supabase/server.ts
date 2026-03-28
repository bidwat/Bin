import { createServerSupabaseClient as createSupabaseServer } from '@bin/supabase';
import { cookies } from 'next/headers';

import { getPublicEnv } from '@/lib/env';

type ServerSupabaseClient = ReturnType<typeof createSupabaseServer>;

export async function createSupabaseServerClient(): Promise<ServerSupabaseClient> {
  const cookieStore = await cookies();
  const env = getPublicEnv();

  return createSupabaseServer(env.supabaseUrl, env.supabasePublishableKey, {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  });
}
