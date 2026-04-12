import { embedText, understandSearchQuery } from '@bin/ai';
import { createAdminSupabaseClient } from '@bin/supabase';

import { jsonResponse, optionsResponse } from '@/lib/api-response';
import { getAuthenticatedRouteContext } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { mapItemRow } from '@/lib/items';
import { searchItemsSchema } from '@/lib/validation';

function serializeEmbedding(embedding: number[]) {
  return `[${embedding.join(',')}]`;
}

type MatchRow = {
  id: string;
  similarity: number;
};

const SEARCH_MATCH_THRESHOLD = 0.55;

function escapeIlike(input: string) {
  return input.replace(/[%_,]/g, ' ').trim();
}

function dedupeQueries(queries: string[]) {
  return [...new Set(queries.map((query) => query.trim()).filter(Boolean))];
}

async function buildSearchQueries(query: string) {
  try {
    const understood = await understandSearchQuery(query);
    return dedupeQueries([
      query,
      understood.normalized_query,
      ...understood.search_phrases,
    ]);
  } catch {
    return [query];
  }
}

async function getVectorMatches(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  queryVariants: string[],
  limit: number,
) {
  const mergedMatches = new Map<string, MatchRow>();

  for (const queryVariant of queryVariants) {
    const embedding = await embedText(queryVariant);
    const { data: matchedRows, error: matchError } = await supabase.rpc(
      'match_items',
      {
        query_embedding: serializeEmbedding(embedding),
        match_user_id: userId,
        match_threshold: SEARCH_MATCH_THRESHOLD,
        match_count: limit,
      },
    );

    if (matchError) {
      throw matchError;
    }

    for (const match of (matchedRows ?? []) as MatchRow[]) {
      const existing = mergedMatches.get(match.id);

      if (!existing || match.similarity > existing.similarity) {
        mergedMatches.set(match.id, match);
      }
    }
  }

  return [...mergedMatches.values()];
}

async function getKeywordMatches(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  userId: string,
  queryVariants: string[],
  limit: number,
) {
  const mergedMatches = new Map<string, MatchRow>();

  for (const queryVariant of queryVariants) {
    const keywordQuery = escapeIlike(queryVariant);

    if (!keywordQuery) {
      continue;
    }

    const { data: keywordItems, error: keywordError } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .or(
        `raw_input.ilike.%${keywordQuery}%,cleaned_text.ilike.%${keywordQuery}%`,
      )
      .limit(limit);

    if (keywordError) {
      throw keywordError;
    }

    for (const item of keywordItems ?? []) {
      if (!mergedMatches.has(item.id)) {
        mergedMatches.set(item.id, {
          id: item.id,
          similarity: 0.5,
        });
      }
    }
  }

  return [...mergedMatches.values()];
}

export async function POST(request: Request) {
  const { user } = await getAuthenticatedRouteContext(request);

  if (!user) {
    return jsonResponse(request, { error: 'Unauthorized' }, { status: 401 });
  }

  const parsedPayload = searchItemsSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsedPayload.success) {
    return jsonResponse(
      request,
      { error: parsedPayload.error.issues[0]?.message ?? 'Invalid query' },
      { status: 422 },
    );
  }

  const { query, limit = 20 } = parsedPayload.data;
  const env = getServerEnv();
  const supabase = createAdminSupabaseClient(
    env.supabaseUrl,
    env.supabaseSecretKey,
  );

  const queryVariants = await buildSearchQueries(query);

  await supabase.from('search_history').insert({
    user_id: user.id,
    query,
  });

  let vectorMatches: MatchRow[];
  let keywordMatches: MatchRow[];

  try {
    [vectorMatches, keywordMatches] = await Promise.all([
      getVectorMatches(supabase, user.id, queryVariants, limit),
      getKeywordMatches(supabase, user.id, queryVariants, limit),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';

    return jsonResponse(request, { error: message }, { status: 500 });
  }

  const mergedMatches = new Map<string, MatchRow>();

  for (const match of keywordMatches) {
    mergedMatches.set(match.id, match);
  }

  for (const match of vectorMatches) {
    const existing = mergedMatches.get(match.id);

    if (!existing || match.similarity > existing.similarity) {
      mergedMatches.set(match.id, match);
    }
  }

  const matches = [...mergedMatches.values()]
    .sort((left, right) => right.similarity - left.similarity)
    .slice(0, limit);

  if (matches.length === 0) {
    return jsonResponse(request, { results: [] });
  }

  const ids = matches.map((match) => match.id);
  const { data: items, error: itemsError } = await supabase
    .from('items')
    .select('*')
    .in('id', ids)
    .eq('user_id', user.id);

  if (itemsError || !items) {
    return jsonResponse(
      request,
      { error: itemsError?.message ?? 'Failed to load search results' },
      { status: 500 },
    );
  }

  const itemsById = new Map(items.map((item) => [item.id, mapItemRow(item)]));
  const results = matches
    .map((match) => {
      const item = itemsById.get(match.id);

      if (!item) {
        return null;
      }

      return {
        item,
        similarity: match.similarity,
      };
    })
    .filter(Boolean);

  return jsonResponse(request, { results });
}

export function OPTIONS(request: Request) {
  return optionsResponse(request);
}
