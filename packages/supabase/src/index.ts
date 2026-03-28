import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient as createBaseClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

export type { Database, Json } from './database.types';
export type BinDatabase = Database;

export type CookieAdapter = {
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

export function createTokenSupabaseClient(
  url: string,
  key: string,
  token: string,
) {
  return createBaseClient<Database>(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function createAdminSupabaseClient(url: string, key: string) {
  return createBaseClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
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
