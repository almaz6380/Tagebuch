import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useI18n } from '@/i18n';
import { useLock } from '@/lib/LockProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { PIN_LENGTH, PinDots, PinPad } from './PinPad';
import { Button, T } from './Themed';

export function LockScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { unlock, biometricEnabled, biometricName, unlockWithBiometrics } = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const prompting = useRef(false);

  const tryBiometrics = useCallback(async () => {
    if (!biometricEnabled || prompting.current) return;
    prompting.current = true;
    try {
      await unlockWithBiometrics();
    } finally {
      prompting.current = false;
    }
  }, [biometricEnabled, unlockWithBiometrics]);

  // Prompt right away, but only while the app is in the foreground: the lock
  // screen is mounted as the app goes to the background.
  useEffect(() => {
    if (AppState.currentState === 'active') tryBiometrics();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tryBiometrics();
    });
    return () => sub.remove();
  }, [tryBiometrics]);

  const onDigit = async (d: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + d;
    setError(false);
    setPin(next);
    if (next.length === PIN_LENGTH) {
      const ok = await unlock(next);
      if (!ok) {
        setError(true);
        setTimeout(() => setPin(''), 400);
      }
    }
  };

  return (
    <View style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.colors.background }]}>
      <T variant="display">{t.appName}</T>
      <T variant="muted" style={{ marginTop: 6 }}>
        {error ? t.lock.wrongPin : t.lock.enterPin}
      </T>
      <PinDots length={pin.length} error={error} />
      <PinPad onDigit={onDigit} onDelete={() => setPin((p) => p.slice(0, -1))} />
      {biometricEnabled && (
        <Button kind="ghost" label={t.lock.unlockWith(t.lock[biometricName!])} onPress={tryBiometrics} style={{ marginTop: 20 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
