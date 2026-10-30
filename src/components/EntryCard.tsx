import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { isSealed, type Entry } from '@/db/types';
import { notify } from '@/lib/confirm';
import { formatLong, parseISODate, todayISO, weekdayShort } from '@/lib/dates';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo } from '@/theme/themes';
import { Photo } from './Photo';
import { Card, T } from './Themed';
import { TagChip } from './TagChip';

export function EntryCard({ entry }: { entry: Entry }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const date = parseISODate(entry.date);
  const mood = moodInfo(entry.mood);
  if (isSealed(entry, todayISO())) {
    const opens = formatLong(entry.sealedUntil!);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.capsule.sealedCard(opens)}
        onPress={() => notify(t.capsule.title, t.capsule.lockedBody(opens))}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
        <Card style={[styles.card, { alignItems: 'center' }]}>
          <View style={[styles.sealIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Feather name="lock" size={20} color={theme.colors.accent} />
          </View>
          <View style={styles.content}>
            <T style={{ fontFamily: theme.fonts.uiBold }}>{t.capsule.title}</T>
            <T variant="muted">{t.capsule.sealedUntil(opens)}</T>
            <T variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
              {t.capsule.writtenOn(formatLong(entry.date))}
            </T>
          </View>
        </Card>
      </Pressable>
    );
  }
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
            {weekdayShort(entry.date)}
          </T>
          {mood && <Text style={styles.mood}>{mood.emoji}</Text>}
        </View>
        <View style={styles.content}>
          <T variant="title" numberOfLines={1} style={{ fontSize: theme.name === 'paper' ? 24 : 17 }}>
            {entry.title || t.untitled}
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
          {(entry.audio.length > 0 || entry.sealedUntil) && (
            <View style={styles.extras}>
              {entry.sealedUntil && (
                <View style={styles.extra}>
                  <Feather name="gift" size={13} color={theme.colors.accent} />
                  <T variant="muted" style={{ fontSize: 12 }}>
                    {t.capsule.opened}
                  </T>
                </View>
              )}
              {entry.audio.length > 0 && (
                <View style={styles.extra}>
                  <Feather name="mic" size={13} color={theme.colors.accent} />
                  <T variant="muted" style={{ fontSize: 12 }}>
                    {t.voice.count(entry.audio.length)}
                  </T>
                </View>
              )}
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
  extras: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  extra: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sealIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
