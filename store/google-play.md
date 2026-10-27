# Google Play Console – Antworten zum Abtippen

Diese Formulare lassen sich nicht per API ausfüllen. Alles unter **App-Inhalte** (linkes Menü → *Richtlinien und Programme → App-Inhalte*).
Store-Eintrag (Texte, Grafiken, Screenshots) setzt `scripts/play.py` automatisch.

## App anlegen
- **App-Name:** Daily Journal – Private Diary (deutscher Eintrag „Tagebuch – Mein Journal“ legt `scripts/play.py eintrag` an)
- **Standardsprache:** Englisch (USA) – en-US
- **App oder Spiel:** App
- **Kostenlos oder kostenpflichtig:** Kostenlos
- Erklärungen (Richtlinien, US-Exportgesetze) bestätigen

## Datenschutzerklärung
`https://tagebuch-c5j.pages.dev/privacy` (englisch; deutsch: `/datenschutz`)

## App-Zugriff
Alle Funktionen sind ohne besondere Zugriffsrechte verfügbar (kein Login).

## Anzeigen
Nein, meine App enthält keine Anzeigen.

## Einstufung des Inhalts (IARC-Fragebogen)
- E-Mail: 63almaz80@gmail.com
- Kategorie: **Alle anderen App-Typen** (keine Spiele, keine Social-Media-App)
- Gewalt, Sexualität, Sprache, Drogen, Glücksspiel: überall **Nein**
- Interaktion zwischen Nutzern / Teilen von Inhalten mit anderen: **Nein** (alles bleibt lokal)
- Teilt Standort: **Nein**
- Digitale Käufe: **Nein**
Ergebnis: USK 0 / PEGI 3 / „Jedes Alter“.

## Zielgruppe und Inhalte
- Zielaltersgruppe: **13–15, 16–17, 18 und älter** (nicht unter 13, sonst greifen die Familienrichtlinien)
- App spricht Kinder nicht gezielt an: **Ja, bestätigen**

## Datensicherheit
- Erhebt oder teilt die App erforderliche Nutzerdaten? **Nein**
  - Begründung: Alle Daten (Einträge, Fotos, Einstellungen) werden ausschließlich lokal auf dem Gerät gespeichert und nie übertragen. Daten, die nur auf dem Gerät verarbeitet werden, gelten bei Google nicht als „erhoben“.
- Damit entfallen Verschlüsselung und Löschanfrage-Fragen.

## Gesundheits-Apps
Keine Gesundheitsfunktionen → **Nein**, bzw. „Meine App hat keine Gesundheitsfunktionen“.

## Finanzfunktionen / Behörden-App / Nachrichten-App
Jeweils **Nein**.

## Store-Einstellungen
- **App-Kategorie:** Lifestyle
- **Tags:** Tagebuch, Journal
- **Kontakt-E-Mail:** 63almaz80@gmail.com
- **Website:** https://tagebuch-c5j.pages.dev

## Dienstkonto freigeben
Unter *Nutzer und Berechtigungen* das Dienstkonto `…@wellapps-play-upload.iam.gserviceaccount.com`
für die neue App mit **Admin-Rechten** einladen – falls es nicht ohnehin kontoweite Rechte hat.
Ohne diese Freigabe antwortet die API mit 403 „PERMISSION_DENIED“.
