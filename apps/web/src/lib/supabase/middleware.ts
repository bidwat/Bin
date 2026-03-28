import { createServerSupabaseClient, type CookieAdapter } from '@bin/supabase';
import { NextResponse, type NextRequest } from 'next/server';

import { getPublicEnv } from '@/lib/env';

export async function updateSession(request: NextRequest) {
  const env = getPublicEnv();
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cookieAdapter: CookieAdapter = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        request.cookies.set(name, value);
        response.cookies.set(name, value, options);
      });
    },
  };

  const supabase = createServerSupabaseClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    cookieAdapter,
  );

  await supabase.auth.getUser();

  return response;
}
