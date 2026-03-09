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

### Phase 1: Fundament + Stammdaten
- [x] Projekt-Setup
- [ ] Auth (Login, Benutzer, Rechte)
- [ ] Niederlassung (Geschäftsstellen)
- [ ] OEM (BMW, Daimler, VW, Porsche, MAN)
- [ ] Werk (Produktionsstandorte)
- [ ] Lieferant (Zulieferer)
- [ ] Abladestelle (Entladeorte an Werken)
- [ ] TU (Transport-Unternehmer / Carrier)
- [ ] KFZ (Fahrzeuge)
- [ ] Route (Transportwege)
- [ ] Kondition (Preisberechnung)

### Phase 2: Kern-Business (Disposition)
- [ ] Avis (Voranmeldung einer Sendung)
- [ ] Mengenplan/Disposition (Kern-Modul — Pivot-Grid, Drag&Drop)
- [ ] DispoOrt, DispoRegel
- [ ] Gebrochene Verkehre (Streckenabschnitte, LagerRouting)

### Phase 3: Operativ
- [ ] Abfahrt (Borderos, Sendungen)
- [ ] Nacharbeit (Korrekturen, Quittungen)
- [ ] Sendungsbildung

### Phase 4: Billing
- [ ] TU-Abrechnung (Bewerten → Freigeben → Erzeugen)
- [ ] Konditionsberechnung
- [ ] Storno

### Phase 5: Berichte + EDI
- [ ] Berichtswesen (Reports)
- [ ] VDA 4913 (BMW, Daimler, VW, Porsche, MAN)
- [ ] Weitere EDI (VDA4927, DESADV, IFCSUM, IFTSTA)
- [ ] Forecast

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
