# Tagebuch

Ein schönes, privates Tagebuch für **Web (PWA)**, **iOS** und **Android** aus einer Codebasis
(Expo + React Native + Expo Router).

## Funktionen

- ✍️ Einträge schreiben, bearbeiten und löschen, mit Titel, Datum und liniertem Notizbuch-Editor
- 📷 Fotos pro Eintrag (Galerie, auf dem Handy auch Kamera), automatisch verkleinert
- 💡 Schreibimpulse: Frage des Tages, ~40 weitere Fragen und die Vorlagen „Dankbarkeit“ und „Abendrückblick“
- 💾 Entwürfe werden beim Tippen automatisch gesichert und nach einem Absturz wiederhergestellt
- 🗑️ Papierkorb: Gelöschte Einträge bleiben 30 Tage wiederherstellbar
- 😄 Stimmung pro Tag in 5 Stufen
- 📅 Kalenderansicht mit Stimmungsfarben und Monatsübersicht
- 🔎 Suche (Volltext ohne Unterscheidung von Groß-/Kleinschreibung) mit Filter nach Tags und Stimmung
- 🏷️ Tags mit Vorschlägen
- 🔒 PIN-Schutz: sperrt beim Öffnen und auf dem Handy auch beim Wechsel in den Hintergrund
- 🎨 Vier Stile: **Papier** (Standard), Minimal, Verspielt, Nacht
- 📦 Sichern und Wiederherstellen als JSON-Datei (inklusive Fotos), mit Erinnerung, wenn das letzte Backup älter als 14 Tage ist
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

## App Stores

App-ID `io.github.almaz6380.tagebuch`, Store-Name „Tagebuch – Mein Journal“. Builds laufen über
[EAS](https://docs.expo.dev/eas/) mit lokalen Signierdaten (das Apple-Team hat bereits die maximale Zahl
an Distributionszertifikaten, deshalb wird das vorhandene als `.p12` verwendet).

```bash
bash scripts/store-credentials.sh            # .secrets/ + credentials.json aus der Umgebung
npx eas-cli@latest build -p all --profile production --non-interactive
npx eas-cli@latest submit -p ios --latest --non-interactive
python3 scripts/asc.py metadaten --ausfuehren   # Texte, Altersfreigabe, Screenshots
python3 scripts/asc.py einreichen --build <nr> --ausfuehren
python3 scripts/play.py eintrag --ausfuehren
python3 scripts/play.py release --aab <datei>.aab --ausfuehren
```

Umgebungsvariablen: `EXPO_TOKEN`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `PLAY_SERVICE_ACCOUNT_JSON`,
`IOS_CERT_P12_BASE64`, `IOS_CERT_PASSWORD`, optional `ANDROID_KEYSTORE_BASE64`/`ANDROID_KEYSTORE_PASSWORD`.
Alle Skripte sind ohne `--ausfuehren` reine Probeläufe.

Store-Texte stehen für beide Stores in `store/texte.json`, Screenshots erzeugt
`scripts/store-screenshots.mjs`, Play-Grafiken `scripts/play-graphics.py`. Was nur in der Play Console
geht (Datensicherheit, Einstufung), steht zum Abtippen in `store/google-play.md`.
Rechtstexte: `public/datenschutz.html`, `public/impressum.html`, `public/support.html`.

## Aufbau

```
src/app/          Bildschirme (Expo Router)
  (tabs)/         Einträge, Kalender, Rückblick, Suche, Einstellungen
  entry.tsx       Editor (?id=… zum Bearbeiten, ?date=… für einen bestimmten Tag)
  trash.tsx       Papierkorb
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
