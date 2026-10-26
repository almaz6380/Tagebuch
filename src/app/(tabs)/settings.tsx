import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PIN_LENGTH, PinDots, PinPad } from '@/components/PinPad';
import { Button, Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { daysSince, useLastBackup } from '@/lib/backup';
import { confirm, notify } from '@/lib/confirm';
import { getItem, removeItem, setItem } from '@/lib/kv';
import { useLock } from '@/lib/LockProvider';
import { cancelDailyReminder, reminderSupported, scheduleDailyReminder } from '@/lib/reminder';
import { useBackup } from '@/lib/useBackup';
import { useTheme } from '@/theme/ThemeProvider';
import { themeOrder, themes, type Theme } from '@/theme/themes';

export default function SettingsScreen() {
  const { theme, setThemeName } = useTheme();
  const { entries, trash } = useEntries();
  const { backup, restore } = useBackup();
  const lastBackup = useLastBackup();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">Einstellungen</T>

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
          Erinnerung
        </T>
        <ReminderSettings />

        <T variant="label" style={styles.section}>
          Daten
        </T>
        <Card>
          <T variant="body" style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 }}>
            Deine Einträge liegen nur auf diesem Gerät. Sichere sie regelmäßig als Datei, zum Beispiel in iCloud, Google
            Drive oder per Mail. Mit „Wiederherstellen“ holst du sie auf jedem Gerät zurück.
          </T>
          <T variant="muted" style={{ marginTop: 10 }}>
            {lastBackup == null
              ? 'Noch nie gesichert'
              : `Zuletzt gesichert: ${daysSince(lastBackup) === 0 ? 'heute' : `vor ${daysSince(lastBackup)} Tagen`}`}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button label={`${entries.length} sichern`} disabled={!entries.length} onPress={backup} style={{ flex: 1 }} />
            <Button kind="ghost" label="Wiederherstellen" onPress={restore} style={{ flex: 1 }} />
          </View>
          <Pressable
            onPress={() => router.push('/trash')}
            accessibilityRole="button"
            style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
            <Feather name="trash-2" size={20} color={theme.colors.accent} />
            <T style={{ flex: 1, fontFamily: theme.fonts.uiBold }}>Papierkorb</T>
            <T variant="muted">{trash.length}</T>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </Card>

        <T variant="label" style={styles.section}>
          Über
        </T>
        <Card style={{ paddingVertical: 4 }}>
          {ABOUT_LINKS.map((l, i) => (
            <Pressable
              key={l.path}
              onPress={() => Linking.openURL(`${SITE}${l.path}`)}
              accessibilityRole="link"
              style={[styles.linkRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <Feather name={l.icon} size={18} color={theme.colors.accent} />
              <T style={{ flex: 1 }}>{l.label}</T>
              <Feather name="external-link" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </Card>
        <T variant="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          Tagebuch {Constants.expoConfig?.version ?? ''}
        </T>
      </ScrollView>
    </Screen>
  );
}

const SITE = 'https://tagebuch-c5j.pages.dev';
const ABOUT_LINKS = [
  { path: '/support', label: 'Hilfe & Kontakt', icon: 'help-circle' },
  { path: '/datenschutz', label: 'Datenschutz', icon: 'shield' },
  { path: '/impressum', label: 'Impressum', icon: 'info' },
] as const;

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
  const { hasPin, setPin, clearPin, biometricName, biometricEnabled, setBiometricEnabled } = useLock();
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
      {hasPin && biometricName && (
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: biometricEnabled }}
          onPress={() => setBiometricEnabled(!biometricEnabled)}
          style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: theme.fonts.uiBold }}>Mit {biometricName} entsperren</T>
            <T variant="muted">Die PIN bleibt als Ersatz bestehen.</T>
          </View>
          <Toggle on={biometricEnabled} />
        </Pressable>
      )}
    </Card>
  );
}

function Toggle({ on }: { on: boolean }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.toggle, { backgroundColor: on ? theme.colors.accent : theme.colors.surfaceAlt }]}>
      <View style={[styles.knob, { alignSelf: on ? 'flex-end' : 'flex-start' }]} />
    </View>
  );
}

const REMINDER_KEY = 'tagebuch.reminder';
const pad = (n: number) => String(n).padStart(2, '0');

function ReminderSettings() {
  const { theme } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState({ hour: 20, minute: 0 });

  useEffect(() => {
    getItem(REMINDER_KEY).then((v) => {
      if (!v) return;
      const [hour, minute] = v.split(':').map(Number);
      setTime({ hour, minute });
      setEnabled(true);
    });
  }, []);

  if (!reminderSupported) {
    return (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Feather name="bell-off" size={22} color={theme.colors.textMuted} />
          <T variant="muted" style={{ flex: 1 }}>
            Tägliche Erinnerungen gibt es in der Handy-App für iOS und Android. Im Browser sind sie leider nicht möglich.
          </T>
        </View>
      </Card>
    );
  }

  const apply = async (on: boolean, next = time) => {
    if (on) {
      if (!(await scheduleDailyReminder(next.hour, next.minute))) {
        notify('Keine Berechtigung', 'Erlaube Mitteilungen für Tagebuch in den Systemeinstellungen, um erinnert zu werden.');
        return;
      }
      await setItem(REMINDER_KEY, `${next.hour}:${next.minute}`);
    } else {
      await cancelDailyReminder();
      await removeItem(REMINDER_KEY);
    }
    setEnabled(on);
    setTime(next);
  };

  const shift = (minutes: number) => {
    const total = (((time.hour * 60 + time.minute + minutes) % 1440) + 1440) % 1440;
    const next = { hour: Math.floor(total / 60), minute: total % 60 };
    if (enabled) apply(true, next);
    else setTime(next);
  };

  return (
    <Card>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={() => apply(!enabled)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Feather name={enabled ? 'bell' : 'bell-off'} size={22} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>Tägliche Erinnerung</T>
          <T variant="muted">{enabled ? `Jeden Tag um ${pad(time.hour)}:${pad(time.minute)} Uhr` : 'Aus'}</T>
        </View>
        <Toggle on={enabled} />
      </Pressable>
      <View style={styles.timeRow}>
        <TimeStep icon="minus" label="Früher" onPress={() => shift(-15)} />
        <T style={{ fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.text, minWidth: 100, textAlign: 'center' }}>
          {pad(time.hour)}:{pad(time.minute)}
        </T>
        <TimeStep icon="plus" label="Später" onPress={() => shift(15)} />
      </View>
    </Card>
  );
}

function TimeStep({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} (15 Minuten)`}
      onPress={onPress}
      style={({ pressed }) => [styles.timeStep, { borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={20} color={theme.colors.accent} />
    </Pressable>
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
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  toggle: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  timeStep: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 4 },
});
