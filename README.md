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
- 📦 Sichern und Wiederherstellen als JSON-Datei, mit Erinnerung, wenn das letzte Backup älter als 14 Tage ist
- 🔔 Tägliche Erinnerung zum Schreiben zur Wunschzeit (iOS/Android)
- 🕰️ Rückblick: „An diesem Tag“ (vor einem Monat / vor Jahren), Schreib-Serie, Stimmungsverlauf der letzten 30 Tage, häufigste Tags
- 👤 Entsperren mit Face ID / Fingerabdruck (iOS/Android, zusätzlich zur PIN)
- 📴 Funktioniert offline, alle Daten bleiben **nur lokal** auf dem Gerät

## Loslegen

```bash
npm install
npm run web       # im Browser
npm start         # Expo Dev-Server (QR-Code mit Expo Go scannen)
```

Prüfen: `npm run typecheck` und `npm run lint`.

## Web-App

Gehostet auf **Cloudflare Pages** (`https://tagebuch-c5j.pages.dev`).

**Automatisch:** Die GitHub Action `.github/workflows/ci.yml` prüft jeden Pull Request (Lint und
Typecheck). Nach jedem Merge auf `main` veröffentlicht sie die App bei Cloudflare. Dafür
müssen im Repo unter *Settings → Secrets and variables → Actions* zwei Secrets angelegt sein:
`CLOUDFLARE_API_TOKEN` (Berechtigung „Cloudflare Pages: Edit“) und `CLOUDFLARE_ACCOUNT_ID`.
Unter *Actions → CI → Run workflow* lässt sich ein Deploy auch von Hand starten.

**Von Hand:** Mit denselben zwei Werten als Umgebungsvariablen:

```bash
npm run deploy   # baut die App und lädt sie per Wrangler zu Cloudflare hoch
```

Auf dem Handy die Seite öffnen und „Zum Home-Bildschirm“ wählen, dann läuft sie wie eine App,
auch offline.

## App Stores (später)

Die Store-Builds laufen über [EAS](https://docs.expo.dev/eas/) und brauchen dafür ein Expo-Konto.
Siehe `eas.json`. Vorher in `app.json` die Platzhalter `com.example.tagebuch` ersetzen.

## Aufbau

```
src/app/          Bildschirme (Expo Router)
  (tabs)/         Einträge, Kalender, Rückblick, Suche, Einstellungen
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
  Sichere sie deshalb regelmäßig unter „Einstellungen → Daten“. Mit „Wiederherstellen“ lassen sie
  sich auf jedem Gerät wieder einspielen; vorhandene Einträge werden dabei nur durch neuere ersetzt.
