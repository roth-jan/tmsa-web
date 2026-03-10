# TMSA-Web — Transport-Management-System Automotive (Web-App Rewrite)

## Was ist das?

Neuaufbau von TMSA-II als moderne Web-App. Das Original ist ein Windows-Programm (VB.NET, 2,7 Mio Zeilen, zuletzt 2017 aktiv). Wir bauen die gleiche Funktionalität als Web-Anwendung.

**Analyse-Repo:** https://github.com/roth-jan/tmsa-ii-analyse
**Alter Quellcode:** /tmp/tmsa-analyse/ (41 Repos von git.asp-central.de)

---

## Tech-Stack

| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18 + Vite + TypeScript |
| Data Grids | AG Grid Community (kostenlos) |
| UI Components | Mantine UI |
| Backend | Node.js + Express + TypeScript |
| Datenbank | PostgreSQL |
| ORM | Prisma |
| Auth | Session-basiert (express-session) |
| Hosting | Docker |

---

## Projektstruktur

```
tmsa-web/
├── CLAUDE.md              ← Diese Datei
├── frontend/              ← React App (Vite)
│   ├── src/
│   │   ├── components/    ← Wiederverwendbare UI-Teile
│   │   ├── pages/         ← Seiten (je eine pro Modul)
│   │   ├── hooks/         ← React Hooks
│   │   ├── api/           ← API-Aufrufe ans Backend
│   │   ├── types/         ← TypeScript Typen
│   │   └── utils/         ← Hilfsfunktionen
│   └── package.json
├── backend/               ← Express API Server
│   ├── src/
│   │   ├── routes/        ← API Endpunkte (je einer pro Modul)
│   │   ├── services/      ← Business-Logik
│   │   ├── middleware/    ← Auth, Validation, Error Handling
│   │   └── utils/         ← Hilfsfunktionen
│   └── package.json
├── prisma/                ← Datenbank-Schema
│   └── schema.prisma      ← Tabellen-Definition
├── docs/                  ← Modul-Specs (eine pro Modul)
│   ├── Phase-1-Stammdaten.md
│   └── ...
└── docker-compose.yml     ← PostgreSQL + App starten
```

---

## Befehle

### Erstmaliges Setup
```bash
# PostgreSQL starten
cd ~/aws-projekte/tmsa-web
docker-compose up -d

# Backend installieren + starten
cd backend
npm install
npm run dev          # Startet auf Port 3001

# Frontend installieren + starten
cd ../frontend
npm install
npm run dev          # Startet auf Port 5173
```

### Tägliche Arbeit
```bash
# Alles starten
cd ~/aws-projekte/tmsa-web
docker-compose up -d          # Datenbank
cd backend && npm run dev &    # Backend
cd ../frontend && npm run dev  # Frontend

# Datenbank-Schema ändern
cd ~/aws-projekte/tmsa-web
npx prisma migrate dev --name beschreibung
npx prisma generate
```

### Tests
```bash
cd ~/aws-projekte/tmsa-web/backend
npm test

cd ~/aws-projekte/tmsa-web/frontend
npx playwright test
```

---

## Module & Phasen

### Phase 1: Fundament + Stammdaten ✅
- [x] Projekt-Setup
- [x] Auth (Login, Benutzer, Rechte)
- [x] Niederlassung (Geschäftsstellen)
- [x] OEM (BMW, Daimler, VW, Porsche, MAN)
- [x] Werk (Produktionsstandorte)
- [x] Lieferant (Zulieferer)
- [x] Abladestelle (Entladeorte an Werken)
- [x] TU (Transport-Unternehmer / Carrier)
- [x] KFZ (Fahrzeuge)
- [x] Route (Transportwege)
- [x] Kondition (Preisberechnung)

