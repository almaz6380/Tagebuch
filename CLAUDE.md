# Tagebuch („Daily Journal – Private Diary“)

Privates Tagebuch für iOS, Android und Web aus einer Codebasis. Store-Name „Daily Journal – Private
Diary“, Anzeigename „My Journal“ (je Sprache übersetzt, `locales/<lang>.json`), Bundle/Paket
`io.github.almaz6380.tagebuch`, 14 Sprachen. Betreiber Josef Gallab. **Mit Josef auf Deutsch arbeiten.**
Allgemeine Expo-Regeln stehen in `AGENTS.md`.

## Befehle
```bash
npx tsc --noEmit && npx expo lint     # vor jedem Commit
npm run build:web                     # Web-Bundle nach dist/
npx expo install <paket>              # nie npm install für Expo-Pakete
```
Web: Cloudflare Pages `https://tagebuch-c5j.pages.dev`, jeder Merge auf `main` deployt automatisch
(`.github/workflows/ci.yml`). Rechtstexte und Hilfe liegen in `public/` (DE + EN).

## Architektur
- Expo SDK 58, React Native 0.88, expo-router (`src/app`). Daten nativ in SQLite (`src/db/storage.ts`,
  Spalten per `ALTER TABLE` nachgezogen), im Web IndexedDB (`src/db/idb.ts`, **Version 3**: `entries`,
  `photos`, `audio`). Fotos/Audio als Dateien in `documents/` (`src/db/photos.ts`, `audio.ts`, je mit `.web.ts`).
- `src/db/EntriesProvider.tsx` liefert `entries` (alle), **`open`** (ohne geschlossene Zeitkapseln) und
  `sealed`. ⚠ Anzeige, Suche, Kalender, Rückblick, Tags, Statistik und Export nehmen **`open`** — wer
  dort `entries` nimmt, verrät den Inhalt versiegelter Einträge.
- i18n: `src/i18n/<lang>.ts`, `de.ts` legt die Form von `Messages` fest (fehlender Schlüssel =
  Compile-Fehler), Plurale über `pick()` (`plural.ts`). Neue Texte in allen 14 Dateien.
- Backup (`src/lib/backup.ts`): JSON **Version 3** mit Fotos und Audio als base64; ältere Versionen
  werden weiter gelesen.
- Werbung: AdMob Banner + Interstitial (UMP + ATT), Kauf „Werbung entfernen“
  `io.github.almaz6380.tagebuch.noads` (2,99 €; bei Play **netto 2,49 €** eintragen) via expo-iap.

## Die vier eigenen Funktionen (Antwort auf Apples 4.3(a), Oktober 2026)
Sie sind der Grund, warum die App im Store besteht — nicht zurückbauen, in Store-Texten vorn halten.
- **Zeitkapsel** — `Entry.sealedUntil`, `isSealed()` in `src/db/types.ts`, Auswahl im Editor
  (`src/app/entry.tsx`), gesperrter Bildschirm `SealedNotice`. Mitteilung am Öffnungstag 9:00
  (`scheduleCapsule` in `src/lib/reminder.ts`, Kennung `capsule-<id>`, Kanal `time-capsule`); die
  Tageserinnerung hat die Kennung `daily-reminder`. ⚠ **Nie `cancelAllScheduledNotificationsAsync`** —
  das löscht alle Kapsel-Mitteilungen. Nach einem Import plant `syncCapsules` neu.
- **Sprachnotizen** — `src/components/VoiceNotes.tsx` (expo-audio, max. 5 min), `Entry.audio`.
  Im Web nur Wiedergabe. ⚠ Das Mikrofon hängt in `app.json` an **drei** Stellen: `ios.infoPlist`,
  Plugin `expo-audio` UND Plugin `expo-image-picker` — dessen `microphonePermission: false` hatte
  Mikrofon-Text und `RECORD_AUDIO` komplett entfernt. `expo-audio` braucht
  `enableBackgroundPlayback: false`, sonst kommen `UIBackgroundModes: audio` und
  Foreground-Service-Rechte dazu (Ablehnungsgrund / Play-Erklärung). Prüfen mit `expo prebuild` in
  einer Kopie: Info.plist und AndroidManifest ansehen.
