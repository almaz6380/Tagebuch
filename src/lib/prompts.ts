import { getMessages } from '@/i18n';
import { parseISODate } from './dates';

// The prompt texts live in the dictionaries (src/i18n); both languages have
// the same number, so the prompt of the day matches across languages.
export const TEMPLATE_KEYS = ['gratitude', 'evening'] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

/** Same prompt for everyone on a given day, so it feels like a "question of the day". */
export function promptIndexFor(date: string) {
  const count = getMessages().prompts.length;
  const days = Math.floor(parseISODate(date).getTime() / 86_400_000);
  return ((days % count) + count) % count;
}
