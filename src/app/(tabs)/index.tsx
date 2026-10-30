import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { EntryCard } from '@/components/EntryCard';
import { Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import type { Entry } from '@/db/types';
import { BackupReminder } from '@/components/BackupReminder';
import { formatLong, formatMonthYear, todayISO } from '@/lib/dates';
import { currentStreak, memoryLabel, onThisDay } from '@/lib/stats';
import { useI18n, type Messages } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';

type Row = { type: 'month'; key: string; label: string } | { type: 'entry'; key: string; entry: Entry };

function greeting(t: Messages) {
  const h = new Date().getHours();
  if (h < 11) return t.home.morning;
  if (h < 18) return t.home.day;
  return t.home.evening;
}

export default function EntriesScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { entries, open, sealed, loaded } = useEntries();

  const rows = useMemo(() => {
    const out: Row[] = [];
    let month = '';
    for (const e of entries) {
      const m = e.date.slice(0, 7);
      if (m !== month) {
        month = m;
        out.push({ type: 'month', key: `m-${m}`, label: formatMonthYear(e.date) });
      }
      out.push({ type: 'entry', key: e.id, entry: e });
    }
    return out;
    // lang: month headers are formatted in the app language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, lang]);

  const days = currentStreak(entries);
  const memories = useMemo(() => onThisDay(open), [open]);

  return (
    <Screen>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <T variant="muted">{formatLong(todayISO())}</T>
            <T variant="display" style={{ marginTop: 2 }}>
              {greeting(t)}
            </T>
            {entries.length > 0 && (
              <View style={styles.stats}>
                <Stat value={entries.length} label={t.home.entries(entries.length)} />
                <Stat value={days} label={t.home.streak(days)} />
              </View>
            )}
            {memories.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/review')}
                style={({ pressed }) => [
                  styles.memory,
                  { borderColor: theme.colors.accent, borderRadius: theme.radius + 4, opacity: pressed ? 0.8 : 1 },
                ]}>
                <Feather name="clock" size={18} color={theme.colors.accent} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: theme.fonts.uiBold }}>{t.home.onThisDay}</T>
                  <T variant="muted" numberOfLines={1}>
                    {memoryLabel(memories[0], t)}: {memories[0].entries[0].title || t.untitled}
                  </T>
                </View>
                <Feather name="chevron-right" size={18} color={theme.colors.textMuted} />
              </Pressable>
            )}
            {sealed.length > 0 && (
              <View style={[styles.memory, { borderColor: theme.colors.border, borderRadius: theme.radius + 4 }]}>
                <Feather name="lock" size={18} color={theme.colors.accent} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: theme.fonts.uiBold }}>{t.capsule.homeTitle}</T>
                  <T variant="muted">{t.capsule.homeCount(sealed.length, formatLong(sealed[0].sealedUntil!))}</T>
                </View>
              </View>
            )}
            <BackupReminder />
          </View>
        }
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <T variant="title" style={{ textAlign: 'center' }}>
                {t.home.emptyTitle}
              </T>
              <T variant="body" style={{ textAlign: 'center', color: theme.colors.textMuted, marginTop: 8 }}>
                {t.home.emptyBody}
              </T>
            </View>
          ) : undefined
        }
        renderItem={({ item, index }) =>
          item.type === 'month' ? (
            <T variant="label" style={styles.month}>
              {item.label}
            </T>
          ) : (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 40).duration(350)} style={{ marginBottom: 12 }}>
              <EntryCard entry={item.entry} />
            </Animated.View>
          )
        }
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.home.newEntry}
        onPress={() => router.push('/entry')}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.colors.accent,
            borderRadius: theme.name === 'minimal' ? 18 : 30,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}>
        <Feather name="edit-3" size={20} color={theme.colors.accentText} />
        <T style={{ color: theme.colors.accentText, fontFamily: theme.fonts.uiBold }}>{t.home.write}</T>
      </Pressable>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius + 4 }]}>
      <T style={{ fontFamily: theme.fonts.display, fontSize: 22, color: theme.colors.accent }}>{value}</T>
      <T variant="muted">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 120 },
  header: { marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 16 },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  memory: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12, marginTop: 14 },
  month: { marginTop: 16, marginBottom: 10 },
  empty: { paddingVertical: 60, paddingHorizontal: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
});
