import { Share } from 'react-native';

import type { Entry } from '@/db/types';

export async function exportEntries(entries: Entry[]) {
  await Share.share({ title: 'Tagebuch-Export', message: JSON.stringify(entries, null, 2) });
}
