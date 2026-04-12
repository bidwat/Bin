import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { isUuid } from '@/lib/ids';
import { updateClusterSchema } from '@/lib/validation';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  if (!isUuid(id)) {
    return jsonResponse(
      request,
      { error: 'Invalid cluster id' },
      { status: 422 },
    );
  }

  const parsedPayload = updateClusterSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      { error: parsedPayload.error.issues[0]?.message ?? 'Invalid payload' },
      { status: 422 },
    );
  }

  const { data, error } = await supabase
    .from('clusters')
    .update({
      label: parsedPayload.data.label,
      last_updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to update cluster' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { cluster: data });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
