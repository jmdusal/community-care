import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { apiFetch } from './api';

/**
 * Push notifications when the app is closed. Needs a development or store build with an
 * EAS project id (Expo Go on Android cannot receive remote pushes since SDK 53). Without
 * one, registration is skipped and the app still gets notifications live while open.
 */
const PUSH_KEY = 'communitycare.pushToken';

export type PushRegistration = 'registered' | 'denied' | 'unavailable';

export async function registerPush(): Promise<PushRegistration> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!Device.isDevice || !projectId) {
    return 'unavailable';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', { name: 'CommunityCare', importance: AndroidImportance.HIGH });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    status = (await Notifications.requestPermissionsAsync()).status;
  }
  if (status !== 'granted') {
    return 'denied';
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await apiFetch('/me/push-tokens', { method: 'POST', body: { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' } });
    await SecureStore.setItemAsync(PUSH_KEY, token);

    return 'registered';
  } catch {
    return 'unavailable';
  }
}

/** At sign-out: this phone stops receiving the account's notifications. */
export async function unregisterPush(): Promise<void> {
  const token = await SecureStore.getItemAsync(PUSH_KEY);
  if (token) {
    await apiFetch('/me/push-tokens', { method: 'DELETE', body: { token } }).catch(() => undefined);
    await SecureStore.deleteItemAsync(PUSH_KEY);
  }
}

/** Show notifications as banners when one arrives while the app is open. */
export function configureNotificationDisplay(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}
