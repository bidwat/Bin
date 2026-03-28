import { Stack } from 'expo-router';

import { AuthGuard } from '../../src/components/AuthGuard';

export default function AuthLayout() {
  return (
    <AuthGuard requireAuth={false}>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGuard>
  );
}
