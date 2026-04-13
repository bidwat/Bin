import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotificationBridge } from '../src/components/NotificationBridge';
import { TimezoneSync } from '../src/components/TimezoneSync';
import { SessionProvider } from '../src/lib/session';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <NotificationBridge />
        <TimezoneSync />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
