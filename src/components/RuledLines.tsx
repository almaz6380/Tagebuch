import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

/** Notebook rules drawn behind a text block with a fixed line height. */
export function RuledLines({ height, lineHeight, offset = 0 }: { height: number; lineHeight: number; offset?: number }) {
  const { theme } = useTheme();
  if (!theme.ruled) return null;
  const count = Math.ceil(height / lineHeight);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {theme.colors.margin !== 'transparent' && (
        <View style={[styles.margin, { backgroundColor: theme.colors.margin }]} />
      )}
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[styles.line, { top: offset + (i + 1) * lineHeight - 1, backgroundColor: theme.colors.line }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute', left: 0, right: 0, height: 1 },
  margin: { position: 'absolute', left: 30, top: 0, bottom: 0, width: 1.5 },
});