- **Stimmungs-Jahr** — `src/components/MoodYear.tsx`, `moodByDay`/`moodPatterns` in `src/lib/stats.ts`,
  eingebunden im Rückblick-Tab.
- **Tagebuch als Buch (PDF)** — `src/lib/bookHtml.ts` (HTML, schließt Kapseln aus) + `book.ts`
  (expo-print + Teilen) / `book.web.ts` (neuer Tab + Drucken). Einstellungen → Daten.

## Release (kein EAS)
Gebaut wird im Repo **almaz6380/mahjong-app**, Workflow **„Tagebuch Release“** (`tagebuch-release.yml`,
nutzt dessen Secrets). Inputs: `plattform` (beide/ios/android), `upload`, `einreichen`.
Build-Nummer = `run_number + 100`. Immer erst `upload=false` (Probebuild), dann der echte Lauf.
Version bleibt 1.0.0, bis die erste Fassung veröffentlicht ist.
- `scripts/asc.py` (App Store Connect), `scripts/play.py` (Play, neue Monetarisierungs-API
  `onetimeproducts`). Texte je Sprache in `store/locales/<lang>.json` (`store_locales.py`),
  Kategorie/Altersfreigabe/Prüfkontakt/Prüfnotizen in `store/texte.json`.
- Screenshots + Play-Grafiken: `scripts/store-screenshots.mjs` gegen `npm run build:web` +
  `npx -y serve@14 -s dist -l 4321`, `PLAYWRIGHT=/opt/node-tools/node_modules/playwright/index.mjs`.
  Die Texte, die das Skript auf dem Bildschirm sucht, liest es aus den App-Wörterbüchern — Umbenennen
  in `src/i18n` zieht also mit. Neue Bildnamen ersetzen alte in ASC, alte Dateien vorher löschen.

## Store-Historie und Fallen
- Name „Journal“ von Apple abgelehnt (ITMS-90129) → „My Journal“ (FR „Mon Journal“, andere mit
  Possessiv). Ist ein Store-Name vergeben, probiert `asc.py` die `nameAlternatives` aus `store/locales/<lang>.json` (`name_candidates`).
- **30.10.2026: Ablehnung nach 4.3(a) „Spam“** (Build 117) mit Warnung „Extended Review“. Antwort:
  die vier Funktionen oben, alle Store-Texte/Screenshots neu, Build **120** am selben Abend neu
  eingereicht (reviewSubmission `d5881134-…`), Text fürs Resolution Center in
  `store/resolution-center-4.3a.md` (Josef hat ihn eingefügt). Nie ohne echte Änderung neu einreichen.
- Nach einer Ablehnung bleibt die Einreichung als `UNRESOLVED_ISSUES` offen. `asc.py einreichen`
  setzt ihre Einträge auf `resolved: true` und verwendet sie weiter (eine zweite geht nicht).
- Der **erste** In-App-Kauf geht nur zusammen mit einer App-Version in die Prüfung (`attach_iap`).
  Nach einer Prüfung sind Name/Beschreibung des Kaufs gesperrt (409 `UNMODIFIABLE`) — das Skript
  lässt sie dann in Ruhe.
- Android: Das erste Release musste Josef in der Play Console selbst zur Prüfung senden; solange es
  geprüft wird, ersetzt ein neuer Upload nur den Entwurf.

## Stand 30.10.2026
iOS 1.0.0 / Build 120 in Apples Prüfung, Android-Build mit den vier Funktionen bei Google (erstes
Release in Prüfung). Web live. Als Nächstes: Antworten von Apple/Google abwarten; bei Mails
Screenshot von Josef auswerten.
