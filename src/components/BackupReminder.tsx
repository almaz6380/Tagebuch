import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { useEntries } from '@/db/EntriesProvider';
import { BACKUP_INTERVAL_DAYS, daysSince, useLastBackup } from '@/lib/backup';
import { useBackup } from '@/lib/useBackup';
import { useTheme } from '@/theme/ThemeProvider';
import { Button, Card, T } from './Themed';

/** Shown on the home screen when the last backup is missing or overdue. */
export function BackupReminder() {
  const { theme } = useTheme();
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
          <T style={{ fontFamily: theme.fonts.uiBold }}>Zeit für ein Backup</T>
          <T variant="muted">
            {last === null
              ? 'Du hast deine Einträge noch nie gesichert. Sie liegen nur auf diesem Gerät.'
              : `Deine letzte Sicherung ist ${daysSince(last)} Tage her.`}
          </T>
        </View>
      </View>
      <Button label="Jetzt sichern" onPress={backup} style={{ marginTop: 12 }} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 14 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
});
