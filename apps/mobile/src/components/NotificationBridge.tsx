import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { updateProfile } from '../lib/api';
import { useSession } from '../lib/session';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;

  const tokenResponse = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  return tokenResponse.data ?? null;
}

export function NotificationBridge() {
  const router = useRouter();
  const { session } = useSession();
  const registeredTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user?.id) {
      registeredTokenRef.current = null;
      return;
    }

    let cancelled = false;

    void registerForPushNotificationsAsync()
      .then(async (pushToken) => {
        if (
          cancelled ||
          !pushToken ||
          pushToken === registeredTokenRef.current
        ) {
          return;
        }

        registeredTokenRef.current = pushToken;
        await updateProfile({
          push_token: pushToken,
        });
      })
      .catch((error: unknown) => {
        console.warn('Unable to register for push notifications', error);
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const itemId = response.notification.request.content.data.itemId;
        if (typeof itemId === 'string' && itemId.length > 0) {
          router.push(`/(app)/item/${itemId}`);
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

  return null;
}
