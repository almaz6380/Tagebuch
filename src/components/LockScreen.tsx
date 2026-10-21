import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useLock } from '@/lib/LockProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { PIN_LENGTH, PinDots, PinPad } from './PinPad';
import { T } from './Themed';

export function LockScreen() {
  const { theme } = useTheme();
  const { unlock } = useLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

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
      <T variant="display">Tagebuch</T>
      <T variant="muted" style={{ marginTop: 6 }}>
        {error ? 'Falsche PIN, versuch es nochmal' : 'Bitte PIN eingeben'}
      </T>
      <PinDots length={pin.length} error={error} />
      <PinPad onDigit={onDigit} onDelete={() => setPin((p) => p.slice(0, -1))} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
