import { createBrowserClient, createServerClient } from '@supabase/ssr';

import type { Database } from './database.types';

export type BinDatabase = Database;

type CookieAdapter = {
  getAll: () => { name: string; value: string }[];
  setAll: (
    cookies: {
      name: string;
      value: string;
      options?: Record<string, unknown>;
    }[],
  ) => void;
};

export function createClient(url: string, key: string) {
  return createBrowserClient<Database>(url, key);
}

export function createServerSupabaseClient(
  url: string,
  key: string,
  cookieStore: CookieAdapter,
) {
  return createServerClient<Database>(url, key, {
    cookies: cookieStore,
  });
}
