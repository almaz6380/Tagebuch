import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { Button, Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import type { Entry } from '@/db/types';
import { formatLong, MONTHS, monthGrid, todayISO, WEEKDAYS_SHORT } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo, moods } from '@/theme/themes';

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { colors, fonts } = theme;
  const { entries } = useEntries();
  const today = todayISO();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selected, setSelected] = useState(today);

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return map;
  }, [entries]);

  const cells = monthGrid(cursor.year, cursor.month);
  const monthPrefix = `${cursor.year}-${String(cursor.month + 1).padStart(2, '0')}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(monthPrefix));
  const moodCounts = moods.map((m) => ({ ...m, count: monthEntries.filter((e) => e.mood === m.value).length }));
  const moodTotal = moodCounts.reduce((s, m) => s + m.count, 0);

  const move = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });

  const dayEntries = byDay.get(selected) ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">Kalender</T>

        <Card style={{ marginTop: 16 }}>
          <View style={styles.monthNav}>
            <Pressable onPress={() => move(-1)} hitSlop={12} accessibilityLabel="Vorheriger Monat">
              <Feather name="chevron-left" size={22} color={colors.text} />
            </Pressable>
            <T variant="title" style={{ fontSize: theme.name === 'paper' ? 28 : 18 }}>
              {MONTHS[cursor.month]} {cursor.year}
            </T>
            <Pressable onPress={() => move(1)} hitSlop={12} accessibilityLabel="Nächster Monat">
              <Feather name="chevron-right" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {WEEKDAYS_SHORT.map((w) => (
              <View key={w} style={styles.cell}>
                <T variant="label" style={{ fontSize: 10 }}>
                  {w}
                </T>
              </View>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <View key={i} style={styles.cell} />;
              const list = byDay.get(iso);
              const mood = moodInfo(list?.find((e) => e.mood)?.mood);
              const isSelected = iso === selected;
              const isToday = iso === today;
              return (
                <Pressable key={iso} style={styles.cell} onPress={() => setSelected(iso)} accessibilityLabel={formatLong(iso)}>
                  <View
                    style={[
                      styles.day,
                      {
                        backgroundColor: mood ? mood.color + (isSelected ? 'FF' : '55') : list ? colors.surfaceAlt : 'transparent',
                        borderColor: isSelected ? colors.accent : isToday ? colors.textMuted : 'transparent',
                      },
                    ]}>
                    <T
                      style={{
                        fontFamily: isToday || list ? fonts.uiBold : fonts.ui,
                        color: mood && isSelected ? '#fff' : colors.text,
                        fontSize: 14,
                      }}>
                      {Number(iso.slice(8))}
                    </T>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {moodTotal > 0 && (
            <View style={{ marginTop: 14 }}>
              <View style={[styles.moodBar, { backgroundColor: colors.surfaceAlt }]}>
                {moodCounts
                  .filter((m) => m.count)
                  .map((m) => (
                    <View key={m.value} style={{ flex: m.count, backgroundColor: m.color }} />
                  ))}
              </View>
              <View style={styles.moodLegend}>
                {moodCounts
                  .filter((m) => m.count)
                  .map((m) => (
                    <T key={m.value} variant="muted">
                      {m.emoji} {m.count}
                    </T>
                  ))}
              </View>
            </View>
          )}
        </Card>

        <T variant="label" style={{ marginTop: 24, marginBottom: 10 }}>
          {formatLong(selected)}
        </T>
        {dayEntries.map((e) => (
          <View key={e.id} style={{ marginBottom: 12 }}>
            <EntryCard entry={e} />
          </View>
        ))}
        {dayEntries.length === 0 && <T variant="muted">An diesem Tag hast du noch nichts geschrieben.</T>}
        <Button
          kind="ghost"
          label={dayEntries.length ? 'Weiteren Eintrag schreiben' : 'Eintrag für diesen Tag schreiben'}
          onPress={() => router.push({ pathname: '/entry', params: { date: selected } })}
          style={{ marginTop: 14 }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  monthNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
  day: { width: '88%', height: '88%', borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  moodBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  moodLegend: { flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' },
});
