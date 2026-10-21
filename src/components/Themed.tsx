import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'display' | 'title' | 'body' | 'ui' | 'label' | 'muted';

export function T({ variant = 'ui', style, ...rest }: TextProps & { variant?: Variant }) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;
  const base = {
    display: { fontFamily: fonts.display, fontSize: theme.name === 'paper' ? 40 : 30, color: colors.text },
    title: { fontFamily: fonts.display, fontSize: theme.name === 'paper' ? 28 : 20, color: colors.text },
    body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26, color: colors.text },
    ui: { fontFamily: fonts.ui, fontSize: 15, color: colors.text },
    label: { fontFamily: fonts.uiBold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' as const, color: colors.textMuted },
    muted: { fontFamily: fonts.ui, fontSize: 13, color: colors.textMuted },
  }[variant];
  return <Text style={[base, style]} {...rest} />;
}

export function Screen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top }, style]}>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.colors.border,
          padding: 16,
        },
        theme.name === 'paper' && styles.paperShadow,
        theme.name === 'playful' && styles.softShadow,
        style,
      ]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  kind = 'primary',
  style,
  ...rest
}: PressableProps & { label: string; kind?: 'primary' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const bg = kind === 'primary' ? colors.accent : 'transparent';
  const fg = kind === 'primary' ? colors.accentText : kind === 'danger' ? colors.danger : colors.accent;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: Math.max(theme.radius, 10),
          paddingVertical: 12,
          paddingHorizontal: 18,
          alignItems: 'center',
          opacity: pressed ? 0.75 : 1,
          borderWidth: kind === 'primary' ? 0 : 1,
          borderColor: kind === 'danger' ? colors.danger : colors.border,
        },
        style,
      ]}
      {...rest}>
      <Text style={{ color: fg, fontFamily: theme.fonts.uiBold, fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  inner: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  paperShadow: {
    shadowColor: '#5B4630',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  softShadow: {
    shadowColor: '#FF6F91',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
});
