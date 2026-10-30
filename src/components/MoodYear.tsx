import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Entry } from '@/db/types';
import { formatLong, monthsShort, todayISO, weekdayLong } from '@/lib/dates';
import { moodByDay, moodPatterns } from '@/lib/stats';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo, moods } from '@/theme/themes';
import { TagChip } from './TagChip';
import { Card, T } from './Themed';

const pad = (n: number) => String(n).padStart(2, '0');

/** "Year in pixels": one square per day, coloured by that day's mood, months as columns. */
export function MoodYear({ entries }: { entries: Entry[] }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t, lang } = useI18n();
  const thisYear = Number(todayISO().slice(0, 4));
  const [year, setYear] = useState(thisYear);
  const firstYear = useMemo(
    () => Math.min(thisYear, ...entries.map((e) => Number(e.date.slice(0, 4)))),
    [entries, thisYear],
  );

  const byDay = useMemo(() => moodByDay(entries, year), [entries, year]);
  const firstEntry = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) if (!map.has(e.date)) map.set(e.date, e.id);
    return map;
  }, [entries]);
  // lang: month initials follow the app language.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const months = useMemo(() => monthsShort(), [lang]);
  const today = todayISO();

  return (
    <Card>
      <View style={styles.head}>
        <Pressable
          onPress={() => setYear(year - 1)}
          disabled={year <= firstYear}
          accessibilityRole="button"
          accessibilityLabel={t.moodYear.prev}
          hitSlop={10}
          style={{ opacity: year <= firstYear ? 0.3 : 1 }}>
          <Feather name="chevron-left" size={20} color={colors.accent} />
        </Pressable>
        <T style={{ fontFamily: theme.fonts.uiBold }}>{t.moodYear.title(year)}</T>
        <Pressable
          onPress={() => setYear(year + 1)}
          disabled={year >= thisYear}
          accessibilityRole="button"
          accessibilityLabel={t.moodYear.next}
          hitSlop={10}
          style={{ opacity: year >= thisYear ? 0.3 : 1 }}>
          <Feather name="chevron-right" size={20} color={colors.accent} />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {months.map((label, m) => {
          const days = new Date(year, m + 1, 0).getDate();
          return (
            <View key={m} style={styles.column}>
              <T variant="muted" style={styles.monthLabel}>
                {label}
              </T>
              {Array.from({ length: 31 }, (_, d) => {
                if (d >= days) return <View key={d} style={styles.cell} />;
                const date = `${year}-${pad(m + 1)}-${pad(d + 1)}`;
                const avg = byDay.get(date);
                const mood = moodInfo(avg == null ? null : Math.round(avg));
                const id = firstEntry.get(date);
                const future = date > today;
                return (
                  <Pressable
                    key={d}
                    disabled={!id}
                    onPress={() => id && router.push({ pathname: '/entry', params: { id } })}
                    accessibilityLabel={t.moodYear.cell(formatLong(date), mood ? t.moods[mood.value] : t.moodYear.noEntry)}
                    style={[
                      styles.cell,
                      {
                        backgroundColor: mood ? mood.color : colors.surfaceAlt,
                        opacity: future ? 0.35 : 1,
                        borderRadius: 2,
                      },
                    ]}
                  />
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {moods.map((m) => (
          <View key={m.value} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: m.color }]} />
            <T variant="muted" style={{ fontSize: 12 }}>
              {t.moods[m.value]}
            </T>
          </View>
        ))}
      </View>
    </Card>
  );
}

/** Best/worst weekday, happy tags and mood distribution. */
export function MoodPatterns({ entries }: { entries: Entry[] }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const p = useMemo(() => moodPatterns(entries), [entries]);
  if (!p) return <T variant="muted">{t.moodYear.notEnough}</T>;
  const total = p.distribution.reduce((s, n) => s + n, 0);
  return (
    <Card>
      <View style={styles.line}>
        <Feather name="sun" size={16} color={colors.accent} />
        <T style={{ flex: 1 }}>{t.moodYear.bestDay(weekdayLong(p.bestDay))}</T>
      </View>
      {p.worstDay !== p.bestDay && (
        <View style={[styles.line, { marginTop: 8 }]}>
          <Feather name="cloud" size={16} color={colors.textMuted} />
          <T style={{ flex: 1 }}>{t.moodYear.worstDay(weekdayLong(p.worstDay))}</T>
        </View>
      )}
      {p.happyTags.length > 0 && (
        <>
          <T variant="muted" style={{ marginTop: 14 }}>
            {t.moodYear.happyTags}
          </T>
          <View style={styles.tags}>
            {p.happyTags.map((tag) => (
              <TagChip key={tag} tag={tag} />
            ))}
          </View>
        </>
      )}
      <T variant="muted" style={{ marginTop: 14 }}>
        {t.moodYear.distribution}
      </T>
      <View style={[styles.bar, { borderRadius: theme.radius }]}>
        {moods.map((m, i) =>
          p.distribution[i] ? (
            <View key={m.value} style={{ flex: p.distribution[i], backgroundColor: m.color }} accessibilityLabel={`${t.moods[m.value]}: ${p.distribution[i]}`} />
          ) : null,
        )}
      </View>
      <View style={styles.legend}>
        {moods.map((m, i) =>
          p.distribution[i] ? (
            <T key={m.value} variant="muted" style={{ fontSize: 12 }}>
              {m.emoji} {Math.round((p.distribution[i] / total) * 100)}%
            </T>
          ) : null,
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  grid: { flexDirection: 'row', gap: 3 },
  column: { flex: 1, gap: 2 },
  monthLabel: { fontSize: 10, textAlign: 'center', marginBottom: 2 },
  cell: { aspectRatio: 1, width: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  bar: { flexDirection: 'row', height: 14, overflow: 'hidden', marginTop: 8 },
});
