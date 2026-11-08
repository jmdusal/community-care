import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EmergencyButton } from '@/components/facility/EmergencyButton';
import { BackButton } from '@/components/ui/BackButton';
import { LiveBanner } from '@/components/account/LiveBanner';
import { useMe } from '@/lib/auth';
import { appRouteFor, useLiveNotifications } from '@/lib/notifications';
import { configureNotificationDisplay, registerPush } from '@/lib/push';
import { colors } from '@/lib/theme';

configureNotificationDisplay();

/** Signed-in extras: live notifications while open, push registration, and opening a tapped push. */
function SignedInServices() {
  const me = useMe();
  const userId = me.data?.id;
  const live = useLiveNotifications(userId);

  useEffect(() => {
    if (userId) {
      void registerPush();
    }
  }, [userId]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      router.push(appRouteFor(typeof path === 'string' ? path : null) as never);
    });

    return () => subscription.remove();
  }, []);

  return live.latest ? (
    <LiveBanner
      title={live.latest.title}
      body={live.latest.body}
      onOpen={() => { router.push(appRouteFor(live.latest?.path ?? null) as never); live.dismiss(); }}
      onDismiss={live.dismiss}
    />
  ) : null;
}

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          // Weak connectivity: retry a few times and keep results for 5 minutes.
          queries: { retry: 2, retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000), staleTime: 5 * 60_000, gcTime: 30 * 60_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      {/* Screens fill the space above the emergency banner, which stays pinned to the bottom. */}
      <View style={styles.screens}>
        <Stack screenOptions={{ headerTintColor: colors.brandDark, headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTitleStyle: { fontWeight: '700', color: colors.text }, contentStyle: { backgroundColor: colors.background }, headerRight: EmergencyButton, headerLeft: BackButton, headerBackVisible: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Back' }} />
          <Stack.Screen name="facilities/[id]" options={{ title: 'Facility' }} />
          <Stack.Screen name="programs/[id]" options={{ title: 'Health program' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved facilities' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="sign-in" options={{ title: 'Sign in', presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ title: 'Create account', presentation: 'modal' }} />
          <Stack.Screen name="forgot-password" options={{ title: 'Forgot password', presentation: 'modal' }} />
          <Stack.Screen name="manage-booking" options={{ title: 'Check a booking' }} />
          <Stack.Screen name="profile" options={{ title: 'My profile' }} />
        </Stack>
        <SignedInServices />
      </View>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({ screens: { flex: 1 } });
