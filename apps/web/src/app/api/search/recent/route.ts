import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { getAuthenticatedRouteContext } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { createAdminSupabaseClient } from '@bin/supabase';

export async function GET(request: Request) {
  const { user } = await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const env = getServerEnv();
  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );

  const { data, error } = await supabase
    .from('search_history')
    .select('query, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(25);

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to load recent searches' },
      { status: 500 },
    );
  }

  const seen = new Set<string>();
  const recent = data
    .filter((entry) => {
      if (seen.has(entry.query)) {
        return false;
      }

      seen.add(entry.query);
      return true;
    })
    .slice(0, 10)
    .map((entry) => entry.query);

  return jsonResponse(request, { recent });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
