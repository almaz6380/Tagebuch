import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PIN_LENGTH, PinDots, PinPad } from '@/components/PinPad';
import { Button, Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { confirm } from '@/lib/confirm';
import { exportEntries } from '@/lib/exportEntries';
import { useLock } from '@/lib/LockProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { themeOrder, themes, type Theme } from '@/theme/themes';

export default function SettingsScreen() {
  const { theme, setThemeName } = useTheme();
  const { entries } = useEntries();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">Stil & PIN</T>

        <T variant="label" style={styles.section}>
          Aussehen
        </T>
        <View style={styles.themeGrid}>
          {themeOrder.map((name) => (
            <ThemePreview key={name} preview={themes[name]} active={theme.name === name} onPress={() => setThemeName(name)} />
          ))}
        </View>

        <T variant="label" style={styles.section}>
          Sicherheit
        </T>
        <PinSettings />

        <T variant="label" style={styles.section}>
          Daten
        </T>
        <Card>
          <T variant="body" style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 }}>
            Deine Einträge liegen nur auf diesem Gerät. Mit einem Export sicherst du sie als JSON-Datei.
          </T>
          <Button
            kind="ghost"
            label={`${entries.length} Einträge exportieren`}
            disabled={!entries.length}
            onPress={() => exportEntries(entries)}
            style={{ marginTop: 12 }}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}

/** Mini page rendered in the preview theme's own colors and fonts. */
function ThemePreview({ preview, active, onPress }: { preview: Theme; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const c = preview.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={`Stil ${preview.label}`}
      style={[styles.themeCard, { borderColor: active ? theme.colors.accent : theme.colors.border, borderRadius: theme.radius + 6 }]}>
      <View style={[styles.themeSwatch, { backgroundColor: c.background, borderRadius: preview.radius }]}>
        <View style={[styles.miniPage, { backgroundColor: c.surface, borderRadius: preview.radius / 2, borderColor: c.border }]}>
          {preview.ruled &&
            [0, 1, 2].map((i) => <View key={i} style={[styles.miniLine, { top: 30 + i * 12, backgroundColor: c.line }]} />)}
          <Text style={{ fontFamily: preview.fonts.display, fontSize: preview.name === 'paper' ? 22 : 16, color: c.text }}>
            Liebes
          </Text>
          <Text style={{ fontFamily: preview.fonts.body, fontSize: 11, color: c.textMuted }}>Tagebuch …</Text>
        </View>
        <View style={[styles.miniDot, { backgroundColor: c.accent }]} />
      </View>
      <View style={styles.themeLabel}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{preview.label}</T>
          <T variant="muted" style={{ fontSize: 12 }}>
            {preview.description}
          </T>
        </View>
        {active && <Feather name="check-circle" size={18} color={theme.colors.accent} />}
      </View>
    </Pressable>
  );
}

function PinSettings() {
  const { theme } = useTheme();
  const { hasPin, setPin, clearPin } = useLock();
  const [step, setStep] = useState<'idle' | 'enter' | 'confirm'>('idle');
  const [first, setFirst] = useState('');
  const [current, setCurrent] = useState('');
  const [error, setError] = useState(false);

  const reset = () => {
    setStep('idle');
    setFirst('');
    setCurrent('');
    setError(false);
  };

  const onDigit = async (d: string) => {
    if (current.length >= PIN_LENGTH) return;
    const next = current + d;
    setCurrent(next);
    setError(false);
    if (next.length < PIN_LENGTH) return;
    if (step === 'enter') {
      setFirst(next);
      setStep('confirm');
      setCurrent('');
    } else if (next === first) {
      await setPin(next);
      reset();
    } else {
      setError(true);
      setTimeout(() => {
        setCurrent('');
        setFirst('');
        setStep('enter');
      }, 500);
    }
  };

  if (step !== 'idle') {
    return (
      <Card style={{ alignItems: 'center' }}>
        <T style={{ fontFamily: theme.fonts.uiBold }}>
          {error ? 'PINs stimmen nicht überein' : step === 'enter' ? 'Neue PIN wählen' : 'PIN wiederholen'}
        </T>
        <PinDots length={current.length} error={error} />
        <PinPad onDigit={onDigit} onDelete={() => setCurrent((p) => p.slice(0, -1))} />
        <Button kind="ghost" label="Abbrechen" onPress={reset} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Feather name={hasPin ? 'lock' : 'unlock'} size={22} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{hasPin ? 'PIN-Schutz ist aktiv' : 'Kein PIN-Schutz'}</T>
          <T variant="muted">
            {hasPin ? 'Die App fragt beim Öffnen nach deiner PIN.' : 'Schütze dein Tagebuch mit einer 4-stelligen PIN.'}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button label={hasPin ? 'PIN ändern' : 'PIN festlegen'} onPress={() => setStep('enter')} style={{ flex: 1 }} />
        {hasPin && (
          <Button
            kind="danger"
            label="Entfernen"
            style={{ flex: 1 }}
            onPress={async () => {
              if (await confirm('PIN entfernen?', 'Die App ist dann ohne PIN zugänglich.', 'Entfernen')) clearPin();
            }}
          />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginTop: 28, marginBottom: 10 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  themeCard: { flexGrow: 1, flexBasis: 150, borderWidth: 2, padding: 8 },
  themeSwatch: { height: 110, padding: 12, justifyContent: 'center' },
  miniPage: { flex: 1, padding: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  miniLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  miniDot: { position: 'absolute', right: 10, bottom: 10, width: 18, height: 18, borderRadius: 9 },
  themeLabel: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 4 },
});
