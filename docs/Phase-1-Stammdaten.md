# Phase 1: Fundament + Stammdaten

## Ziel
Grundgerüst der App + alle Stammdaten-Module. Danach kann man sich einloggen, Stammdaten pflegen, und die Basis für den Kern-Flow (Phase 2) ist gelegt.

---

## 1.1 Projekt-Setup

### Was wird gemacht?
- React Frontend mit Vite aufsetzen
- Express Backend mit TypeScript aufsetzen
- PostgreSQL via Docker
- Prisma Schema mit allen Stammdaten-Tabellen
- Grundlegendes Layout (Navigation, Login)

### Ergebnis
- App startet, man sieht eine Login-Seite
- Nach Login: Dashboard mit Navigation zu allen Stammdaten-Modulen

---

## 1.2 Auth & Benutzer

### Tabellen
- **Benutzer**: ID, Benutzername, Passwort (gehasht), Name, Email, NiederlassungFK, Aktiv
- **Rolle**: ID, Name, Beschreibung
- **BenutzerRolle**: BenutzerFK, RolleFK
- **Recht**: ID, Modul, Aktion (z.B. "avis", "erstellen")
- **RolleRecht**: RolleFK, RechtFK

### Funktionen
- Login/Logout
- Benutzer CRUD (nur für Admins)
- Rollen + Rechte zuweisen
- Niederlassungs-Filter (User sieht nur seine NL-Daten)

---

## 1.3 Stammdaten-Module

Jedes Modul hat die gleiche Grundstruktur:
- **Liste** (AG Grid mit Filter, Sortierung, Suche)
- **Detail** (Formular zum Anlegen/Bearbeiten)
- **Löschen** (Soft-Delete mit Bestätigung)

### Niederlassung
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| Kurzbezeichnung | String | Ja |
| Adresse | String | Nein |
| PLZ, Ort | String | Nein |
| Aktiv | Boolean | Ja |

### OEM
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja (BMW, Daimler, VW, Porsche, MAN) |
| Kurzbezeichnung | String | Ja |
| EDI-Kennung | String | Nein |
| Aktiv | Boolean | Ja |

### Werk
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| OEMFK | UUID | Ja (→ OEM) |
| Werkscode | String | Nein |
| Adresse, PLZ, Ort | String | Nein |
| Aktiv | Boolean | Ja |

### Lieferant
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| Lieferantennummer | String | Nein |
| Adresse, PLZ, Ort | String | Nein |
| Land | String | Nein |
| Aktiv | Boolean | Ja |

### Abladestelle
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| WerkFK | UUID | Ja (→ Werk) |
| EntladeZone | String | Nein |
| Sperrzeiten | JSON | Nein (Zeitfenster-Einschränkungen) |
| Aktiv | Boolean | Ja |

### TU (Transport-Unternehmer)
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| Kurzbezeichnung | String | Ja |
| Adresse, PLZ, Ort | String | Nein |
| NiederlassungFK | UUID | Ja (→ Niederlassung) |
| Aktiv | Boolean | Ja |

### KFZ
| Feld | Typ | Pflicht |
|------|-----|---------|
| Kennzeichen | String | Ja |
| TUFK | UUID | Ja (→ TU) |
| Fabrikat | String | Nein |
| LKWTyp | String | Nein |
| MaxLDM | Decimal | Nein (Lademeter) |
| MaxGewicht | Decimal | Nein (kg) |
| Schadstoffklasse | String | Nein |
| Aktiv | Boolean | Ja |

### Route
| Feld | Typ | Pflicht |
|------|-----|---------|
| Routennummer | String | Ja |
| OEMFK | UUID | Ja (→ OEM) |
| Beschreibung | String | Nein |
| KilometerLast | Decimal | Nein |
| KilometerLeer | Decimal | Nein |
| KilometerMaut | Decimal | Nein |
| Aktiv | Boolean | Ja |

### Kondition
| Feld | Typ | Pflicht |
|------|-----|---------|
| Name | String | Ja |
| TUFK | UUID | Ja (→ TU) |
| RouteFK | UUID | Nein (→ Route) |
| TourFaktor | Decimal | Nein |
| StoppFaktor | Decimal | Nein |
| TagFaktor | Decimal | Nein |
| LastKmFaktor | Decimal | Nein |
| LeerKmFaktor | Decimal | Nein |
| MautKmFaktor | Decimal | Nein |
| MaximalFrachtProTour | Decimal | Nein |
| MaximalFrachtProTag | Decimal | Nein |
| GueltigVon | Date | Ja |
| GueltigBis | Date | Nein |

---

## Definition of Done Phase 1

- [ ] App startet (Frontend + Backend + DB)
- [ ] Login funktioniert
- [ ] Alle 9 Stammdaten-Module: Liste + Anlegen + Bearbeiten + Löschen
- [ ] Berechtigungssystem aktiv (User ohne Recht sieht Button nicht)
- [ ] Niederlassungs-Filter funktioniert
- [ ] Responsive (funktioniert auf Desktop, notfalls auf Tablet)
- [ ] Playwright-Tests für Login + mindestens 2 Stammdaten-Module
