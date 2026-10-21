import { Pressable, Text } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

export function TagChip({ tag, active, onPress, suffix }: { tag: string; active?: boolean; onPress?: () => void; suffix?: string }) {
  const { theme } = useTheme();
  const { colors } = theme;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={{
        backgroundColor: active ? colors.accent : colors.surfaceAlt,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}>
      <Text style={{ fontFamily: theme.fonts.ui, fontSize: 13, color: active ? colors.accentText : colors.text }}>
        #{tag}
        {suffix ? ` ${suffix}` : ''}
      </Text>
    </Pressable>
  );
}
