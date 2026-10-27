import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { addPhoto } from '@/db/photos';
import { getMessages } from '@/i18n';

const MAX_SIZE = 1600;

/** Lets the user choose or take photos; returns the ids of the stored, downscaled copies. */
export async function pickPhotos(source: 'library' | 'camera'): Promise<string[]> {
  if (source === 'camera') {
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) throw new Error(getMessages().entry.cameraDenied);
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 1 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, quality: 1 });
  if (result.canceled) return [];

  const ids: string[] = [];
  for (const asset of result.assets) {
    const context = ImageManipulator.manipulate(asset.uri);
    // Keep diaries small: photos are stored on the device and in backups.
    // Both sides are given explicitly; the web build can't derive a missing one.
    const scale = MAX_SIZE / Math.max(asset.width, asset.height);
    if (scale < 1) {
      context.resize({ width: Math.round(asset.width * scale), height: Math.round(asset.height * scale) });
    }
    const image = await (await context.renderAsync()).saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });
    ids.push(await addPhoto(image.uri));
  }
  return ids;
}
