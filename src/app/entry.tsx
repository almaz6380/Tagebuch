import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoodPicker } from '@/components/MoodPicker';
import { Photo, PhotoViewer } from '@/components/Photo';
import { PromptCard } from '@/components/PromptCard';
import { RuledLines } from '@/components/RuledLines';
import { TagChip } from '@/components/TagChip';
import { Button, Card, T } from '@/components/Themed';
import { TRASH_DAYS, useEntries } from '@/db/EntriesProvider';
import { deletePhoto } from '@/db/photos';
import type { Entry } from '@/db/types';
import { confirm, notify } from '@/lib/confirm';
import { formatLong, shiftDays, todayISO } from '@/lib/dates';
import { clearDraft, loadDraft, saveDraft } from '@/lib/drafts';
import type { DraftData } from '@/lib/draftTypes';
import { pickPhotos } from '@/lib/pickPhotos';
import { useTheme } from '@/theme/ThemeProvider';

const LINE = 30;
const BODY_PADDING_TOP = 6;
const DRAFT_DELAY_MS = 800;

type Fields = Omit<DraftData, 'savedAt'>;

function sameFields(a: Fields, b: Fields) {
  return JSON.stringify(a) === JSON.stringify(b);
}

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


  // Values when the editor opened; never changes for this form instance.
  const [baseline] = useState<Fields>(() => ({
    date: existing?.date ?? initialDate ?? todayISO(),
    title: existing?.title ?? '',
    body: existing?.body ?? '',
    mood: existing?.mood ?? null,
    tags: existing?.tags ?? [],
    photos: existing?.photos ?? [],
  }));
  const draftKey = existing?.id ?? 'new';

  const [date, setDate] = useState(baseline.date);
  const [title, setTitle] = useState(baseline.title);
  const [body, setBody] = useState(baseline.body);
  const [mood, setMood] = useState<number | null>(baseline.mood);
  const [tags, setTags] = useState<string[]>(baseline.tags);
  const [photos, setPhotos] = useState<string[]>(baseline.photos);
  const [tagDraft, setTagDraft] = useState('');
  const [bodyHeight, setBodyHeight] = useState(LINE * 10);
  const [viewing, setViewing] = useState<number | null>(null);
  const [addingPhotos, setAddingPhotos] = useState(false);
  // Draft handling: don't autosave until a stored draft had the chance to load.
  const [draftReady, setDraftReady] = useState(false);
  const [restored, setRestored] = useState(false);

  const fields: Fields = { date, title, body, mood, tags, photos };
  const dirty = !sameFields(fields, baseline);
  /** Photos stored during this edit that the saved entry doesn't know about. */
  const unsavedPhotos = (list: string[]) => list.filter((p) => !baseline.photos.includes(p));

  const apply = (f: Fields) => {
    setDate(f.date);
    setTitle(f.title);
    setBody(f.body);
    setMood(f.mood);
    setTags(f.tags);
    setPhotos(f.photos);
  };

  useEffect(() => {
    loadDraft(draftKey).then((draft) => {
      if (draft && draft.savedAt > (existing?.updatedAt ?? 0)) {
        const { savedAt: _, ...rest } = draft;
        if (!sameFields(rest, baseline)) {
          apply(rest);
          setRestored(true);
        }
      }
      setDraftReady(true);
    });
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fieldsKey = JSON.stringify(fields);
  useEffect(() => {
    if (!draftReady) return;
    if (!dirty) {
      clearDraft(draftKey);
      return;
    }
    const t = setTimeout(() => saveDraft(draftKey, { ...fields, savedAt: Date.now() }), DRAFT_DELAY_MS);
    return () => clearTimeout(t);
    // fieldsKey captures every field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsKey, draftReady]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const discardChanges = async () => {
    await clearDraft(draftKey);
    await Promise.all(unsavedPhotos(photos).map((p) => deletePhoto(p).catch(() => {})));
  };

  const onCancel = async () => {
    if (dirty && !(await confirm('Änderungen verwerfen?', 'Was du seit dem letzten Speichern geschrieben hast, geht verloren.', 'Verwerfen'))) {
      return;
    }
    await discardChanges();
    close();
  };

  const onDiscardDraft = async () => {
    await discardChanges();
    apply(baseline);
    setRestored(false);
  };

  const onSave = async () => {
    const pending = normalizeTag(tagDraft);
    const finalTags = pending && !tags.includes(pending) ? [...tags, pending] : tags;
    if (!title.trim() && !body.trim() && mood == null && !photos.length) {
      await discardChanges();
      return close();
    }
    await save({ id: existing?.id, date, title: title.trim(), body, mood, tags: finalTags, photos });
    await clearDraft(draftKey);
    close();
  };

  const onDelete = async () => {
    if (!existing) return;
    if (await confirm('In den Papierkorb legen?', `Du kannst den Eintrag ${TRASH_DAYS} Tage lang wiederherstellen.`, 'Löschen')) {
      await discardChanges();
      await remove(existing.id);
      close();
    }
  };

  const addPhotos = async (source: 'library' | 'camera') => {
    setAddingPhotos(true);
    try {
      const ids = await pickPhotos(source);
      setPhotos((prev) => [...prev, ...ids]);
    } catch (err) {
      notify('Foto nicht möglich', err instanceof Error ? err.message : 'Das Foto konnte nicht hinzugefügt werden.');
    } finally {
      setAddingPhotos(false);
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p !== id));
    // Saved photos are only deleted once the entry is saved without them.
    if (!baseline.photos.includes(id)) deletePhoto(id).catch(() => {});
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
        <Pressable onPress={onCancel} hitSlop={12} accessibilityRole="button">
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
        {restored && (
          <View style={[styles.banner, { backgroundColor: colors.surfaceAlt, borderRadius: theme.radius + 4 }]}>
            <Feather name="rotate-ccw" size={16} color={colors.accent} />
            <T style={{ flex: 1, fontSize: 14 }}>Entwurf wiederhergestellt</T>
            <Pressable onPress={onDiscardDraft} accessibilityRole="button" hitSlop={8}>
              <T style={{ color: colors.accent, fontFamily: fonts.uiBold, fontSize: 14 }}>Verwerfen</T>
            </Pressable>
          </View>
        )}
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

        <View style={styles.photoRow}>
          {photos.map((p, i) => (
            <View key={p}>
              <Pressable onPress={() => setViewing(i)} accessibilityRole="imagebutton" accessibilityLabel={`Foto ${i + 1} ansehen`}>
                <Photo id={p} style={[styles.thumb, { borderRadius: theme.radius }]} />
              </Pressable>
              <Pressable
                onPress={() => removePhoto(p)}
                accessibilityRole="button"
                accessibilityLabel={`Foto ${i + 1} entfernen`}
                hitSlop={8}
                style={[styles.removePhoto, { backgroundColor: colors.text }]}>
                <Feather name="x" size={12} color={colors.background} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => addPhotos('library')}
            disabled={addingPhotos}
            accessibilityRole="button"
            accessibilityLabel="Foto hinzufügen"
            style={[styles.addPhoto, { borderColor: colors.border, borderRadius: theme.radius, opacity: addingPhotos ? 0.5 : 1 }]}>
            <Feather name="image" size={20} color={colors.accent} />
            <T variant="muted">{addingPhotos ? '…' : 'Foto'}</T>
          </Pressable>
          {Platform.OS !== 'web' && (
            <Pressable
              onPress={() => addPhotos('camera')}
              disabled={addingPhotos}
              accessibilityRole="button"
              accessibilityLabel="Foto aufnehmen"
              style={[styles.addPhoto, { borderColor: colors.border, borderRadius: theme.radius, opacity: addingPhotos ? 0.5 : 1 }]}>
              <Feather name="camera" size={20} color={colors.accent} />
              <T variant="muted">Kamera</T>
            </Pressable>
          )}
        </View>

        {!body.trim() && (
          <PromptCard
            date={date}
            onUsePrompt={(prompt) => setBody(`${prompt}\n`)}
            onUseTemplate={(t) => {
              setBody(t.text);
              if (!title.trim()) setTitle(t.label);
            }}
          />
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
      {viewing != null && <PhotoViewer ids={photos} start={viewing} onClose={() => setViewing(null)} />}
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
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  thumb: { width: 76, height: 76 },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
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
