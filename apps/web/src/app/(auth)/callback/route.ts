import { createServerSupabaseClient, type CookieAdapter } from '@bin/supabase';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { getPublicEnv } from '@/lib/env';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;
  const cookieStore = await cookies();
  const env = getPublicEnv();

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const cookieAdapter: CookieAdapter = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        cookieStore.set(name, value, options);
      });
    },
  };

  const supabase = createServerSupabaseClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    cookieAdapter,
  );

  await supabase.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(`${origin}/feed`);
}
