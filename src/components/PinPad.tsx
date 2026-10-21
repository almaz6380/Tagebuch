import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export const PIN_LENGTH = 4;

export function PinDots({ length, error }: { length: number; error?: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              borderColor: error ? theme.colors.danger : theme.colors.accent,
              backgroundColor: i < length ? (error ? theme.colors.danger : theme.colors.accent) : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
}

export function PinPad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const { theme } = useTheme();
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];
  return (
    <View style={styles.pad}>
      {keys.map((k, i) =>
        k === '' ? (
          <View key={i} style={styles.key} />
        ) : (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={k === '⌫' ? 'Löschen' : k}
            onPress={() => (k === '⌫' ? onDelete() : onDigit(k))}
            style={({ pressed }) => [
              styles.key,
              { backgroundColor: pressed ? theme.colors.surfaceAlt : k === '⌫' ? 'transparent' : theme.colors.surface },
            ]}>
            <Text style={{ fontFamily: theme.fonts.ui, fontSize: 26, color: theme.colors.text }}>{k}</Text>
          </Pressable>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: 'row', gap: 18, justifyContent: 'center', marginVertical: 28 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', width: 276, justifyContent: 'space-between', rowGap: 16 },
  key: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
