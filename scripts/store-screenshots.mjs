// Store screenshots: fills the web build with sample entries, photographs six
// screens and puts each on a captioned store image.
//
// Needs the production web build served locally:
//   npm run build:web && npx -y serve@14 -s dist -l 4321
//   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/store-screenshots.mjs
// Writes store/screenshots/iphone-69/<locale>/*.png (1290×2796, App Store 6.9")
// and store/screenshots/play/<locale>/*.png (1080×2160, Play phones need ≤ 2:1),
// for every store language.
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Playwright isn't a project dependency; point PLAYWRIGHT at an installed copy if needed.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');

const BASE = process.env.BASE ?? 'http://localhost:4321';
const OUT = 'store/screenshots';

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

const LOCALES = {
  'en-US': {
    lang: 'en',
    captions: [
      ['Your private journal', 'As lovely as paper – safe on your phone'],
      ['Photos for every day', 'With mood, tags and notebook lines'],
      ['A prompt every day', 'Never stare at a blank page again'],
      ['Look back', '“On this day”, writing streak and mood history'],
      ['Moods at a glance', 'Calendar with mood colors'],
      ['Styles, PIN & Face ID', 'Everything stays on your device'],
    ],
    today: [
      'Sunset by the sea',
      'Today was one of those days you want to hold on to. We drove to the coast on a whim and watched the sun sink into the water.\n\nWhat I’m grateful for: this moment, and that I didn’t miss it.',
      ['vacation', 'grateful'],
    ],
    year: ['First day in the new flat', 'Boxes everywhere, but it already feels like home.', ['home']],
    month: ['Concert in the park', 'Live music under the open sky – goosebumps.', ['music']],
    texts: [
      [
        'Long walk by the lake',
        'An hour by the water after work. The air smelled of autumn and for a moment everything was completely still.',
        4,
        ['nature', 'exercise'],
      ],
      [
        'Coffee with Lena',
        'We talked about everything that’s on our minds. I’m so glad she’s in my life.',
        5,
        ['friends'],
      ],
      ['Tough week', 'Far too many meetings. Tonight it’s just tea, a blanket and a good book.', 2, ['work']],
      ['New recipe', 'Tried pumpkin soup with ginger – making that more often from now on.', 4, ['cooking']],
      ['Small win', 'The presentation went better than expected. Proud of myself!', 5, ['work']],
      ['Rainy day', 'Spent the whole afternoon reading and listening to music.', 3, ['calm']],
      ['Family dinner', 'Grandma told stories from the old days again.', 4, ['family']],
    ],
  },
  'de-DE': {
    lang: 'de',
    captions: [
      ['Dein privates Tagebuch', 'Schön wie Papier – sicher auf deinem Handy'],
      ['Fotos zu jedem Tag', 'Mit Stimmung, Tags und Notizbuch-Linien'],
      ['Jeden Tag ein Impuls', 'Nie mehr vor einem leeren Blatt sitzen'],
      ['Zurückblicken', '„An diesem Tag“, Schreib-Serie und Stimmungsverlauf'],
      ['Stimmung im Blick', 'Kalender mit Stimmungsfarben'],
      ['Stile, PIN & Face ID', 'Alles bleibt nur auf deinem Gerät'],
    ],
    today: [
      'Sonnenuntergang am Meer',
      'Heute war einer dieser Tage, die man festhalten möchte. Wir sind spontan an die Küste gefahren und haben zugesehen, wie die Sonne ins Wasser sinkt.\n\nWofür ich dankbar bin: für diesen Moment und dafür, dass ich ihn nicht verpasst habe.',
      ['urlaub', 'dankbar'],
    ],
    year: [
      'Erster Tag in der neuen Wohnung',
      'Überall Kartons, aber es fühlt sich schon nach Zuhause an.',
      ['zuhause'],
    ],
    month: ['Konzert im Park', 'Live-Musik unter freiem Himmel – Gänsehaut.', ['musik']],
    texts: [
      [
        'Lange Runde am See',
        'Nach der Arbeit noch eine Stunde am Wasser. Die Luft roch nach Herbst und für einen Moment war alles ganz still.',
        4,
        ['natur', 'bewegung'],
      ],
      [
        'Kaffee mit Lena',
        'Wir haben über alles geredet, was uns gerade beschäftigt. Ich bin so froh, dass es sie gibt.',
        5,
        ['freunde'],
      ],
      ['Zähe Woche', 'Viel zu viele Termine. Heute Abend einfach Tee, Decke und ein gutes Buch.', 2, ['arbeit']],
      ['Neues Rezept', 'Kürbissuppe mit Ingwer ausprobiert – wird ab jetzt öfter gekocht.', 4, ['kochen']],
      ['Kleiner Erfolg', 'Die Präsentation lief besser als gedacht. Stolz auf mich!', 5, ['arbeit']],
      ['Regentag', 'Den ganzen Nachmittag gelesen und Musik gehört.', 3, ['ruhe']],
      ['Familienessen', 'Oma hat wieder Geschichten von früher erzählt.', 4, ['familie']],
    ],
  },
};

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

for (const [locale, L] of process.env.ONLY_IAP ? [] : Object.entries(LOCALES)) {
  const entries = sampleEntries(L);
  for (const device of DEVICES) {
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
      await composer.setContent(`<!doctype html><html><head><style>${fonts}
      html,body{margin:0;width:${device.width}px;height:${device.height}px;overflow:hidden;background:${bg};}
      body{display:flex;flex-direction:column;align-items:center;box-sizing:border-box;padding:${130 * s}px ${80 * s}px ${110 * s}px;}
      .cap{text-align:center;flex:none;}
      h1{font-family:Caveat;font-weight:700;font-size:${140 * s}px;line-height:1.02;margin:0;color:${accent};}
      p{font-family:Inter;font-weight:400;font-size:${50 * s}px;line-height:1.3;margin:${24 * s}px 0 0;color:${fg};opacity:.8;}
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
// Review screenshot for Apple's in-app purchase: the plain settings screen with the purchase.
{
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  const page = await ctx.newPage();
  await seed(page, sampleEntries(LOCALES['en-US']), photoBase64, 'paper', 'en');
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
