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
**Ja, meine App enthält Anzeigen** (Google AdMob: Banner und Interstitial).

## Werbe-ID
- Verwendet die App eine Werbe-ID? **Ja**
- Zweck: **Werbung oder Marketing**

## Einstufung des Inhalts (IARC-Fragebogen)
- E-Mail: 63almaz80@gmail.com
- Kategorie: **Alle anderen App-Typen** (keine Spiele, keine Social-Media-App)
- Gewalt, Sexualität, Sprache, Drogen, Glücksspiel: überall **Nein**
- Interaktion zwischen Nutzern / Teilen von Inhalten mit anderen: **Nein** (alles bleibt lokal)
- Teilt Standort: **Nein**
- Digitale Käufe: **Ja** (einmaliger Kauf „Werbung entfernen“)
Ergebnis: USK 0 / PEGI 3 / „Jedes Alter“.

## Zielgruppe und Inhalte
- Zielaltersgruppe: **13–15, 16–17, 18 und älter** (nicht unter 13, sonst greifen die Familienrichtlinien)
- App spricht Kinder nicht gezielt an: **Ja, bestätigen**

## Datensicherheit
Einträge, Fotos und Einstellungen bleiben nur auf dem Gerät und zählen nicht als „erhoben“.
Was durch die Werbung (AdMob-SDK) und den Kauf (Play Billing) entsteht, muss angegeben werden:

- Erhebt oder teilt die App erforderliche Nutzerdaten? **Ja**
- Werden alle Daten bei der Übertragung verschlüsselt? **Ja**
- Können Nutzer das Löschen ihrer Daten beantragen? **Nein** (wir speichern selbst nichts; Werbe-ID zurücksetzen geht in den Geräteeinstellungen)
- Datentypen:
  | Typ | Erhoben | Geteilt | Verarbeitung | Erforderlich? | Zwecke |
  |---|---|---|---|---|---|
  | **Geräte- oder andere IDs** | Ja | Ja | nicht flüchtig | erforderlich | Werbung oder Marketing, Analysen, Betrugsprävention/Sicherheit |
  | **App-Aktivität → App-Interaktionen** | Ja | Ja | nicht flüchtig | erforderlich | Werbung oder Marketing, Analysen |
  | **App-Informationen und -Leistung → Absturzprotokolle, Diagnose** | Ja | Ja | nicht flüchtig | erforderlich | Analysen, Betrugsprävention/Sicherheit |
  | **Ungefährer Standort** | Ja | Ja | nicht flüchtig | erforderlich | Werbung oder Marketing (aus der IP-Adresse) |
  | **Finanzdaten → Kaufverlauf** | Ja | Nein | nicht flüchtig | erforderlich | App-Funktionen |
  (Das sind die Angaben, die Google für das AdMob-SDK selbst empfiehlt.)

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
