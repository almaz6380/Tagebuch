import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { MoodPatterns, MoodYear } from '@/components/MoodYear';
import { TagChip } from '@/components/TagChip';
import { Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { useI18n } from '@/i18n';
import { formatNumber, formatShort, todayISO } from '@/lib/dates';
import { currentStreak, longestStreak, memoryLabel, moodSeries, onThisDay, topTags, wordCount } from '@/lib/stats';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo } from '@/theme/themes';

const CHART_DAYS = 30;

export default function ReviewScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useI18n();
  // Look back only at what is readable; closed time capsules stay hidden.
  const { open: entries } = useEntries();

  const memories = useMemo(() => onThisDay(entries), [entries]);
  const series = useMemo(() => moodSeries(entries, CHART_DAYS), [entries]);
  const tags = useMemo(() => topTags(entries), [entries]);
  const words = useMemo(() => wordCount(entries), [entries]);
  const month = todayISO().slice(0, 7);
  const thisMonth = entries.filter((e) => e.date.startsWith(month)).length;

  const rated = series.filter((d) => d.mood != null);
  const average = rated.length ? rated.reduce((s, d) => s + d.mood!, 0) / rated.length : null;
  const averageMood = moodInfo(average == null ? null : Math.round(average));

  if (!entries.length) {
    return (
      <Screen>
        <ScrollView contentContainerStyle={styles.scroll}>
          <T variant="display">{t.review.title}</T>
          <T variant="body" style={{ color: colors.textMuted, marginTop: 12 }}>
            {t.review.empty}
          </T>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">{t.review.title}</T>

        <View style={styles.stats}>
          <Stat value={currentStreak(entries)} label={t.review.streak} />
          <Stat value={longestStreak(entries)} label={t.review.longest} />
          <Stat value={thisMonth} label={t.review.thisMonth} />
          <Stat value={words} label={t.review.words(words)} />
        </View>

        <T variant="label" style={styles.section}>
          {t.review.onThisDay}
        </T>
        {memories.length === 0 && (
          <T variant="muted">{t.review.noMemories}</T>
        )}
        {memories.map((m) => (
          <View key={m.yearsAgo} style={{ marginBottom: 8 }}>
            <T style={{ fontFamily: theme.fonts.uiBold, marginBottom: 8 }}>{memoryLabel(m, t)}</T>
            {m.entries.map((e) => (
              <View key={e.id} style={{ marginBottom: 12 }}>
                <EntryCard entry={e} />
              </View>
            ))}
          </View>
        ))}

        <T variant="label" style={styles.section}>
          {t.review.moodTitle(CHART_DAYS)}
        </T>
        <Card>
          {averageMood ? (
            <T variant="muted" style={{ marginBottom: 12 }}>
              {t.review.average(averageMood.emoji, t.moods[averageMood.value], rated.length)}
            </T>
          ) : (
            <T variant="muted" style={{ marginBottom: 12 }}>
              {t.review.noMood(CHART_DAYS)}
            </T>
          )}
          <View style={styles.chart} accessibilityLabel={t.review.chart}>
            {series.map((d) => {
              const mood = moodInfo(d.mood == null ? null : Math.round(d.mood));
              return (
                <View key={d.date} style={styles.barSlot}>
                  {mood ? (
                    <View style={[styles.bar, { height: `${(d.mood! / 5) * 100}%`, backgroundColor: mood.color }]} />
                  ) : (
                    <View style={[styles.dot, { backgroundColor: colors.surfaceAlt }]} />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.axis}>
            <T variant="muted">{formatShort(series[0].date)}</T>
            <T variant="muted">{t.today}</T>
          </View>
        </Card>

        <View style={styles.section} />
        <MoodYear entries={entries} />

        <T variant="label" style={styles.section}>
          {t.moodYear.patterns}
        </T>
        <MoodPatterns entries={entries} />

        {tags.length > 0 && (
          <>
            <T variant="label" style={styles.section}>
              {t.review.topTags}
            </T>
            <View style={styles.tags}>
              {tags.map(([tag, count]) => (
                <TagChip key={tag} tag={tag} suffix={`· ${count}`} />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.colors.surfaceAlt, borderRadius: theme.radius + 4 }]}>
      <T style={{ fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.accent }}>{formatNumber(value)}</T>
      <T variant="muted">{label}</T>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  section: { marginTop: 28, marginBottom: 10 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  stat: { flexGrow: 1, flexBasis: 140, paddingHorizontal: 14, paddingVertical: 10 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
