import {
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  SchedulableTriggerInputTypes,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { getMessages } from '@/i18n';

export const reminderSupported = true;

setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL = 'daily-reminder';

/** Replaces any existing reminder with a daily one; false if permission was denied. */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const t = getMessages().notification;
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL, {
      name: t.channel,
      importance: AndroidImportance.DEFAULT,
    });
  }
  const { granted } = await requestPermissionsAsync();
  if (!granted) return false;
  await cancelAllScheduledNotificationsAsync();
  await scheduleNotificationAsync({
    content: { title: t.title, body: t.body },
    trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelDailyReminder() {
  await cancelAllScheduledNotificationsAsync();
}
