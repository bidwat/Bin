const required = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
} as const;

const requiredServer = {
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  webhookSecret: process.env.WEBHOOK_SECRET,
  cronSecret: process.env.CRON_SECRET,
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

export function getServerEnv() {
  const env = getPublicEnv();

  if (
    !requiredServer.supabaseSecretKey ||
    !requiredServer.webhookSecret ||
    !requiredServer.cronSecret
  ) {
    throw new Error(
      'Missing SUPABASE_SECRET_KEY, WEBHOOK_SECRET, or CRON_SECRET',
    );
  }

  return {
    ...env,
    supabaseSecretKey: requiredServer.supabaseSecretKey,
    webhookSecret: requiredServer.webhookSecret,
    cronSecret: requiredServer.cronSecret,
  };
}
