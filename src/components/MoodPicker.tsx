import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { moods } from '@/theme/themes';

export function MoodPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      {moods.map((m) => {
        const active = value === m.value;
        return (
          <Pressable
            key={m.value}
            accessibilityRole="button"
            accessibilityLabel={`Stimmung: ${m.label}`}
            accessibilityState={{ selected: active }}
            onPress={() => onChange(active ? null : m.value)}
            style={[
              styles.mood,
              {
                borderRadius: theme.radius + 8,
                backgroundColor: active ? m.color + '33' : 'transparent',
                borderColor: active ? m.color : 'transparent',
              },
            ]}>
            <Text style={[styles.emoji, { opacity: value && !active ? 0.4 : 1 }]}>{m.emoji}</Text>
            <Text style={{ fontFamily: theme.fonts.ui, fontSize: 11, color: theme.colors.textMuted }}>{m.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  mood: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1.5 },
  emoji: { fontSize: 28, marginBottom: 2 },
});
