import type { Database } from '@bin/supabase';

import { getAuthenticatedRouteContext } from '@/lib/auth';
import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { mapItemRow } from '@/lib/items';
import { createUrlItemSchema } from '@/lib/validation';

function stripMarkup(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string, fallbackUrl: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim() || fallbackUrl;
}

function extractSnippet(html: string) {
  return stripMarkup(html).slice(0, 500).trim();
}

export async function POST(request: Request) {
  const { client: supabase, user } =
    await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const parsedPayload = createUrlItemSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      {
        error: parsedPayload.error.issues[0]?.message ?? 'Invalid URL payload',
      },
      { status: 422 },
    );
  }

  const { url } = parsedPayload.data;

  let html = '';

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent':
          'BinBot/1.0 (+https://bin-production-99ed.up.railway.app)',
      },
    });

    if (!response.ok) {
      return jsonResponse(
        request,
        { error: `Failed to fetch URL (${response.status})` },
        { status: 502 },
      );
    }

    html = await response.text();
  } catch {
    return jsonResponse(
      request,
      { error: 'Failed to fetch target URL' },
      { status: 502 },
    );
  }

  const title = extractTitle(html, url);
  const snippet = extractSnippet(html);
  const rawInput = `URL: ${title}\n\n${snippet || url}\n\n${url}`;

  const insertPayload: Database['public']['Tables']['items']['Insert'] = {
    user_id: user.id,
    raw_input: rawInput,
    source: 'url',
    entities: {
      urls: [url],
    },
  };

  const { data, error } = await supabase
    .from('items')
    .insert(insertPayload as never)
    .select('*')
    .single();

  if (error || !data) {
    return jsonResponse(
      request,
      { error: error?.message ?? 'Failed to create URL item' },
      { status: 500 },
    );
  }

  return jsonResponse(request, { item: mapItemRow(data) }, { status: 201 });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
