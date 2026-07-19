# Ziel-URL Generator

Interner **Campaign Target-URL Generator**: erzeugt Kampagnen-Tracking-URLs mit
automatisch vergebener, fortlaufender Tracking-ID (`tid`) und verwaltet die
zugehörigen Stammdaten (Kampagnen, Sites, Medien). Kein Login — reines
internes Tool.

Eine generierte URL sieht z. B. so aus:

```
https://www.example.de/lp/hochwasser.html?tid=12949&campid=1203&siteid=104&meid=29
```

## Setup

Voraussetzung: Node.js 20+ (getestet mit Node 24) unter Windows.

```bash
npm install
npm run dev
```

Die App läuft danach unter [http://localhost:3000](http://localhost:3000).

Die SQLite-Datenbank und alle Tabellen werden **automatisch beim ersten
Start** angelegt und mit Basisdaten befüllt (siehe unten) — es sind keine
weiteren manuellen Schritte nötig.

Falls die Datenbank stattdessen explizit (neu) initialisiert werden soll,
z. B. für CI oder nach dem Löschen von `data/app.db`:

```bash
npm run db:setup
```

Dieser Befehl ist idempotent: er legt fehlende Tabellen an und befüllt nur
leere Tabellen mit Seed-Daten, überschreibt also keine vorhandenen Daten.

## Wo liegt die Datenbank?

`./data/app.db` (SQLite-Datei, wird beim ersten Start automatisch erzeugt).
Der Ordner `data/` ist in `.gitignore` von der Versionskontrolle
ausgeschlossen (die `.db`-Datei selbst, nicht der Ordner).

## Seed-Daten

Beim ersten Start werden folgende Stammdaten angelegt, sofern die jeweilige
Tabelle noch leer ist:

| Tabelle     | Einträge                                                        |
| ----------- | ---------------------------------------------------------------- |
| `sites`     | 103 = "Google Display", 104 = "Google Search"                    |
| `mediums`   | 11 = "QR-Code", 29 = "Text Ad"                                   |
| `campaigns` | 1203 = "PHV Sommer", Datum 08.2026                                |
| `settings`  | `tid_start` = 12948 (siehe nächster Abschnitt)                   |

Die erste über den Generator vergebene Tracking-ID ist damit **12949**.

## Start-Wert der Tracking-ID ändern

Der nächste `tid` wird immer als `max(höchste vorhandene tid, tid_start) + 1`
berechnet. Solange noch keine Tracking-URL generiert wurde, kann der
Start-Wert angepasst werden, indem der `value`-Eintrag der Zeile mit
`key = 'tid_start'` in der Tabelle `settings` geändert wird (z. B. mit einem
SQLite-Client wie [DB Browser for SQLite](https://sqlitebrowser.org/) auf
`data/app.db`). Sobald bereits Tracking-IDs existieren, hat der Start-Wert
keinen Effekt mehr — die höchste vergebene `tid` gewinnt.

## Tech-Stack

- Next.js (App Router) + TypeScript
- SQLite (`better-sqlite3`) über Drizzle ORM
- Tailwind CSS
- `papaparse` für den CSV-Import/-Export (Semikolon-Trennzeichen,
  UTF-8-BOM für Excel-Kompatibilität; Import erkennt `;` und `,` automatisch)

## Befehle

```bash
npm run dev        # Entwicklungsserver (http://localhost:3000)
npm run build      # Produktions-Build
npm run start      # Produktions-Server (nach build)
npm run db:setup   # DB-Schema/Seed-Daten (idempotent) manuell anstoßen
npm run lint       # ESLint
```

## Seiten

- `/` — Generator: einzelne URL erzeugen oder CSV-Bulk-Upload
- `/verlauf` — Verlauf aller generierten URLs, mit Suche und CSV-Export
- `/admin` — Verwaltung von Kampagnen, Sites und Medien (CRUD, CSV-Export,
  Warnhinweis bei nahender ID-Erschöpfung)

## Wichtige Invarianten

- Jede ID (`tid`, `campid`, `siteid`, `meid`) wird als `max(vorhanden) + 1`
  **innerhalb einer einzigen DB-Transaktion** vergeben — auch bei
  Bulk-Uploads (alle Zeilen in einer Transaktion). Zwei parallele Anfragen
  können dadurch nie dieselbe ID erhalten.
  IDs sind nach Vergabe unveränderlich; Admin-Bearbeitung ändert nur Name/Datum.
- Die Reihenfolge der Query-Parameter ist fest: `tid`, `campid`, `siteid`,
  `meid`. Der Aufbau erfolgt über die `URL`-API (nie String-Konkatenation),
  damit bestehende Query-Strings und Fragmente (`#...`) korrekt behandelt
  werden.
- Kampagnen/Sites/Medien mit bestehenden Tracking-ID-Referenzen können nicht
  gelöscht werden.
- Bulk-Uploads sind alles-oder-nichts: Erst Validierungsvorschau, bei
  Fehlern wird nichts importiert.
