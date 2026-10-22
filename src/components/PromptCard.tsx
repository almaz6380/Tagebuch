import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { PROMPTS, promptIndexFor, TEMPLATES } from '@/lib/prompts';
import { useTheme } from '@/theme/ThemeProvider';
import { Card, T } from './Themed';

/** Writing prompt shown while the entry is still empty. */
export function PromptCard({
  date,
  onUsePrompt,
  onUseTemplate,
}: {
  date: string;
  onUsePrompt: (prompt: string) => void;
  onUseTemplate: (template: (typeof TEMPLATES)[number]) => void;
}) {
  const { theme } = useTheme();
  const [index, setIndex] = useState(() => promptIndexFor(date));
  const prompt = PROMPTS[index];

  return (
    <Card style={{ marginTop: 16 }}>
      <View style={styles.header}>
        <Feather name="feather" size={16} color={theme.colors.accent} />
        <T variant="label">Impuls</T>
      </View>
      <T variant="body" style={{ marginTop: 8 }}>
        {prompt}
      </T>
      <View style={styles.actions}>
        <Pressable onPress={() => onUsePrompt(prompt)} accessibilityRole="button" hitSlop={8}>
          <T style={{ color: theme.colors.accent, fontFamily: theme.fonts.uiBold }}>Übernehmen</T>
        </Pressable>
        <Pressable
          onPress={() => setIndex((i) => (i + 1) % PROMPTS.length)}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.next}>
          <Feather name="refresh-cw" size={14} color={theme.colors.textMuted} />
          <T variant="muted">Anderer Impuls</T>
        </Pressable>
      </View>
      <View style={[styles.templates, { borderTopColor: theme.colors.border }]}>
        <T variant="muted">Vorlage:</T>
        {TEMPLATES.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => onUseTemplate(t)}
            accessibilityRole="button"
            style={[styles.chip, { backgroundColor: theme.colors.surfaceAlt }]}>
            <T style={{ fontSize: 13 }}>{t.label}</T>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  next: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  templates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
