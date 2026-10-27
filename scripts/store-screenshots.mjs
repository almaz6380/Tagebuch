// Store screenshots: fills the web build with sample entries, photographs six
// screens and puts each on a captioned store image.
//
// Needs the production web build served locally:
//   npm run build:web && npx -y serve@14 -s dist -l 4321
//   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/store-screenshots.mjs
// Writes store/screenshots/iphone-69/<locale>/*.png (1290×2796, App Store 6.9")
// and store/screenshots/play/<locale>/*.png (1080×2160, Play phones need ≤ 2:1),
// for every store language.
import { readFileSync } from 'node:fs';
import { mkdir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Playwright isn't a project dependency; point PLAYWRIGHT at an installed copy if needed.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = 'store/screenshots';
// Caveat and Inter have no CJK or Arabic letters; the browser picks the Noto
// variant that matches <html lang> (fonts-noto-cjk, fonts-noto-core).
const FALLBACK = "'Noto Sans Arabic','Noto Sans CJK JP',sans-serif";

const DEVICES = [
  {
    dir: 'iphone-69',
    width: 1290,
    height: 2796,
    view: { width: 430, height: 932 },
  },
  { dir: 'play', width: 1080, height: 2160, view: { width: 360, height: 720 } },
];

const SHOTS = [
  { file: '1-entries', path: '/' },
  { file: '2-photo', path: '/entry?id=s-today' },
  { file: '3-prompt', path: '/entry' },
  { file: '4-review', path: '/review' },
  { file: '5-calendar', path: '/calendar' },
  { file: '6-night', path: '/', theme: 'dark' },
];

// One file per language with captions and sample entries (store/locales/<lang>.json).
// ONLY=ja,ko renders just those languages.
const only = process.env.ONLY?.split(',');
const LOCALES = Object.fromEntries(
  (await readdir('store/locales'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join('store/locales', f), 'utf8')))
    .filter((l) => !only || only.includes(l.lang))
    .map((l) => [l.lang, { ...l, ...l.screenshots }]),
);

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function day(offset, { years = 0, months = 0 } = {}) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setFullYear(d.getFullYear() - years);
  d.setMonth(d.getMonth() - months);
  d.setDate(d.getDate() + offset);
  return iso(d);
}

function sampleEntries(L) {
  const [title, body, tags] = L.today;
  const entries = [
    {
      id: 's-today',
      date: day(0),
      title,
      body,
      mood: 5,
      tags,
      photos: ['p-sea'],
    },
  ];
  for (let i = 1; i <= 26; i++) {
    const [title, body, mood, tags] = L.texts[i % L.texts.length];
    if (i === 8 || i === 17) continue; // a few gaps make the calendar look real
    entries.push({
      id: `s-${i}`,
      date: day(-i),
      title,
      body,
      mood,
      tags,
      photos: [],
    });
  }
  entries.push({
    id: 's-year',
    date: day(0, { years: 1 }),
    title: L.year[0],
    body: L.year[1],
    mood: 4,
    tags: L.year[2],
    photos: [],
  });
  entries.push({
    id: 's-month',
    date: day(0, { months: 1 }),
    title: L.month[0],
    body: L.month[1],
    mood: 5,
    tags: L.month[2],
    photos: [],
  });
  const now = Date.now();
  return entries.map((e, i) => ({
    ...e,
    deletedAt: null,
    createdAt: now - i * 1000,
    updatedAt: now - i * 1000,
  }));
}

async function seed(page, entries, photoBase64, theme, lang) {
  await page.goto(`${BASE}/datenschutz`); // same origin, but without the app running
  await page.evaluate(
    async ({ entries, photoBase64, theme, lang }) => {
      localStorage.clear();
      localStorage.setItem('tagebuch.theme', theme);
      localStorage.setItem('tagebuch.lang', lang);
      // Backup reminder off: screenshots should show the content, not a nag.
      localStorage.setItem('tagebuch.lastBackup', String(Date.now()));
      await new Promise((resolve) => {
        const del = indexedDB.deleteDatabase('tagebuch');
        del.onsuccess = del.onerror = del.onblocked = resolve;
      });
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open('tagebuch', 2);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('entries', { keyPath: 'id' });
          req.result.createObjectStore('photos');
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const blob = await (await fetch(`data:image/jpeg;base64,${photoBase64}`)).blob();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(['entries', 'photos'], 'readwrite');
        for (const e of entries) tx.objectStore('entries').put(e);
        tx.objectStore('photos').put(blob, 'p-sea');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { entries, photoBase64, theme, lang },
  );
}

async function fontFace(name, file, weight) {
  const data = (await readFile(file)).toString('base64');
  return `@font-face{font-family:'${name}';font-weight:${weight};src:url(data:font/ttf;base64,${data}) format('truetype');}`;
}

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium',
});
const photoBase64 = (await readFile(join(OUT, 'beispielfoto.jpg'))).toString('base64');
const fonts =
  (await fontFace('Caveat', 'node_modules/@expo-google-fonts/caveat/700Bold/Caveat_700Bold.ttf', 700)) +
  (await fontFace('Inter', 'node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf', 400)) +
  (await fontFace('Inter', 'node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf', 600));

