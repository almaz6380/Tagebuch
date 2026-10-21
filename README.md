# Tagebuch

Ein schönes, privates Tagebuch für **Web (PWA)**, **iOS** und **Android** aus einer Codebasis
(Expo + React Native + Expo Router).

## Funktionen

- ✍️ Einträge schreiben, bearbeiten und löschen, mit Titel, Datum und liniertem Notizbuch-Editor
- 😄 Stimmung pro Tag in 5 Stufen
- 📅 Kalenderansicht mit Stimmungsfarben und Monatsübersicht
- 🔎 Suche (Volltext ohne Unterscheidung von Groß-/Kleinschreibung) mit Filter nach Tags und Stimmung
- 🏷️ Tags mit Vorschlägen
- 🔒 PIN-Schutz: sperrt beim Öffnen und auf dem Handy auch beim Wechsel in den Hintergrund
- 🎨 Vier Stile: **Papier** (Standard), Minimal, Verspielt, Nacht
- 📦 Export aller Einträge als JSON
- 📴 Funktioniert offline, alle Daten bleiben **nur lokal** auf dem Gerät

## Loslegen

```bash
npm install
npm run web       # im Browser
npm start         # Expo Dev-Server (QR-Code mit Expo Go scannen)
```

Prüfen: `npm run typecheck` und `npm run lint`.

## Web / PWA veröffentlichen

```bash
npm run build:web   # erzeugt dist/ inkl. Service Worker (sw.js) für Offline-Betrieb
```

Den Ordner `dist/` kannst du auf jedem statischen Hoster veröffentlichen (Netlify, Vercel,
Cloudflare Pages, GitHub Pages …). HTTPS ist Pflicht, sonst funktionieren PIN und IDs nicht.
Danach lässt sich die Seite auf dem Handy über „Zum Home-Bildschirm“ als App installieren.

## In die App Stores

Die Store-Builds laufen in der Cloud über [EAS](https://docs.expo.dev/eas/). Du brauchst keinen Mac.
Dafür benötigst du:

- ein kostenloses [Expo-Konto](https://expo.dev/signup)
- **Apple Developer Program** (99 $/Jahr) für den App Store
- **Google Play Console** (einmalig 25 $) für den Play Store

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform all --profile production
npx eas-cli@latest submit --platform ios       # bzw. android
```

Vorher in `app.json` die Platzhalter `com.example.tagebuch` (`ios.bundleIdentifier`,
`android.package`) durch eine eigene, eindeutige Kennung ersetzen, z. B. `de.deinname.tagebuch`.

## Aufbau

```
src/app/          Bildschirme (Expo Router)
  (tabs)/         Einträge, Kalender, Suche, Stil & PIN
  entry.tsx       Editor (?id=… zum Bearbeiten, ?date=… für einen bestimmten Tag)
src/db/           Speicherung: SQLite (iOS/Android) bzw. IndexedDB (Web)
src/theme/        Stile und Stimmungen
src/components/   UI-Bausteine
scripts/gen-sw.mjs  erzeugt den Service Worker nach dem Web-Export
```

## Hinweise zu Datenschutz und Sicherheit

- Einträge verlassen das Gerät nie. Es gibt keinen Server und kein Tracking.
- Die PIN wird nur als gesalzener SHA-256-Hash gespeichert, nativ im Schlüsselbund bzw. Keystore.
  Sie schützt den Zugang zur App. Die Einträge selbst sind **nicht verschlüsselt**.
- Wer das Gerät oder den Browser wechselt bzw. Browserdaten löscht, verliert die Einträge.
  Exportiere sie deshalb regelmäßig unter „Stil & PIN → Daten“.