### Phase 2: Kern-Business (Disposition) ✅
- [x] DispoOrt, DispoRegel (Factory-Pattern CRUD)
- [x] Avis + Artikelzeilen (Master-Detail, Custom Router)
- [x] Tour (Custom Router, Artikelzeile zuweisen/entfernen)
- [x] Mengenplan/Disposition (Two-Panel UI, Button-Zuweisung)
- [x] Gebrochene Verkehre (→ Phase 6)

### Phase 3: Operativ ✅
- [x] Abfahrt (Borderos, Sendungen)
- [x] Nacharbeit (Korrekturen, Quittungen)
- [x] Sendungsbildung

### Phase 4: Billing ✅
- [x] Konditionsberechnung (Service mit Tour/Stopp/Km-Faktoren)
- [x] TU-Abrechnung (Bewerten → Freigeben → Erzeugen)
- [x] Storno (setzt Tour-Status zurück)

### Phase 5: Berichte MVP ✅
- [x] CSV-Export Helper (UTF-8 BOM, Semikolon, Dezimalkomma)
- [x] 6 Kernberichte (Touren, Avise, TU-Kosten, Abfahrten, Sendungen, Abrechnungen)
- [x] AG Grid Vorschau + CSV-Download je Bericht
- [x] Berichte-Modul mit Rechteverwaltung (Admin + Disponent)

### Phase 6: Gebrochene Verkehre ✅
- [x] UmschlagPunkt + Streckenabschnitt (Prisma Models)
- [x] USP Stammdaten CRUD (generische Factory)
- [x] Gebrochene-Verkehre Service (tourBrechen, zusammenführen)
- [x] Mengenplan: GV-Badge, Tour-brechen-Modal, Streckenabschnitte-Grid
- [x] 11 Playwright-Tests, 68/68 gesamt grün

### Dashboard: KPIs & Übersichten ✅
- [x] Backend: GET /api/dashboard/kennzahlen (13 KPIs in einem Request)
- [x] 4 KPI-Cards (Offene Zeilen, Touren heute, Avise offen, Abrechnungen offen)
- [x] Touren-Status RingProgress (offen/disponiert/abgefahren/abgeschlossen)
- [x] Tagesübersicht (Abfahrten, Sendungen, Gebrochene, Monatskosten)
- [x] Letzte-Touren AG Grid (5 neueste Touren)
- [x] 6 Playwright-Tests, **74/74 → 79/79 gesamt grün** (inkl. EDI Simulator)
- [x] Test-Isolation: globalSetup mit DB-Reset (TRUNCATE + Re-Seed)

### Docker Production Deployment ✅
- [x] Backend Dockerfile (Node 22 Alpine + tsx)
- [x] Frontend Dockerfile (multi-stage: Vite build → nginx)
- [x] nginx.conf (API reverse proxy + SPA routing + asset caching)
- [x] docker-compose.yml (db + backend + frontend, healthchecks)
- [x] Production-Konfiguration (CORS_ORIGIN, SESSION_SECRET, VITE_API_URL)
- [x] GitHub Actions CI/CD Pipeline (PostgreSQL + Playwright + Docker build)

### Phase 7: EDI Simulator ✅
- [x] VDA 4913 Simulator (EDI Eingang nachstellen)
- [x] 4 OEM-Templates (BMW München, BMW Dingolfing, Daimler Sindelfingen, VW Wolfsburg)
- [x] VDA 4913 Nachrichtenformat (511/512/513/514/519 Satzarten)
- [x] Import → bestehender POST /api/avise (kein neuer Backend-Endpoint)
- [x] 4 Playwright-Tests, **79/79 gesamt grün**

### PDF-Druck ✅
- [x] pdfkit-basierte PDF-Generierung (lightweight, kein Headless-Browser)
- [x] Bordero/Lademanifest PDF (Sendungen-Tabelle, Gewicht/LDM-Summen, Unterschriftsfelder)
- [x] TU-Abrechnung PDF (Positionen-Breakdown, Gesamtbetrag, Zahlungsbedingungen)
- [x] GET /api/pdf/bordero/:id + GET /api/pdf/tu-abrechnung/:id
- [x] PDF-Buttons in AbfahrtPage + TuAbrechnungPage (window.open → neuer Tab)
- [x] 4 Playwright-Tests, **81/81 grün + 2 skipped** (gesamt 83)

