import { jsonResponse } from '@/lib/api-response';
import { getServerEnv } from '@/lib/env';
import { ProcessItemError, processItem } from '@/services/processItem';

const webhookSchemaMessage = 'Invalid webhook payload';

export async function POST(request: Request) {
  const env = getServerEnv();
  const signature = request.headers.get('x-bin-webhook-secret');

  if (signature !== env.webhookSecret) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    record?: { id?: string };
  } | null;
  const itemId = payload?.record?.id;

  if (!itemId) {
    return jsonResponse(
      request,
      { error: webhookSchemaMessage },
      { status: 422 },
    );
  }

  try {
    const item = await processItem(itemId);
    return jsonResponse(request, { ok: true, item });
  } catch (error) {
    if (error instanceof ProcessItemError) {
      return jsonResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }

    return jsonResponse(
      request,
      { error: 'Failed to process item webhook' },
      { status: 500 },
    );
  }
}
