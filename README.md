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

## Web-App

**Live:** https://almaz6380.github.io/Tagebuch/

Jeder Push auf `main` oder `claude/tagebuch-app` baut die App über GitHub Actions
(`.github/workflows/deploy.yml`) und veröffentlicht sie auf GitHub Pages.
Einmalig nötig: **Settings → Pages → Source: „GitHub Actions“**.

Auf dem Handy die Seite öffnen und „Zum Home-Bildschirm“ wählen, dann läuft sie wie eine App,
auch offline.

Lokal bauen: `npm run build:web` erzeugt `dist/` inklusive Service Worker.

## App Stores (später)

Die Store-Builds laufen über [EAS](https://docs.expo.dev/eas/) und brauchen dafür ein Expo-Konto.
Siehe `eas.json`. Vorher in `app.json` die Platzhalter `com.example.tagebuch` ersetzen.

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
