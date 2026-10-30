// Browsers can't fire scheduled local notifications while the page is closed.
export const reminderSupported = false;

export async function scheduleDailyReminder(_hour: number, _minute: number): Promise<boolean> {
  return false;
}

export async function cancelDailyReminder() {}

export async function scheduleCapsule(_entryId: string, _opensOn: string) {}

export async function cancelCapsule(_entryId: string) {}

export async function syncCapsules(_entries: { id: string; sealedUntil: string | null }[]) {}
