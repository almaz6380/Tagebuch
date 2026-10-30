import { readPhotoBase64 } from '@/db/photos';
import type { Entry } from '@/db/types';
import { getMessages } from '@/i18n';
import { moodInfo } from '@/theme/themes';
import { formatLong, todayISO } from './dates';

export type BookRange = 'month' | 'year' | 'all';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Entries of the chosen period, oldest first, without closed time capsules. */
export function bookEntries(entries: Entry[], range: BookRange, today = todayISO()) {
  const prefix = range === 'month' ? today.slice(0, 7) : range === 'year' ? today.slice(0, 4) : '';
  return entries
    .filter((e) => e.date.startsWith(prefix) && !(e.sealedUntil && e.sealedUntil > today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);
}

/** A printable book: cover page, then one section per entry with photos embedded. */
export async function buildBookHtml(list: Entry[]): Promise<string> {
  const t = getMessages();
  const dir = t.locale.startsWith('ar') ? 'rtl' : 'ltr';
  const range =
    list.length > 1 ? `${formatLong(list[0].date)} – ${formatLong(list[list.length - 1].date)}` : formatLong(list[0].date);
  const pages: string[] = [];
  for (const e of list) {
    const mood = moodInfo(e.mood);
    const photos: string[] = [];
    for (const id of e.photos) {
      const data = await readPhotoBase64(id).catch(() => null);
      if (data) photos.push(`<img src="data:image/jpeg;base64,${data}" />`);
    }
    pages.push(`<section class="entry">
      <div class="date">${escape(formatLong(e.date))}${mood ? ` <span class="mood">${mood.emoji}</span>` : ''}</div>
      <h2>${escape(e.title || t.untitled)}</h2>
      ${e.body ? `<div class="body">${escape(e.body).replace(/\n/g, '<br/>')}</div>` : ''}
      ${photos.length ? `<div class="photos">${photos.join('')}</div>` : ''}
      ${e.tags.length ? `<div class="tags">${e.tags.map((tag) => `#${escape(tag)}`).join(' ')}</div>` : ''}
    </section>`);
  }
  return `<!doctype html><html lang="${escape(t.locale)}" dir="${dir}"><head><meta charset="utf-8"/>
<title>${escape(t.book.coverTitle)}</title>
<style>
  @page { margin: 22mm 18mm; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #2E2A24; background: #FBF7EE; margin: 0; }
  .cover { height: 92vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; }
  .cover h1 { font-size: 44px; color: #8C5A3C; margin: 0 0 16px; font-weight: normal; }
  .cover p { font-size: 16px; color: #7A6E60; margin: 4px 0; }
  .entry { page-break-inside: avoid; padding: 18px 0; border-bottom: 1px solid #E3D9C6; }
  .date { font-family: Helvetica, Arial, sans-serif; font-size: 12px; letter-spacing: .05em; text-transform: uppercase; color: #8C5A3C; }
  .mood { font-size: 16px; }
  h2 { font-size: 24px; font-weight: normal; margin: 6px 0 10px; }
  .body { font-size: 14px; line-height: 1.65; }
  .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
  .photos img { width: 48%; max-height: 260px; object-fit: cover; border-radius: 6px; }
  .tags { margin-top: 10px; font-family: Helvetica, Arial, sans-serif; font-size: 11px; color: #7A6E60; }
</style></head><body>
<div class="cover"><h1>${escape(t.book.coverTitle)}</h1><p>${escape(range)}</p><p>${escape(t.book.coverCount(list.length))}</p></div>
${pages.join('\n')}
</body></html>`;
}
