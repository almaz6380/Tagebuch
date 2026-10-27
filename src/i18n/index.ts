import { getLocales } from 'expo-localization';
import { useSyncExternalStore } from 'react';

import { getItem, setItem } from '@/lib/kv';
import { de } from './de';
import { en } from './en';

export type Lang = 'de' | 'en';
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

export const LANGS: readonly Lang[] = ['en', 'de'];
export const LANG_NAMES: Record<Lang, string> = { en: 'English', de: 'Deutsch' };
const DICTS: Record<Lang, Messages> = { de, en };
const STORAGE_KEY = 'tagebuch.lang';

/** German devices get German, everyone else English. */
function systemLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'de' ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

let pref: LangPref = 'system';
let lang: Lang = systemLang();
const listeners = new Set<() => void>();

function apply(next: LangPref) {
  pref = next;
  lang = next === 'system' ? systemLang() : next;
  if (typeof document !== 'undefined') document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

/** Loads the saved choice; until it resolves the device language is used. */
export async function initI18n() {
  const saved = await getItem(STORAGE_KEY).catch(() => null);
  if (saved === 'de' || saved === 'en' || saved === 'system') apply(saved);
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
