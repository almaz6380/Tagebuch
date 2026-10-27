import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';
import { I18nManager, Platform } from 'react-native';

import { getItem, setItem } from '@/lib/kv';
import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { it } from './it';
import { ja } from './ja';
import { ko } from './ko';
import { nl } from './nl';
import { pl } from './pl';
import { pt } from './pt';
import { ru } from './ru';
import { tr } from './tr';
import { zh } from './zh';

export type Lang = 'en' | 'de' | 'es' | 'fr' | 'it' | 'pt' | 'nl' | 'pl' | 'tr' | 'ru' | 'ja' | 'ko' | 'zh' | 'ar';
export type LangPref = 'system' | Lang;
/** Shape of every dictionary: de.ts with literals widened to strings. */
export type Messages = Widen<typeof de>;

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => string
    ? (...args: A) => string
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export const LANGS: readonly Lang[] = ['en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'pl', 'tr', 'ru', 'ja', 'ko', 'zh', 'ar'];
/** Each language in its own name, for the language picker. */
export const LANG_NAMES: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  nl: 'Nederlands',
  pl: 'Polski',
  tr: 'Türkçe',
  ru: 'Русский',
  ja: '日本語',
  ko: '한국어',
  zh: '简体中文',
  ar: 'العربية',
};
const DICTS: Record<Lang, Messages> = { en, de, es, fr, it, pt, nl, pl, tr, ru, ja, ko, zh, ar };
const RTL: ReadonlySet<Lang> = new Set(['ar']);

export function isRtl(l: Lang = lang): boolean {
  return RTL.has(l);
}

function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && (LANGS as readonly string[]).includes(v);
}
const STORAGE_KEY = 'tagebuch.lang';

/** The first device language we have, otherwise English. */
function systemLang(): Lang {
  try {
    for (const l of getLocales()) {
      if (isLang(l.languageCode)) return l.languageCode;
    }
  } catch {}
  return 'en';
}

let pref: LangPref = 'system';
let lang: Lang = systemLang();
const listeners = new Set<() => void>();

function apply(next: LangPref) {
  pref = next;
  lang = next === 'system' ? systemLang() : next;
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl() ? 'rtl' : 'ltr';
  }
  syncNativeDirection();
  listeners.forEach((l) => l());
}

/**
 * Native layout direction is fixed when the app starts. For a manually chosen
 * language with the other direction it changes from the next start on.
 * Returns true if a restart is needed.
 */
function syncNativeDirection(): boolean {
  if (Platform.OS === 'web' || I18nManager.isRTL === isRtl()) return false;
  I18nManager.allowRTL(isRtl());
  I18nManager.forceRTL(isRtl());
  return true;
}

export function needsRestartForDirection(): boolean {
  return Platform.OS !== 'web' && I18nManager.isRTL !== isRtl();
}

/** Loads the saved choice; until it resolves the device language is used. */
export async function initI18n() {
  const saved = await getItem(STORAGE_KEY).catch(() => null);
  if (saved === 'system' || isLang(saved)) apply(saved);
  else apply('system');
}

export async function setLanguage(next: LangPref) {
  apply(next);
  await setItem(STORAGE_KEY, next);
}

/** For code outside React (notifications, dialogs, date helpers): read at call time. */
export function getMessages(): Messages {
  return DICTS[lang];
}

export function getLang(): Lang {
  return lang;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Re-renders the component when the language changes. */
export function useI18n() {
  const current = useSyncExternalStore(subscribe, () => lang, () => lang);
  const currentPref = useSyncExternalStore(subscribe, () => pref, () => pref);
  return { t: DICTS[current], lang: current, pref: currentPref };
}
