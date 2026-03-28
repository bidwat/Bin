import { createTokenSupabaseClient } from '@bin/supabase';
import type { Database } from '@bin/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicEnv } from '@/lib/env';
import { createSupabaseServerClient } from '@/lib/supabase/server';

type AuthenticatedRouteContext = {
  accessToken: string | null;
  client: SupabaseClient<Database>;
  user: { id: string; email: string | null } | null;
};

export async function getAuthenticatedRouteContext(
  request: Request,
): Promise<AuthenticatedRouteContext> {
  const authorization = request.headers.get('authorization');
  const env = getPublicEnv();

  if (authorization?.startsWith('Bearer ')) {
    const accessToken = authorization.slice('Bearer '.length);
    const client = createTokenSupabaseClient(
      env.supabaseUrl,
      env.supabasePublishableKey,
      accessToken,
    );
    const {
      data: { user },
    } = await client.auth.getUser(accessToken);

    return {
      accessToken,
      client,
      user: user
        ? {
            id: user.id,
            email: user.email ?? null,
          }
        : null,
    };
  }

  const client = await createSupabaseServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  return {
    accessToken: null,
    client,
    user: user
      ? {
          id: user.id,
          email: user.email ?? null,
        }
      : null,
  };
}

export type UserProfileRow = Database['public']['Tables']['users']['Row'];
