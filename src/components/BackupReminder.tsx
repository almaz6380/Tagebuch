import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useEntries } from '@/db/EntriesProvider';
import { BACKUP_INTERVAL_DAYS, daysSince, useLastBackup } from '@/lib/backup';
import { useBackup } from '@/lib/useBackup';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, T } from './Themed';

/** Shown on the home screen when the last backup is missing or overdue. */
export function BackupReminder() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { entries } = useEntries();
  const last = useLastBackup();
  const { backup } = useBackup();

  // Not worth nagging about one or two entries.
  if (last === undefined || entries.length < 3) return null;
  if (last !== null && daysSince(last) < BACKUP_INTERVAL_DAYS) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Feather name="shield" size={20} color={theme.colors.accent} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: theme.fonts.uiBold }}>{t.backupReminder.title}</T>
          <T variant="muted">
            {last === null
              ? t.backupReminder.never
              : t.backupReminder.since(daysSince(last))}
          </T>
        </View>
      </View>
      <Button label={t.backupReminder.now} onPress={backup} style={{ marginTop: 12 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