for (const L of process.env.ONLY_IAP || process.env.ONLY_FEATURE ? [] : Object.values(LOCALES)) {
  const entries = sampleEntries(L);
  for (const device of DEVICES) {
    // Each store has its own locale codes (Apple "ja", Play "ja-JP").
    const locale = device.dir === 'play' ? L.playLocale : L.appleLocale;
    const dir = join(OUT, device.dir, locale);
    await mkdir(dir, { recursive: true });
    const ctx = await browser.newContext({
      viewport: device.view,
      deviceScaleFactor: 3,
    });
    const page = await ctx.newPage();
    const composer = await (
      await browser.newContext({
        viewport: { width: device.width, height: device.height },
      })
    ).newPage();
    let seededTheme = null;

    for (const [i, shot] of SHOTS.entries()) {
      const [title, sub] = L.captions[i];
      const theme = shot.theme ?? 'paper';
      if (theme !== seededTheme) {
        await seed(page, entries, photoBase64, theme, L.lang);
        seededTheme = theme;
      }
      await page.goto(`${BASE}${shot.path}`);
      await page.waitForTimeout(2000); // fonts, data and entry animations
      const raw = (await page.screenshot()).toString('base64');

      const dark = theme === 'dark';
      const bg = dark ? '#14161B' : '#F5EFE3';
      const fg = dark ? '#ECE7DD' : '#2E2A24';
      const accent = dark ? '#D4B483' : '#8C5A3C';
      const s = device.width / 1290; // all sizes are designed for the iPhone canvas
      await composer.setContent(`<!doctype html><html lang="${L.lang}" dir="${L.lang === 'ar' ? 'rtl' : 'ltr'}"><head><style>${fonts}
      html,body{margin:0;width:${device.width}px;height:${device.height}px;overflow:hidden;background:${bg};}
      body{display:flex;flex-direction:column;align-items:center;box-sizing:border-box;padding:${130 * s}px ${80 * s}px ${110 * s}px;}
      .cap{text-align:center;flex:none;}
      h1{font-family:Caveat,${FALLBACK};font-weight:700;font-size:${140 * s}px;line-height:1.02;margin:0;color:${accent};}
      p{font-family:Inter,${FALLBACK};font-weight:400;font-size:${50 * s}px;line-height:1.3;margin:${24 * s}px 0 0;color:${fg};opacity:.8;}
      /* The phone takes whatever height the caption leaves, keeping its aspect ratio. */
      .phone{flex:1;min-height:0;width:100%;display:flex;justify-content:center;align-items:flex-start;margin-top:${80 * s}px;}
      .phone img{display:block;height:100%;max-width:${980 * s}px;object-fit:contain;box-sizing:border-box;
        border-radius:${70 * s}px;border:${14 * s}px solid ${dark ? '#2C303A' : '#FFFFFF'};
        box-shadow:0 ${30 * s}px ${90 * s}px rgba(0,0,0,${dark ? 0.6 : 0.22});}
    </style></head><body>
      <div class="cap"><h1>${title}</h1><p>${sub}</p></div>
      <div class="phone"><img src="data:image/png;base64,${raw}"></div>
    </body></html>`);
      await composer.waitForTimeout(300);
      await composer.screenshot({ path: join(dir, `${shot.file}.png`) });
      console.log(`${device.dir}/${locale}/${shot.file}.png`);
    }
    await ctx.close();
  }
}
// Play feature graphic (1024×500) per language: icon, app name and subtitle on notebook paper.
if (!process.env.ONLY_IAP) {
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 500 } })).newPage();
  const icon = (await readFile('assets/icon.png')).toString('base64');
  for (const L of Object.values(LOCALES)) {
    const [name, ...rest] = L.store.name.split(' – ');
    const rtl = L.lang === 'ar';
    await page.setContent(`<!doctype html><html lang="${L.lang}" dir="${rtl ? 'rtl' : 'ltr'}"><head><style>${fonts}
      html,body{margin:0;width:1024px;height:500px;overflow:hidden;}
      body{background:#F5EFE3 repeating-linear-gradient(transparent 0 42px,#E3E8EE 42px 44px);
        display:flex;align-items:center;gap:44px;padding:0 70px 0 110px;box-sizing:border-box;position:relative;}
      body::before{content:'';position:absolute;top:0;bottom:0;${rtl ? 'right' : 'left'}:70px;width:3px;background:#E8B4A8;}
      img{width:300px;height:300px;border-radius:66px;flex:none;box-shadow:0 12px 40px rgba(0,0,0,.18);}
      h1{font-family:Caveat,${FALLBACK};font-weight:700;font-size:${name.length > 14 ? 68 : 96}px;line-height:1.05;margin:0;color:#8C5A3C;}
      p{font-family:Inter,${FALLBACK};font-size:32px;line-height:1.3;margin:22px 0 0;color:#2E2A24;}
    </style></head><body><img src="data:image/png;base64,${icon}"><div><h1>${name}</h1>
      <p>${rest.length ? rest.join(' – ') + '<br>' : ''}${L.store.subtitle}</p></div></body></html>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `store/play/feature-1024x500-${L.playLocale}.png` });
    console.log(`play/feature-1024x500-${L.playLocale}.png`);
  }
}

// Review screenshot for Apple's in-app purchase: the plain settings screen with the purchase.
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await seed(page, sampleEntries({ ...JSON.parse(readFileSync('store/locales/en.json', 'utf8')).screenshots }), photoBase64, 'paper', 'en');
  await page.goto(`${BASE}/settings?storeshot`);
  await page.waitForTimeout(2000);
  await page
    .getByText('Remove ads', { exact: true })
    .first()
    .evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'store/iap-review.png' });
  console.log('store/iap-review.png');
  await ctx.close();
}
await browser.close();