### Benutzerverwaltung: Passwort + Rollenverwaltung ✅
- [x] POST /api/auth/passwort-aendern (eigenes Passwort ändern, bcrypt verify+hash)
- [x] Rollen-CRUD: POST/PUT/DELETE /api/benutzer/rollen + GET /api/benutzer/rechte
- [x] BenutzerPage: Tabs (Benutzer + Rollen) statt Single-View
- [x] Passwort-ändern-Modal (alle User, altes PW + neues PW + Bestätigung)
- [x] Rollen-Tab: AG Grid + Rechte-Matrix-Modal (Modul × Aktion Checkboxen)
- [x] 8 Playwright-Tests, **89/92 grün + 2 skipped** (gesamt 92, inkl. Test-Stabilisierung)

### Test-Stabilisierung ✅
- [x] Workers auf 3 reduziert, Retries auf 1 (parallel-bedingte Session-Flakiness)
- [x] PDF/CSV Endpoint-Tests auf Playwright request API umgestellt
- [x] Timeouts in beforeEach für Phase 3/4/EDI ergänzt
- [x] PDF Bordero Test: Abfahrt mit Borderos suchen statt erste nehmen
- [x] **92 Tests gesamt: 89 passed, 2 skipped, 0 hard failures**

### Audit-Log ✅
- [x] AuditLog Model + Prisma $extends auto-logging via AsyncLocalStorage
- [x] 22 Business-Entities werden automatisch geloggt (create/update/delete)
- [x] GET /api/audit-log mit Filter (Modell, Benutzer, Datum von/bis)
- [x] AuditLogPage: AG Grid + JSON-Diff-Modal (alterWert vs neuerWert)
- [x] Recht: auditlog.lesen (nur Admin)
- [x] 4 Playwright-Tests

### NL-Filter Completion ✅
- [x] POST /api/auth/nl-wechseln (Admin kann NL temporär wechseln)
- [x] NL-Selektor im Header (Select für Admins, Badge für Nicht-Admins)
- [x] niederlassungId in Login/Me Response
- [x] 2 Playwright-Tests

### Erweiterte Berichte ✅
- [x] 4 neue Berichte: Ausfallfrachten, DFUE-Übersicht, Fahrzeugliste, Konditionsübersicht
- [x] BerichtePage: 10 Tabs (vorher 6), CSV-Export je Bericht
- [x] datumFeld="none" Option für Konditionsübersicht (kein Datumsfilter)
- [x] 4 Playwright-Tests

### Erweiterte EDI-Formate ✅
- [x] EDI-Parser: VDA 4913/4927, DESADV, IFCSUM (Format-Erkennung + Parsing)
- [x] EdiImport Model + POST /api/edi/parse + /api/edi/import + GET /api/edi/log
- [x] EdiSimulatorPage: 3 Tabs (Simulator, Import, Verlauf)
- [x] Import-Tab: Text-Paste → Vorschau → Importieren
- [x] Verlauf-Tab: AG Grid mit Import-Historik
- [x] 6 Playwright-Tests
- [x] **108 Tests gesamt: 105 passed, 2 flaky, 1 skipped**

### Offen / Next Steps
- [ ] IFTSTA EDI-Format
- [ ] Forecast
- [ ] OEM-spezifische Berichte

---

## Business-Logik Referenz

