import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Feather>['name'];

const tabs: { name: 'index' | 'calendar' | 'review' | 'search' | 'settings'; icon: IconName }[] = [
  { name: 'index', icon: 'book-open' },
  { name: 'calendar', icon: 'calendar' },
  { name: 'review', icon: 'trending-up' },
  { name: 'search', icon: 'search' },
  { name: 'settings', icon: 'settings' },
];
const titleKey = { index: 'entries', calendar: 'calendar', review: 'review', search: 'search', settings: 'settings' } as const;

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t.tabs[titleKey[tab.name]],
            tabBarIcon: ({ color, size }) => <Feather name={tab.icon} color={color as string} size={size - 2} />,
          }}
        />
      ))}
    </Tabs>
  );
}
