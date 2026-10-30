import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync,
  getPermissionsAsync,
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
const REMINDER_ID = 'daily-reminder';
const CAPSULE_CHANNEL = 'time-capsule';
const capsuleId = (entryId: string) => `capsule-${entryId}`;

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
  // Only replace the reminder itself; time capsule notifications must survive.
  await cancelScheduledNotificationAsync(REMINDER_ID);
  await scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: { title: t.title, body: t.body },
    trigger: { type: SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelDailyReminder() {
  await cancelScheduledNotificationAsync(REMINDER_ID);
}

/** Notification at 9:00 on the day a time capsule opens. Asks for permission once. */
export async function scheduleCapsule(entryId: string, opensOn: string) {
  const t = getMessages().capsule;
  const [y, m, d] = opensOn.split('-').map(Number);
  const when = new Date(y, m - 1, d, 9, 0, 0);
  if (when.getTime() <= Date.now()) return;
  if (Platform.OS === 'android') {
    await setNotificationChannelAsync(CAPSULE_CHANNEL, { name: t.channel, importance: AndroidImportance.DEFAULT });
  }
  const { granted } = (await getPermissionsAsync()).granted ? { granted: true } : await requestPermissionsAsync();
  if (!granted) return;
  await cancelScheduledNotificationAsync(capsuleId(entryId));
  await scheduleNotificationAsync({
    identifier: capsuleId(entryId),
    content: { title: t.notifyTitle, body: t.notifyBody, data: { entryId } },
    trigger: { type: SchedulableTriggerInputTypes.DATE, date: when, channelId: CAPSULE_CHANNEL },
  });
}

export async function cancelCapsule(entryId: string) {
  await cancelScheduledNotificationAsync(capsuleId(entryId));
}

/** After a restore: make sure every still closed capsule has its notification. */
export async function syncCapsules(entries: { id: string; sealedUntil: string | null }[]) {
  const planned = new Set((await getAllScheduledNotificationsAsync()).map((n) => n.identifier));
  for (const e of entries) {
    if (e.sealedUntil && !planned.has(capsuleId(e.id))) await scheduleCapsule(e.id, e.sealedUntil).catch(() => {});
  }
}
