import { Tabs } from 'expo-router';

import { AuthGuard } from '../../src/components/AuthGuard';

export default function AppLayout() {
  return (
    <AuthGuard requireAuth>
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: '#f8f4ec' },
          tabBarStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Tabs.Screen
          name="feed"
          options={{ title: 'Feed', tabBarLabel: 'Feed' }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: 'Settings', tabBarLabel: 'Settings' }}
        />
        <Tabs.Screen name="item/[id]" options={{ href: null, title: 'Item' }} />
      </Tabs>
    </AuthGuard>
  );
}
