export type ThemeName = 'paper' | 'minimal' | 'playful' | 'dark';

export type Theme = {
  name: ThemeName;
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    surfaceAlt: string;
    text: string;
    textMuted: string;
    accent: string;
    accentText: string;
    border: string;
    line: string;
    margin: string;
    danger: string;
  };
  fonts: {
    display: string;
    body: string;
    ui: string;
    uiBold: string;
  };
  radius: number;
  /** Notebook rules behind the editor and cards. */
  ruled: boolean;
};

export const themes: Record<ThemeName, Theme> = {
  paper: {
    name: 'paper',
    dark: false,
    colors: {
      background: '#F5EFE3',
      surface: '#FBF7EE',
      surfaceAlt: '#EDE4D3',
      text: '#2E2A24',
      textMuted: '#857A6A',
      accent: '#8C5A3C',
      accentText: '#FBF7EE',
      border: '#E2D6C1',
      line: '#D9E2EC',
      margin: '#E8B4A8',
      danger: '#B4483A',
    },
    fonts: {
      display: 'Caveat_700Bold',
      body: 'Lora_400Regular',
      ui: 'Inter_400Regular',
      uiBold: 'Inter_600SemiBold',
    },
    radius: 6,
    ruled: true,
  },
  minimal: {
    name: 'minimal',
    dark: false,
    colors: {
      background: '#FFFFFF',
      surface: '#F7F7F5',
      surfaceAlt: '#EFEFEC',
      text: '#1C1C1E',
      textMuted: '#8A8A8E',
      accent: '#3D6B5E',
      accentText: '#FFFFFF',
      border: '#E6E6E3',
      line: 'transparent',
      margin: 'transparent',
      danger: '#C0392B',
    },
    fonts: {
      display: 'Inter_600SemiBold',
      body: 'Inter_400Regular',
      ui: 'Inter_400Regular',
      uiBold: 'Inter_600SemiBold',
    },
    radius: 14,
    ruled: false,
  },
  playful: {
    name: 'playful',
    dark: false,
    colors: {
      background: '#FFF4F8',
      surface: '#FFFFFF',
      surfaceAlt: '#FFE3EE',
      text: '#3A2E4D',
      textMuted: '#9A8AAE',
      accent: '#FF6F91',
      accentText: '#FFFFFF',
      border: '#F6D3E1',
      line: 'transparent',
      margin: 'transparent',
      danger: '#E04F5F',
    },
    fonts: {
      display: 'Nunito_800ExtraBold',
      body: 'Nunito_400Regular',
      ui: 'Nunito_400Regular',
      uiBold: 'Nunito_700Bold',
    },
    radius: 22,
    ruled: false,
  },
  dark: {
    name: 'dark',
    dark: true,
    colors: {
      background: '#14161B',
      surface: '#1D2027',
      surfaceAlt: '#272B34',
      text: '#ECE7DD',
      textMuted: '#8B8E98',
      accent: '#D4B483',
      accentText: '#14161B',
      border: '#2C303A',
      line: '#232731',
      margin: 'transparent',
      danger: '#E07A6B',
    },
    fonts: {
      display: 'Lora_600SemiBold',
      body: 'Lora_400Regular',
      ui: 'Inter_400Regular',
      uiBold: 'Inter_600SemiBold',
    },
    radius: 10,
    ruled: true,
  },
};

export const themeOrder: ThemeName[] = ['paper', 'minimal', 'playful', 'dark'];

// Mood names are in the dictionaries (t.moods[value]).
export const moods = [
  { value: 1, emoji: '😢', color: '#7A8FB8' },
  { value: 2, emoji: '🙁', color: '#9BB0C9' },
  { value: 3, emoji: '😐', color: '#C9B98F' },
  { value: 4, emoji: '🙂', color: '#9CC48F' },
  { value: 5, emoji: '😄', color: '#F2A65A' },
] as const;

export function moodInfo(value: number | null | undefined) {
  return moods.find((m) => m.value === value);
}
