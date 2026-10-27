import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, T } from '@/components/Themed';
import { TRASH_DAYS, useEntries } from '@/db/EntriesProvider';
import { confirm } from '@/lib/confirm';
import { formatLong } from '@/lib/dates';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { moodInfo } from '@/theme/themes';

function daysLeft(deletedAt: number) {
  return Math.max(0, TRASH_DAYS - Math.floor((Date.now() - deletedAt) / 86_400_000));
}

export default function TrashScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const { trash, restore, purge, emptyTrash } = useEntries();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <Screen>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button" accessibilityLabel={t.trash.backA11y} style={styles.back}>
          <Feather name="chevron-left" size={22} color={colors.accent} />
          <T style={{ color: colors.accent }}>{t.trash.back}</T>
        </Pressable>
      </View>
      <FlatList
        data={trash}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <T variant="display">{t.trash.title}</T>
            <T variant="muted" style={{ marginTop: 6 }}>
              {t.trash.info(TRASH_DAYS)}
            </T>
            {trash.length > 0 && (
              <Button
                kind="danger"
                label={t.trash.empty}
                style={{ marginTop: 14 }}
                onPress={async () => {
                  const n = trash.length;
                  if (await confirm(t.trash.emptyTitle, t.trash.emptyBody(n), t.trash.emptyConfirm)) {
                    await emptyTrash();
                  }
                }}
              />
            )}
          </View>
        }
        ListEmptyComponent={<T variant="body" style={{ color: colors.textMuted }}>{t.trash.isEmpty}</T>}
        renderItem={({ item }) => {
          const mood = moodInfo(item.mood);
          const left = daysLeft(item.deletedAt!);
          return (
            <Card style={{ marginBottom: 12 }}>
              <T variant="muted">
                {formatLong(item.date)}
                {mood ? ` · ${mood.emoji}` : ''}
              </T>
              <T variant="title" numberOfLines={1} style={{ fontSize: theme.name === 'paper' ? 24 : 17, marginTop: 2 }}>
                {item.title || t.untitled}
              </T>
              {!!item.body && (
                <T variant="body" numberOfLines={2} style={{ fontSize: 14, lineHeight: 21, color: colors.textMuted }}>
                  {item.body}
                </T>
              )}
              <T variant="muted" style={{ marginTop: 8 }}>
                {left === 0 ? t.trash.lastDay : t.trash.daysLeft(left)}
                {item.photos.length > 0 ? ` · ${t.trash.photos(item.photos.length)}` : ''}
              </T>
              <View style={styles.actions}>
                <Button label={t.trash.restore} onPress={() => restore(item.id)} style={{ flex: 1 }} />
                <Button
                  kind="danger"
                  label={t.trash.purge}
                  style={{ flex: 1 }}
                  onPress={async () => {
                    if (await confirm(t.trash.purgeTitle, t.trash.purgeBody, t.trash.purgeConfirm)) {
                      await purge(item.id);
                    }
                  }}
                />
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  list: { padding: 20, paddingBottom: 60 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
