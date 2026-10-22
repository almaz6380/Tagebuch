import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { TagChip } from '@/components/TagChip';
import { Card, Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { parseISODate, todayISO } from '@/lib/dates';
import { currentStreak, longestStreak, moodSeries, onThisDay, topTags, wordCount } from '@/lib/stats';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo } from '@/theme/themes';

const CHART_DAYS = 30;

export default function ReviewScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { entries } = useEntries();

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
          <T variant="display">Rückblick</T>
          <T variant="body" style={{ color: colors.textMuted, marginTop: 12 }}>
            Sobald du ein paar Einträge geschrieben hast, siehst du hier deine Schreib-Serie, deinen Stimmungsverlauf und
            Erinnerungen von früher.
          </T>
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <T variant="display">Rückblick</T>

        <View style={styles.stats}>
          <Stat value={currentStreak(entries)} label="Tage in Folge" />
          <Stat value={longestStreak(entries)} label="längste Serie" />
          <Stat value={thisMonth} label="diesen Monat" />
          <Stat value={words} label={words === 1 ? 'Wort' : 'Wörter'} />
        </View>

        <T variant="label" style={styles.section}>
          An diesem Tag
        </T>
        {memories.length === 0 && (
          <T variant="muted">Vor einem Monat oder einem Jahr hast du an diesem Tag noch nichts geschrieben.</T>
        )}
        {memories.map((m) => (
          <View key={m.label} style={{ marginBottom: 8 }}>
            <T style={{ fontFamily: theme.fonts.uiBold, marginBottom: 8 }}>{m.label}</T>
            {m.entries.map((e) => (
              <View key={e.id} style={{ marginBottom: 12 }}>
                <EntryCard entry={e} />
              </View>
            ))}
          </View>
        ))}

        <T variant="label" style={styles.section}>
          Stimmung der letzten {CHART_DAYS} Tage
        </T>
        <Card>
          {averageMood ? (
            <T variant="muted" style={{ marginBottom: 12 }}>
              Im Schnitt: {averageMood.emoji} {averageMood.label} ({rated.length} {rated.length === 1 ? 'Tag' : 'Tage'} bewertet)
            </T>
          ) : (
            <T variant="muted" style={{ marginBottom: 12 }}>
              In den letzten {CHART_DAYS} Tagen hast du keine Stimmung angegeben.
            </T>
          )}
          <View style={styles.chart} accessibilityLabel="Stimmungsverlauf">
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
            <T variant="muted">{parseISODate(series[0].date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}</T>
            <T variant="muted">heute</T>
          </View>
        </Card>

        {tags.length > 0 && (
          <>
            <T variant="label" style={styles.section}>
              Häufigste Tags
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
      <T style={{ fontFamily: theme.fonts.display, fontSize: 26, color: theme.colors.accent }}>{value.toLocaleString('de-DE')}</T>
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
