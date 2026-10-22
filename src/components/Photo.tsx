import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { photoUri } from '@/db/photos';
import { useTheme } from '@/theme/ThemeProvider';

function usePhotoUri(id: string) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    photoUri(id)
      .then((u) => live && setUri(u))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);
  return uri;
}

export function Photo({ id, style }: { id: string; style?: StyleProp<ImageStyle> }) {
  const { theme } = useTheme();
  const uri = usePhotoUri(id);
  if (!uri) return <View style={[style as object, { backgroundColor: theme.colors.surfaceAlt }]} />;
  return <Image source={{ uri }} style={style} resizeMode="cover" accessibilityIgnoresInvertColors />;
}

/** Full-screen photo view, with arrows to flip through several. */
export function PhotoViewer({ ids, start, onClose }: { ids: string[]; start: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(start);
  const id = ids[current];
  const uri = usePhotoUri(id ?? '');

  return (
    <Modal visible={!!id} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {uri && <Image source={{ uri }} style={styles.full} resizeMode="contain" accessibilityLabel="Foto" />}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Schließen"
          hitSlop={12}
          style={[styles.close, { top: insets.top + 12 }]}>
          <Feather name="x" size={26} color="#fff" />
        </Pressable>
        {ids.length > 1 && (
          <View style={[styles.nav, { bottom: insets.bottom + 24 }]}>
            <Pressable
              onPress={() => setCurrent((c) => (c - 1 + ids.length) % ids.length)}
              accessibilityLabel="Vorheriges Foto"
              hitSlop={12}>
              <Feather name="chevron-left" size={30} color="#fff" />
            </Pressable>
            <View style={styles.dots}>
              {ids.map((p, i) => (
                <View key={p} style={[styles.dot, { opacity: i === current ? 1 : 0.4 }]} />
              ))}
            </View>
            <Pressable onPress={() => setCurrent((c) => (c + 1) % ids.length)} accessibilityLabel="Nächstes Foto" hitSlop={12}>
              <Feather name="chevron-right" size={30} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  full: { width: '100%', height: '80%' },
  close: { position: 'absolute', right: 20 },
  nav: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#fff' },
});
