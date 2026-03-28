import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useSession } from '../lib/session';

export function AuthGuard({
  children,
  requireAuth,
}: {
  children: React.ReactNode;
  requireAuth: boolean;
}) {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f4ec',
        }}
      >
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    );
  }

  if (requireAuth && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!requireAuth && session) {
    return <Redirect href="/(app)/feed" />;
  }

  return <>{children}</>;
}
