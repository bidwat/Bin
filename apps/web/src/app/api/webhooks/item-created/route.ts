import { jsonResponse } from '@/lib/api-response';
import { getServerEnv } from '@/lib/env';
import { ProcessItemError, processItem } from '@/services/processItem';

const webhookSchemaMessage = 'Invalid webhook payload';

export async function POST(request: Request) {
  const env = getServerEnv();
  const signature = request.headers.get('x-bin-webhook-secret');

  if (signature !== env.webhookSecret) {
    console.warn('item-created webhook rejected: invalid secret');
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as {
    record?: { id?: string };
    id?: string;
    type?: string;
    table?: string;
  } | null;
  const itemId = payload?.record?.id ?? payload?.id;

  if (!itemId) {
    console.warn('item-created webhook rejected: invalid payload', {
      type: payload?.type ?? null,
      table: payload?.table ?? null,
      hasRecord: Boolean(payload?.record),
    });
    return jsonResponse(
      request,
      { error: webhookSchemaMessage },
      { status: 422 },
    );
  }

  try {
    console.info('item-created webhook received', {
      itemId,
      type: payload?.type ?? null,
      table: payload?.table ?? null,
    });
    const item = await processItem(itemId);
    console.info('item-created webhook processed item', {
      itemId,
      processed: item.processed,
    });
    return jsonResponse(request, { ok: true, item });
  } catch (error) {
    if (error instanceof ProcessItemError) {
      console.error('item-created webhook failed', {
        itemId,
        message: error.message,
        status: error.status,
      });
      return jsonResponse(
        request,
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('item-created webhook failed unexpectedly', {
      itemId,
      error,
    });
    return jsonResponse(
      request,
      { error: 'Failed to process item webhook' },
      { status: 500 },
    );
  }
}
