import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoodPicker } from '@/components/MoodPicker';
import { RuledLines } from '@/components/RuledLines';
import { TagChip } from '@/components/TagChip';
import { Button, Card, T } from '@/components/Themed';
import { useEntries } from '@/db/EntriesProvider';
import type { Entry } from '@/db/types';
import { confirm } from '@/lib/confirm';
import { formatLong, shiftDays, todayISO } from '@/lib/dates';
import { useTheme } from '@/theme/ThemeProvider';

const LINE = 30;
const BODY_PADDING_TOP = 6;

function normalizeTag(raw: string) {
  return raw.trim().replace(/^#+/, '').replace(/\s+/g, '-').toLowerCase();
}

export default function EntryScreen() {
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  const { get, loaded } = useEntries();
  const { theme } = useTheme();
  // Entries load asynchronously on a cold start; wait so the form starts with the saved values.
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  return <EntryForm key={id ?? 'new'} existing={id ? get(id) : undefined} initialDate={date} />;
}

function EntryForm({ existing, initialDate }: { existing?: Entry; initialDate?: string }) {
  const { theme } = useTheme();
  const { colors, fonts } = theme;
  const insets = useSafeAreaInsets();
  const { save, remove, allTags } = useEntries();

  const [date, setDate] = useState(existing?.date ?? initialDate ?? todayISO());
  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [mood, setMood] = useState<number | null>(existing?.mood ?? null);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [tagDraft, setTagDraft] = useState('');
  const [bodyHeight, setBodyHeight] = useState(LINE * 10);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const onSave = async () => {
    const pending = normalizeTag(tagDraft);
    const finalTags = pending && !tags.includes(pending) ? [...tags, pending] : tags;
    if (!title.trim() && !body.trim() && mood == null) return close();
    await save({ id: existing?.id, date, title: title.trim(), body, mood, tags: finalTags });
    close();
  };

  const onDelete = async () => {
    if (!existing) return;
    if (await confirm('Eintrag löschen?', 'Das kann nicht rückgängig gemacht werden.', 'Löschen')) {
      await remove(existing.id);
      close();
    }
  };

  const addTag = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setTagDraft('');
  };

  const suggestions = allTags.filter((t) => !tags.includes(t) && (!tagDraft || t.startsWith(normalizeTag(tagDraft)))).slice(0, 6);
  const hasMargin = theme.ruled && colors.margin !== 'transparent';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={close} hitSlop={12} accessibilityRole="button">
          <T style={{ color: colors.textMuted }}>Abbrechen</T>
        </Pressable>
        <View style={styles.dateNav}>
          <Pressable onPress={() => setDate(shiftDays(date, -1))} hitSlop={10} accessibilityLabel="Vorheriger Tag">
            <Feather name="chevron-left" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable onPress={() => setDate(todayISO())} accessibilityLabel="Auf heute setzen">
            <T style={{ fontFamily: fonts.uiBold, fontSize: 14 }}>{formatLong(date).replace(/ \d{4}$/, '')}</T>
          </Pressable>
          <Pressable onPress={() => setDate(shiftDays(date, 1))} hitSlop={10} accessibilityLabel="Nächster Tag">
            <Feather name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
        <Pressable onPress={onSave} hitSlop={12} accessibilityRole="button">
          <T style={{ color: colors.accent, fontFamily: fonts.uiBold }}>Fertig</T>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Titel"
          placeholderTextColor={colors.textMuted}
          style={[
            styles.title,
            { fontFamily: fonts.display, color: colors.text, fontSize: theme.name === 'paper' ? 38 : 28 },
          ]}
        />

        <Card style={{ marginTop: 8 }}>
          <T variant="label" style={{ marginBottom: 10 }}>
            Wie war dein Tag?
          </T>
          <MoodPicker value={mood} onChange={setMood} />
        </Card>

        <View style={styles.tagRow}>
          {tags.map((t) => (
            <TagChip key={t} tag={t} active suffix="×" onPress={() => setTags(tags.filter((x) => x !== t))} />
          ))}
          <TextInput
            value={tagDraft}
            onChangeText={(v) => (v.endsWith(',') || v.endsWith(' ') ? addTag(v) : setTagDraft(v))}
            onSubmitEditing={() => addTag(tagDraft)}
            submitBehavior="submit"
            placeholder="+ Tag"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            style={[styles.tagInput, { fontFamily: fonts.ui, color: colors.text }]}
          />
        </View>
        {suggestions.length > 0 && (
          <View style={[styles.tagRow, { marginTop: 6 }]}>
            {suggestions.map((t) => (
              <TagChip key={t} tag={t} onPress={() => addTag(t)} />
            ))}
          </View>
        )}

        <View
          style={[
            styles.page,
            {
              backgroundColor: theme.ruled ? colors.surface : 'transparent',
              borderRadius: theme.radius,
              borderColor: theme.ruled ? colors.border : 'transparent',
            },
          ]}>
          <RuledLines height={Math.max(bodyHeight, LINE * 12)} lineHeight={LINE} offset={BODY_PADDING_TOP} />
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            scrollEnabled={false}
            placeholder="Liebes Tagebuch …"
            placeholderTextColor={colors.textMuted}
            onContentSizeChange={(e) => setBodyHeight(e.nativeEvent.contentSize.height)}
            style={[
              styles.body,
              {
                fontFamily: fonts.body,
                color: colors.text,
                minHeight: LINE * 12,
                height: Platform.OS === 'web' ? Math.max(bodyHeight, LINE * 12) : undefined,
                paddingLeft: hasMargin ? 42 : 14,
              },
            ]}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          {existing && <Button kind="danger" label="Löschen" onPress={onDelete} style={{ flex: 1 }} />}
          <Button label="Speichern" onPress={onSave} style={{ flex: 2 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dateNav: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scroll: { padding: 20, paddingBottom: 60, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { paddingVertical: 6, outlineWidth: 0 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 16 },
  tagInput: { minWidth: 80, fontSize: 14, paddingVertical: 4, outlineWidth: 0 },
  page: { marginTop: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  body: {
    fontSize: 17,
    lineHeight: LINE,
    paddingTop: BODY_PADDING_TOP,
    paddingRight: 14,
    paddingBottom: LINE,
    textAlignVertical: 'top',
    outlineWidth: 0,
  },
});
