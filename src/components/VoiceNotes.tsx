import Feather from '@expo/vector-icons/Feather';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
} from 'expo-audio';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { addAudio, audioUri } from '@/db/audio';
import type { AudioClip } from '@/db/types';
import { notify } from '@/lib/confirm';
import { useI18n } from '@/i18n';
import { useTheme } from '@/theme/ThemeProvider';
import { T } from './Themed';

/** Longest voice note in seconds. */
const MAX_SECONDS = 300;

export function formatClock(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Record button for the editor. The browser version has no recording. */
export function VoiceRecorder({ onRecorded }: { onRecorded: (clip: AudioClip) => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const stopping = useRef(false);

  const stop = async () => {
    if (stopping.current || startedAt == null) return;
    stopping.current = true;
    const ms = Date.now() - startedAt;
    try {
      await recorder.stop();
      if (recorder.uri) onRecorded({ id: await addAudio(recorder.uri), ms });
    } catch (err) {
      console.warn('[voice] stop failed', err);
      notify(t.voice.deniedTitle, t.voice.failed);
    } finally {
      setStartedAt(null);
      stopping.current = false;
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
  };

  // Tick the clock and stop automatically at the limit.
  useEffect(() => {
    if (startedAt == null) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setNow(elapsed);
      if (elapsed >= MAX_SECONDS * 1000) stop();
    }, 250);
    return () => clearInterval(timer);
    // stop() reads the latest state through refs and startedAt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt]);

  const start = async () => {
    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      notify(t.voice.deniedTitle, t.voice.deniedBody);
      return;
    }
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setNow(0);
      setStartedAt(Date.now());
    } catch (err) {
      console.warn('[voice] start failed', err);
      notify(t.voice.deniedTitle, t.voice.failed);
    }
  };

  if (Platform.OS === 'web') return null;
  const recording = startedAt != null;
  return (
    <Pressable
      onPress={recording ? stop : start}
      accessibilityRole="button"
      accessibilityLabel={recording ? t.voice.stop : t.voice.recordA11y}
      accessibilityHint={t.voice.maxHint}
      style={[
        styles.recordButton,
        {
          borderColor: recording ? colors.danger : colors.border,
          backgroundColor: recording ? colors.surfaceAlt : 'transparent',
          borderRadius: theme.radius,
        },
      ]}>
      <Feather name={recording ? 'square' : 'mic'} size={20} color={recording ? colors.danger : colors.accent} />
      <T variant="muted" style={{ fontSize: 11, textAlign: 'center' }} numberOfLines={2}>
        {recording ? formatClock(now) : t.voice.record}
      </T>
    </Pressable>
  );
}

/** One saved voice note with play/pause and, in the editor, a delete button. */
export function VoiceClip({ clip, index, onRemove }: { clip: AudioClip; index: number; onRemove?: () => void }) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const [uri, setUri] = useState<string | null>(null);
  const player = useAudioPlayer(uri ? { uri } : null);
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    let live = true;
    audioUri(clip.id).then((u) => live && setUri(u));
    return () => {
      live = false;
    };
  }, [clip.id]);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    await setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) {
      await player.seekTo(0);
    }
    player.play();
  };

  const position = status.playing || status.currentTime > 0 ? status.currentTime * 1000 : clip.ms;
  return (
    <View style={[styles.clip, { backgroundColor: colors.surfaceAlt, borderRadius: theme.radius + 4 }]}>
      <Pressable
        onPress={toggle}
        disabled={!uri}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? t.voice.pause : t.voice.play}
        hitSlop={8}
        style={[styles.play, { backgroundColor: colors.accent, opacity: uri ? 1 : 0.4 }]}>
        <Feather name={status.playing ? 'pause' : 'play'} size={16} color={colors.accentText} />
      </Pressable>
      <T style={{ flex: 1 }}>{t.voice.clip(index + 1, formatClock(position))}</T>
      {onRemove && (
        <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel={t.voice.remove} hitSlop={10}>
          <Feather name="trash-2" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  recordButton: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  clip: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8 },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
