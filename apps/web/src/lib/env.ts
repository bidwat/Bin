const required = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

export function getPublicEnv() {
  if (!required.supabaseUrl || !required.supabasePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  return {
    supabaseUrl: required.supabaseUrl,
    supabasePublishableKey: required.supabasePublishableKey,
  };
}
