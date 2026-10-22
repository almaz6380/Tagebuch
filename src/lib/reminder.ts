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
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CHANNEL, {
      name: 'Tägliche Erinnerung',
      importance: AndroidImportance.DEFAULT,
    });
  }
  const { granted } = await requestPermissionsAsync();
  if (!granted) return false;
  await cancelAllScheduledNotificationsAsync();
  await scheduleNotificationAsync({
    content: { title: 'Zeit für dein Tagebuch ✍️', body: 'Wie war dein Tag? Ein paar Zeilen reichen schon.' },
    trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelDailyReminder() {
  await cancelAllScheduledNotificationsAsync();
}
