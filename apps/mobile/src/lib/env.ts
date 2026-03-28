import { Platform } from 'react-native';

export function getMobileEnv() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const apiBaseUrl =
    Platform.OS === 'web'
      ? (process.env.EXPO_PUBLIC_API_BASE_URL_WEB ??
        process.env.EXPO_PUBLIC_API_BASE_URL ??
        'http://localhost:3000')
      : (process.env.EXPO_PUBLIC_API_BASE_URL_NATIVE ??
        process.env.EXPO_PUBLIC_API_BASE_URL ??
        'http://localhost:3000');

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    );
  }

  return {
    supabaseUrl,
    supabasePublishableKey,
    apiBaseUrl,
  };
}
