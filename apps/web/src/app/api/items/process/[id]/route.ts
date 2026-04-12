import { jsonResponse } from '@/lib/api-response';
import { getAuthenticatedRouteContext } from '@/lib/auth';
import { isUuid } from '@/lib/ids';
import {
  getProcessableItemForUser,
  ProcessItemError,
  processItem,
} from '@/services/processItem';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { user } = await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    if (!isUuid(id)) {
      return jsonResponse(
        request,
        { error: 'Invalid item id' },
        { status: 422 },
      );
    }

    const item = await getProcessableItemForUser(id, user.id);

    if (item.processed) {
      return jsonResponse(
        request,
        { error: 'Item is already processed' },
        { status: 409 },
      );
    }

    const processedItem = await processItem(id);
    return jsonResponse(request, { item: processedItem });
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
      { error: 'Failed to process item' },
      { status: 500 },
    );
  }
}
