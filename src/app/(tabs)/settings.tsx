import Feather from '@expo/vector-icons/Feather';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { adsSupported, showAdPrivacyOptions } from '@/ads/ads';
import { useAdState } from '@/ads/state';
import { PIN_LENGTH, PinDots, PinPad } from '@/components/PinPad';
import { Button, Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { daysSince, useLastBackup } from '@/lib/backup';
import { formatTime } from '@/lib/dates';
import { confirm, notify } from '@/lib/confirm';
import { getItem, removeItem, setItem } from '@/lib/kv';
import { useLock } from '@/lib/LockProvider';
import { cancelDailyReminder, reminderSupported, scheduleDailyReminder } from '@/lib/reminder';
import { buyNoAds, loadPrice, restoreNoAds } from '@/lib/purchases';
import { useBackup } from '@/lib/useBackup';
import { LANG_NAMES, LANGS, setLanguage, useI18n, type Lang, type LangPref } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { themeOrder, themes, type Theme } from '@/theme/themes';

export default function SettingsScreen() {
  const { theme, setThemeName } = useTheme();
  const { t, lang } = useI18n();
  const { entries, trash } = useEntries();
  const { backup, restore } = useBackup();
  const lastBackup = useLastBackup();

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">{t.settings.title}</T>

        <T variant="label" style={styles.section}>
          {t.settings.look}
        </T>
        <View style={styles.themeGrid}>
          {themeOrder.map((name) => (
            <ThemePreview key={name} preview={themes[name]} active={theme.name === name} onPress={() => setThemeName(name)} />
          ))}
        </View>

        <T variant="label" style={styles.section}>
          {t.settings.security}
        </T>
        <PinSettings />

        <T variant="label" style={styles.section}>
          {t.settings.reminder}
        </T>
        <ReminderSettings />

        <T variant="label" style={styles.section}>
          {t.settings.language}
        </T>
        <LanguageSettings />

        <T variant="label" style={styles.section}>
          {t.settings.data}
        </T>
        <Card>
          <T variant="body" style={{ color: theme.colors.textMuted, fontSize: 14, lineHeight: 21 }}>
            {t.settings.dataInfo}
          </T>
          <T variant="muted" style={{ marginTop: 10 }}>
            {lastBackup == null ? t.settings.neverBackedUp : t.settings.lastBackup(daysSince(lastBackup))}
          </T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <Button label={t.settings.backup(entries.length)} disabled={!entries.length} onPress={backup} style={{ flex: 1 }} />
            <Button kind="ghost" label={t.settings.restore} onPress={restore} style={{ flex: 1 }} />
          </View>
          <Pressable
            onPress={() => router.push('/trash')}
            accessibilityRole="button"
            style={[styles.toggleRow, { borderTopColor: theme.colors.border }]}>
            <Feather name="trash-2" size={20} color={theme.colors.accent} />
            <T style={{ flex: 1, fontFamily: theme.fonts.uiBold }}>{t.settings.trash}</T>
            <T variant="muted">{trash.length}</T>
            <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
          </Pressable>
        </Card>

        {adsSupported && (
          <>
            <T variant="label" style={styles.section}>
              {t.settings.ads}
            </T>
            <AdSettings />
          </>
        )}

        <T variant="label" style={styles.section}>
          {t.settings.about}
        </T>
        <Card style={{ paddingVertical: 4 }}>
          {ABOUT_LINKS.map((l, i) => (
            <Pressable
              key={l.key}
              onPress={() => Linking.openURL(`${SITE}${l.path[lang]}`)}
              accessibilityRole="link"
              style={[styles.linkRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
              <Feather name={l.icon} size={18} color={theme.colors.accent} />
              <T style={{ flex: 1 }}>{t.settings[l.key]}</T>
              <Feather name="external-link" size={16} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </Card>
        <T variant="muted" style={{ textAlign: 'center', marginTop: 16 }}>
          {t.appName} {Constants.expoConfig?.version ?? ''}
        </T>
      </ScrollView>
    </Screen>
  );
}

const SITE = 'https://tagebuch-c5j.pages.dev';
// Legal pages exist in both languages (public/*.html).
const ABOUT_LINKS = [
  { key: 'help', path: { de: '/support', en: '/help' }, icon: 'help-circle' },
  { key: 'privacy', path: { de: '/datenschutz', en: '/privacy' }, icon: 'shield' },
  { key: 'imprint', path: { de: '/impressum', en: '/imprint' }, icon: 'info' },
] as const;

/** Mini page rendered in the preview theme's own colors and fonts. */
function ThemePreview({ preview, active, onPress }: { preview: Theme; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const names = t.themes[preview.name];
  const c = preview.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      accessibilityLabel={t.settings.styleA11y(names.label)}
      style={[styles.themeCard, { borderColor: active ? theme.colors.accent : theme.colors.border, borderRadius: theme.radius + 6 }]}>
      <View style={[styles.themeSwatch, { backgroundColor: c.background, borderRadius: preview.radius }]}>
        <View style={[styles.miniPage, { backgroundColor: c.surface, borderRadius: preview.radius / 2, borderColor: c.border }]}>
          {preview.ruled &&
            [0, 1, 2].map((i) => <View key={i} style={[styles.miniLine, { top: 30 + i * 12, backgroundColor: c.line }]} />)}
          <Text style={{ fontFamily: preview.fonts.display, fontSize: preview.name === 'paper' ? 22 : 16, color: c.text }}>
            {t.settings.previewTitle}
          </Text>
          <Text style={{ fontFamily: preview.fonts.body, fontSize: 11, color: c.textMuted }}>{t.settings.previewBody}</Text>
        </View>
        <View style={[styles.miniDot, { backgroundColor: c.accent }]} />
      </View>
      <View style={styles.themeLabel}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{names.label}</T>
          <T variant="muted" style={{ fontSize: 12 }}>
            {names.description}
          </T>
        </View>
        {active && <Feather name="check-circle" size={18} color={theme.colors.accent} />}
      </View>
    </Pressable>
  );
}

function PinSettings() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
          {error ? t.settings.pinMismatch : step === 'enter' ? t.settings.pinNew : t.settings.pinRepeat}
        </T>
        <PinDots length={current.length} error={error} />
        <PinPad onDigit={onDigit} onDelete={() => setCurrent((p) => p.slice(0, -1))} />
        <Button kind="ghost" label={t.settings.cancel} onPress={reset} style={{ marginTop: 16, alignSelf: 'stretch' }} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Feather name={hasPin ? 'lock' : 'unlock'} size={22} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{hasPin ? t.settings.pinOn : t.settings.pinOff}</T>
          <T variant="muted">
            {hasPin ? t.settings.pinOnBody : t.settings.pinOffBody}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
        <Button label={hasPin ? t.settings.pinChange : t.settings.pinSet} onPress={() => setStep('enter')} style={{ flex: 1 }} />
        {hasPin && (
          <Button
            kind="danger"
            label={t.settings.pinRemove}
            style={{ flex: 1 }}
            onPress={async () => {
              if (await confirm(t.settings.pinRemoveTitle, t.settings.pinRemoveBody, t.settings.pinRemove)) clearPin();
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
            <T style={{ fontFamily: theme.fonts.uiBold }}>{t.settings.biometric(t.lock[biometricName])}</T>
            <T variant="muted">{t.settings.biometricHint}</T>
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

function AdSettings() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { adFree, privacyOptions } = useAdState();
  const [price, setPrice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (adFree === false) loadPrice().then(setPrice);
  }, [adFree]);

  const buy = async () => {
    setBusy(true);
    const result = await buyNoAds();
    setBusy(false);
    if (result === 'bought') notify(t.settings.purchaseThanksTitle, t.settings.purchaseThanksBody);
    else if (result === 'failed') notify(t.settings.purchaseFailedTitle, t.settings.purchaseFailedBody);
  };

  const restore = async () => {
    setBusy(true);
    const found = await restoreNoAds();
    setBusy(false);
    if (found) notify(t.settings.purchaseThanksTitle, t.settings.purchaseThanksBody);
    else notify(t.settings.restoreNoneTitle, t.settings.restoreNoneBody);
  };

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Feather name={adFree ? 'heart' : 'slash'} size={22} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{adFree ? t.settings.adFreeTitle : t.settings.removeAdsTitle}</T>
          <T variant="muted">{adFree ? t.settings.adFreeBody : t.settings.removeAdsBody}</T>
        </View>
      </View>
      {!adFree && (
        <Button label={t.settings.removeAdsButton(price)} disabled={busy} onPress={buy} style={{ marginTop: 14 }} />
      )}
      {/* Apple requires restoring to be possible at any time. */}
      <Button kind="ghost" label={t.settings.restorePurchases} disabled={busy} onPress={restore} style={{ marginTop: 10 }} />
      {privacyOptions && !adFree && (
        <Pressable onPress={showAdPrivacyOptions} accessibilityRole="button" style={[styles.linkRow, { marginTop: 4 }]}>
          <Feather name="sliders" size={18} color={theme.colors.accent} />
          <T style={{ flex: 1 }}>{t.settings.adPrivacy}</T>
        </Pressable>
      )}
    </Card>
  );
}

const REMINDER_KEY = 'tagebuch.reminder';

function ReminderSettings() {
  const { theme } = useTheme();
  const { t } = useI18n();
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
            {t.settings.reminderWeb}
          </T>
        </View>
      </Card>
    );
  }

  const apply = async (on: boolean, next = time) => {
    if (on) {
      if (!(await scheduleDailyReminder(next.hour, next.minute))) {
        notify(t.settings.noPermissionTitle, t.settings.noPermissionBody);
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
          <T style={{ fontFamily: theme.fonts.uiBold }}>{t.settings.reminderTitle}</T>
          <T variant="muted">{enabled ? t.settings.reminderAt(formatTime(time.hour, time.minute)) : t.settings.reminderOff}</T>
        </View>
        <Toggle on={enabled} />
      </Pressable>
      <View style={styles.timeRow}>
        <TimeStep icon="minus" label={t.settings.earlier} onPress={() => shift(-15)} />
        <T style={{ fontFamily: theme.fonts.display, fontSize: 30, color: theme.colors.text, minWidth: 100, textAlign: 'center' }}>
          {formatTime(time.hour, time.minute)}
        </T>
        <TimeStep icon="plus" label={t.settings.later} onPress={() => shift(15)} />
      </View>
    </Card>
  );
}

/** Re-plans the daily reminder so its text follows the new language. */
async function relabelReminder() {
  const v = await getItem(REMINDER_KEY);
  if (!v || !reminderSupported) return;
  const [hour, minute] = v.split(':').map(Number);
  await scheduleDailyReminder(hour, minute).catch(() => false);
}

function LanguageSettings() {
  const { theme } = useTheme();
  const { t, pref } = useI18n();
  const options: { value: LangPref; label: string }[] = [
    { value: 'system', label: t.settings.languageSystem },
    ...LANGS.map((l: Lang) => ({ value: l, label: LANG_NAMES[l] })),
  ];
  return (
    <View style={styles.langRow}>
      {options.map((o) => {
        const active = pref === o.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={async () => {
              await setLanguage(o.value);
              await relabelReminder();
            }}
            style={[
              styles.langChip,
              {
                backgroundColor: active ? theme.colors.accent : theme.colors.surface,
                borderColor: active ? theme.colors.accent : theme.colors.border,
                borderRadius: Math.max(theme.radius, 10),
              },
            ]}>
            <T style={{ color: active ? theme.colors.accentText : theme.colors.text, fontFamily: theme.fonts.uiBold }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

function TimeStep({ icon, label, onPress }: { icon: 'minus' | 'plus'; label: string; onPress: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.settings.step(label)}
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
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langChip: { borderWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  toggle: { width: 46, height: 28, borderRadius: 14, padding: 3 },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 14 },
  timeStep: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingHorizontal: 4 },
});
