import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';

import { EntryCard } from '@/components/EntryCard';
import { TagChip } from '@/components/TagChip';
import { Screen, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { moods } from '@/theme/themes';

// Case- and accent-insensitive ("Mädchen" matches "madchen").
const fold = (s: string) => s.toLocaleLowerCase('de').normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function SearchScreen() {
  const { theme } = useTheme();
  const { colors, fonts } = theme;
  const { entries, allTags } = useEntries();
  const [query, setQuery] = useState('');
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [mood, setMood] = useState<number | null>(null);

  const filtering = !!query.trim() || activeTags.length > 0 || mood != null;

  const results = useMemo(() => {
    if (!filtering) return [];
    const words = fold(query).split(/\s+/).filter(Boolean);
    return entries.filter((e) => {
      if (mood != null && e.mood !== mood) return false;
      if (!activeTags.every((t) => e.tags.includes(t))) return false;
      const haystack = fold(`${e.title} ${e.body} ${e.tags.join(' ')}`);
      return words.every((w) => haystack.includes(w));
    });
  }, [entries, query, activeTags, mood, filtering]);

  const toggleTag = (t: string) =>
    setActiveTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));

  return (
    <Screen>
      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <T variant="display">Suche</T>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: theme.radius + 4 },
              ]}>
              <Feather name="search" size={18} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Wonach suchst du?"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { fontFamily: fonts.ui, color: colors.text }]}
                autoCorrect={false}
              />
            </View>

            <T variant="label" style={styles.section}>
              Stimmung
            </T>
            <View style={styles.wrap}>
              {moods.map((m) => (
                <TagChipLike key={m.value} label={`${m.emoji} ${m.label}`} active={mood === m.value} onPress={() => setMood(mood === m.value ? null : m.value)} />
              ))}
            </View>

            {allTags.length > 0 && (
              <>
                <T variant="label" style={styles.section}>
                  Tags
                </T>
                <View style={styles.wrap}>
                  {allTags.map((t) => (
                    <TagChip key={t} tag={t} active={activeTags.includes(t)} onPress={() => toggleTag(t)} />
                  ))}
                </View>
              </>
            )}

            {filtering && (
              <T variant="muted" style={{ marginTop: 20 }}>
                {results.length === 0 ? 'Nichts gefunden.' : `${results.length} Treffer`}
              </T>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <EntryCard entry={item} />
          </View>
        )}
      />
    </Screen>
  );
}

function TagChipLike({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  return (
    <T
      onPress={onPress}
      accessibilityRole="button"
      style={{
        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceAlt,
        color: active ? theme.colors.accentText : theme.colors.text,
        borderRadius: 999,
        overflow: 'hidden',
        paddingHorizontal: 12,
        paddingVertical: 6,
        fontSize: 13,
      }}>
      {label}
    </T>
  );
}

const styles = StyleSheet.create({
  list: { padding: 20, paddingBottom: 60 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, paddingHorizontal: 14, marginTop: 16 },
  input: { flex: 1, fontSize: 16, paddingVertical: 12, outlineWidth: 0 },
  section: { marginTop: 20, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
