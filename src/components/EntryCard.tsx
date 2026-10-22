import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Entry } from '@/db/types';
import { parseISODate } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo } from '@/theme/themes';
import { Photo } from './Photo';
import { Card, T } from './Themed';
import { TagChip } from './TagChip';

export function EntryCard({ entry }: { entry: Entry }) {
  const { theme } = useTheme();
  const date = parseISODate(entry.date);
  const mood = moodInfo(entry.mood);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/entry', params: { id: entry.id } })}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      <Card style={styles.card}>
        <View style={[styles.dateCol, { borderRightColor: theme.colors.margin !== 'transparent' ? theme.colors.margin : theme.colors.border }]}>
          <Text style={{ fontFamily: theme.fonts.display, fontSize: theme.name === 'paper' ? 34 : 26, color: theme.colors.accent }}>
            {date.getDate()}
          </Text>
          <T variant="label" style={{ fontSize: 10 }}>
            {date.toLocaleDateString('de-DE', { weekday: 'short' })}
          </T>
          {mood && <Text style={styles.mood}>{mood.emoji}</Text>}
        </View>
        <View style={styles.content}>
          <T variant="title" numberOfLines={1} style={{ fontSize: theme.name === 'paper' ? 24 : 17 }}>
            {entry.title || 'Ohne Titel'}
          </T>
          {!!entry.body && (
            <T variant="body" numberOfLines={3} style={{ fontSize: 14, lineHeight: 21, color: theme.colors.textMuted, marginTop: 4 }}>
              {entry.body}
            </T>
          )}
          {entry.photos.length > 0 && (
            <View style={styles.photos}>
              <Photo id={entry.photos[0]} style={[styles.thumb, { borderRadius: theme.radius }]} />
              {entry.photos.length > 1 && <T variant="muted">+{entry.photos.length - 1}</T>}
            </View>
          )}
          {entry.tags.length > 0 && (
            <View style={styles.tags}>
              {entry.tags.map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14 },
  dateCol: { width: 52, alignItems: 'center', borderRightWidth: 1, paddingRight: 12 },
  mood: { fontSize: 20, marginTop: 6 },
  content: { flex: 1, minWidth: 0 },
  photos: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  thumb: { width: 96, height: 72 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
});