Komplette Analyse des Altsystems:
- **Domain Model:** https://github.com/roth-jan/tmsa-ii-analyse/blob/main/TMSA-II-Domain-Model.md
- **UI Workflows:** https://github.com/roth-jan/tmsa-ii-analyse/blob/main/TMSA-II-UI-Workflows.md
- **Database Schema:** https://github.com/roth-jan/tmsa-ii-analyse/blob/main/TMSA-II-Database-Schema.md
- **Berichte/EDI:** https://github.com/roth-jan/tmsa-ii-analyse/blob/main/TMSA-II-Berichte-EDI-Services-Dokumentation.md
- **Gebrochene Verkehre:** https://github.com/roth-jan/tmsa-ii-analyse/blob/main/TMSA-II-Gebrochene-Verkehre.md

---

## Kern-Business-Flow

```
Avis (Lieferant meldet Sendung an)
  → Disposition/Mengenplan (Disponent weist Avise Touren zu)
    → Abfahrt (Borderos erstellen, KFZ zuweisen)
      → Nacharbeit (Korrekturen, Quittungen)
        → TU-Abrechnung (Bewerten → Freigeben → Erzeugen)
          → Berichte (Dokumente, Statistiken)
```

## Kern-Entities

| Entity | Beschreibung |
|--------|-------------|
| Niederlassung | Geschäftsstelle der Spedition |
| OEM | Automobilhersteller (BMW, Daimler, VW, Porsche, MAN) |
| Werk | Produktionsstandort eines OEM |
| Lieferant | Zulieferer der OEMs |
| Abladestelle | Entladeort an einem Werk |
| TU | Transport-Unternehmer (Carrier/Spediteur) |
| KFZ | Fahrzeug eines TU |
| Route | Transportweg zwischen Standorten |
| Avis | Voranmeldung einer Sendung |
| Artikelzeile | Position innerhalb eines Avis |
| Tour | Zusammenfassung von Avisen zu einer Fahrt |
| Abfahrt | Tatsächliche Abfahrt eines KFZ |
| Bordero | Lademanifest/Ladeschein |
| Sendung | Einzelne Sendung auf einem Bordero |
| Kondition | Preisberechnung (Tour-/Last-/Leerkm-Faktoren) |
| Streckenabschnitt | Ein Leg eines gebrochenen Verkehrs |

---

## Konventionen

### Code-Stil
- TypeScript überall (kein plain JS)
- Deutsche Begriffe für Business-Entities (Avis, Niederlassung, etc.)
- Englisch für technische Begriffe (route handler, middleware, etc.)
- Tabellen-/Modellnamen: PascalCase deutsch (z.B. `Niederlassung`, `Abladestelle`)
- API-Routen: kebab-case (`/api/niederlassungen`, `/api/transport-unternehmer`)

### Datenbank
- UUID als Primary Keys (wie im Original)
- Audit-Spalten: erstelltVon, erstelltAm, geaendertVon, geaendertAm
- Soft-Delete via geloeschtAm Timestamp
- Alle Relationen mit Prisma-Relations abbilden

### API
- REST (kein GraphQL)
- Standard-Responses: `{ data: ... }` oder `{ error: "..." }`
- Pagination: `?page=1&limit=50`
- Filter: `?oem=BMW&niederlassung=...`
- Auth via Session-Cookie

### Berechtigungen
- Feingranulares Rechtesystem wie im Original
- Format: `modul.aktion` (z.B. `avis.erstellen`, `mengenplan.bearbeiten`)
- Niederlassungs-bezogen (User sieht nur Daten seiner NL)

---

## Wichtige Hinweise für Claude

- **IMMER** die Analyse-Docs konsultieren bevor Business-Logik implementiert wird
- **NIEMALS** Business-Begriffe ins Englische übersetzen (Avis bleibt Avis, nicht "Notification")
- **Pro Modul** erst eine Spec in docs/ schreiben, dann implementieren
- **Der User ist kein Entwickler** — jeden Schritt erklären, Befehle mitgeben
- **Gebrochene Verkehre** sind das komplexeste Feature — besonders sorgfältig implementieren
- **OEM-Spezifika** kommen erst in Phase 5, nicht vorher einbauen
