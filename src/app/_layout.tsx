import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Lora_400Regular, Lora_600SemiBold } from '@expo-google-fonts/lora';
import { Nunito_400Regular, Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initAds, loadAdFree } from '@/ads/ads';
import { LockScreen } from '@/components/LockScreen';
import { EntriesProvider } from '@/db/EntriesProvider';
import { initI18n } from '@/i18n';
import { LockProvider, useLock } from '@/lib/LockProvider';
import { initPurchases } from '@/lib/purchases';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

if (Platform.OS !== 'web') SplashScreen.preventAutoHideAsync();
// Saved language choice; until it loads the device language is used.
initI18n();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Caveat_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Lora_400Regular,
    Lora_600SemiBold,
    Nunito_400Regular,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });

  useEffect(() => {
    if ((loaded || error) && Platform.OS !== 'web') SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LockProvider>
          <EntriesProvider>
            <AppShell />
          </EntriesProvider>
        </LockProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function AppShell() {
  const { theme } = useTheme();
  const { ready, locked } = useLock();

  // Keep the browser chrome in sync with the chosen style.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    document.body.style.backgroundColor = theme.colors.background;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.background);
  }, [theme]);

  // Ads and the purchase start once the journal is open: the consent form never
  // covers the lock screen, and the tracking prompt still comes right at launch.
  useEffect(() => {
    if (!ready || locked) return;
    loadAdFree().then((adFree) => {
      initPurchases(adFree);
      initAds();
    });
  }, [ready, locked]);

  // Don't show any entries before we know whether a PIN is required.
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="entry" options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="trash" />
      </Stack>
      {locked && <LockScreen />}
    </>
  );
}
