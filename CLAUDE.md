# Weltreise Planer – Projektkontext

Diese Datei dokumentiert den aktuellen Stand, die Entscheidungen und die nächsten Schritte,
damit jede Claude-Session (unabhängig vom Konto oder Tool – Claude Code, Cowork, etc.)
sofort weiss, was das Projekt ist und woran weitergearbeitet werden soll.

## Ziel des Projekts

Eine persönliche Reise-App für eine mehrmonatige Weltreise, die folgende Bereiche abdeckt:
Reiseroute, Budget, Länderinfos, Sehenswürdigkeiten, Essen, Übernachtung und
Vorbereitungs-Checkliste. Die App muss **offline funktionieren** (unterwegs oft kein Internet)
und **auf dem Handy wie eine normale App installierbar** sein.

Geplanter Nutzerkreis (siehe "Noch offen" unten für Details):
- Eigentümer:in (Tobias): volle Bearbeitungsrechte
- Eine Freundin, die mitreist: soll ebenfalls bearbeiten können
- Weitere Familie/Freunde: sollen die Reise nur mitlesen/mitverfolgen können (read-only)

## Architektur-Entscheidungen

- **Progressive Web App (PWA)**, kein natives App-Store-Projekt. Grund: schneller zu bauen,
  funktioniert auf iOS und Android gleichermassen, kein App-Store-Review nötig, trotzdem
  auf dem Homescreen installierbar und offline nutzbar.
- **Vanilla HTML/CSS/JavaScript**, kein Framework (kein React/Vue etc.). Grund: Für den Umfang
  dieser App reicht das, keine Build-Tools nötig, jede Datei ist direkt lesbar.
- **Datenspeicherung aktuell: `localStorage` im Browser** (siehe Datenmodell unten). Das
  bedeutet: Die App ist zu 100% offline-fähig, aber die Daten liegen **nur auf einem Gerät**.
  Für den Mehrbenutzer-Modus (Freundin bearbeitet mit, andere lesen mit) braucht es einen
  zusätzlichen Cloud-Sync-Layer – das ist bewusst noch nicht gebaut (siehe "Noch offen").

## Dateistruktur

```
worldtrip-app/
├── index.html          Grundgerüst der App (Header, Nav, Modal-Container)
├── style.css           Gesamtes Styling (mobile-first, Bottom-Nav, Cards)
├── app.js              Komplette App-Logik (Rendering, Datenmodell, Formulare)
├── manifest.json        PWA-Manifest (Name, Icons, Farben) – macht die App installierbar
├── service-worker.js    Cache-first Offline-Strategie
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── CLAUDE.md            Diese Datei
```

## Datenmodell (in `app.js`, gespeichert unter `localStorage['weltreiseData']`)

```js
{
  budgetTotal: number,
  currency: string,          // z.B. "CHF"
  stops: [                   // = Reiseroute + Länderinfos + Sehenswürdigkeiten/Essen/Unterkunft
    {
      id, country, city, arriveDate, leaveDate, notes,
      sights: [{ id, text, done }],
      food:   [{ id, text, done }],
      stays:  [{ id, text, done }],
    }
  ],
  expenses: [                // Budget-Tracker
    { id, amount, category, note, date, }
  ],
  prep: [                    // Vorbereitungs-Checkliste
    { id, text, category, done }
  ],
}
```

## Aktueller Stand (erledigt)

- [x] PWA-Grundgerüst mit Manifest + Service Worker (Offline-Caching, installierbar)
- [x] Dashboard/Übersicht mit Kennzahlen (nächste Station, Budget-Rest, Vorbereitungsfortschritt)
- [x] Reiseroute: Stationen anlegen/bearbeiten/löschen, chronologisch sortiert
- [x] Pro Station: Länderinfos/Notizen + Unterlisten für Sehenswürdigkeiten, Essen, Unterkunft
- [x] Budget-Tracker: Gesamtbudget, Ausgaben erfassen, Auswertung nach Kategorie
- [x] Vorbereitungs-Checkliste mit sinnvollen Standardeinträgen, erweiterbar
- [x] Funktional getestet (Headless-Browser: Anlegen/Bearbeiten/Persistenz nach Reload)

## Noch offen / nächste Schritte

1. **Mehrbenutzer-Funktion** (wichtigster nächster Schritt): Aktuell speichert die App nur
   lokal auf einem Gerät. Damit die mitreisende Freundin mitbearbeiten und andere Personen
   mitlesen können, braucht es:
   - Ein Backend/eine Cloud-Datenbank (z. B. Firebase, Supabase, oder ein einfacher eigener
     Server), das als "Wahrheitsquelle" dient.
   - Einen einfachen Login/Freigabe-Mechanismus (z. B. Einladungslink), OHNE dass es für die
     nur-lesenden Personen kompliziert wird (kein Zwangs-Account, wenn möglich).
   - Rollenmodell: Eigentümerin/Freundin = Schreibrechte, alle anderen = Leserechte.
   - Die App soll dabei weiterhin offline funktionieren und erst synchronisieren, wenn
     wieder Internet da ist (lokale Kopie + Sync, nicht "nur online").
2. **Hosting**: Für eine "echte" Installation auf dem Handy (Homescreen-Icon, Service Worker)
   muss die App über HTTPS gehostet werden (z. B. GitHub Pages, Netlify, Vercel – alle kostenlos
   für dieses Projekt geeignet). Lokal im Dateisystem geöffnet (`file://`) funktioniert die
   PWA-Installation nicht zuverlässig.
3. **Kartenansicht** für die Reiseroute (aktuell nur Liste) – wäre ein schönes Extra.
4. **Währungsumrechnung**: Aktuell wird nur eine einzige Währung angenommen. Bei Ausgaben in
   verschiedenen Ländern könnte eine automatische Umrechnung sinnvoll sein.
5. **Datenexport/Backup**: Da alles in `localStorage` liegt, sollte es eine Export-Funktion
   (z. B. als JSON-Datei) geben, damit Daten nicht verloren gehen, wenn das Gerät gewechselt
   oder der Browser-Cache geleert wird.

## Wie man die App lokal testet

Kein Build-Prozess nötig. Einfach im Projektordner einen simplen Webserver starten, z.B.:

```bash
python3 -m http.server 8000
```

Dann im Browser `http://localhost:8000/index.html` öffnen. Für die "Installieren"-Funktion
und den Service Worker testet man am besten über HTTPS-Hosting (siehe Punkt 2 oben) oder über
`localhost`, was von Browsern für Service-Worker-Tests als sicherer Kontext akzeptiert wird.

## Hinweis für eine neue Claude-Session

Wenn du (Claude) dieses Projekt zum ersten Mal siehst: Die App ist ein funktionierender
Single-User-Prototyp. Der Nutzer (Tobias) plant eine Weltreise und möchte als Nächstes primär
die Mehrbenutzer-Funktion (Punkt 1 oben) umsetzen. Frag ihn, ob er dafür ein bestimmtes Backend
bevorzugt (z. B. Firebase/Supabase) oder ob du einen Vorschlag machen sollst, bevor du grössere
Architekturänderungen vornimmst.
