import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Feather>['name'];

const tabs: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Einträge', icon: 'book-open' },
  { name: 'calendar', title: 'Kalender', icon: 'calendar' },
  { name: 'review', title: 'Rückblick', icon: 'trending-up' },
  { name: 'search', title: 'Suche', icon: 'search' },
  { name: 'settings', title: 'Einstellungen', icon: 'settings' },
];

export default function TabLayout() {
  const { theme } = useTheme();
  const { colors, fonts } = theme;
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 68 + insets.bottom,
          paddingTop: 4,
          paddingBottom: insets.bottom + 4,
        },
        tabBarLabelStyle: { fontFamily: fonts.ui, fontSize: 11, lineHeight: 15 },
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, size }) => <Feather name={t.icon} color={color as string} size={size - 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
