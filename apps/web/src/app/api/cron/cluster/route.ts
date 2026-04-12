import { createAdminSupabaseClient } from '@bin/supabase';

import { jsonResponse } from '@/lib/api-response';
import { getServerEnv } from '@/lib/env';
import { clusterItemsForUser } from '@/services/clusterItems';

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const env = getServerEnv();

  if (authorization !== `Bearer ${env.cronSecret}`) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('items')
    .select('user_id')
    .gte('created_at', since);

  if (error) {
    return jsonResponse(
      request,
      { error: error.message ?? 'Failed to load recent users' },
      { status: 500 },
    );
  }

  const userIds = [...new Set((data ?? []).map((row) => row.user_id))];
  let clustered = 0;

  for (const userId of userIds) {
    const summary = await clusterItemsForUser(userId, { supabase });

    if (summary.clustered) {
      clustered += 1;
    }
  }

  return jsonResponse(request, { clustered, users: userIds.length });
}
