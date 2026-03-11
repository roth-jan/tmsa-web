# TMSA Web — Kurzanleitung zum Testen

## Zugangsdaten

| Benutzer | Passwort | Rolle | Beschreibung |
|----------|----------|-------|--------------|
| **admin** | Admin1! | Administrator | Vollzugriff auf alle Module |
| **dispo** | Dispo1! | Disponent | Disposition, Avise, Touren, Mengenplan |

---

## Aufbau der Anwendung

Nach dem Login landen Sie auf dem **Dashboard** mit Kennzahlen:
- Offene Artikelzeilen, Touren heute, offene Avise, offene Abrechnungen
- Touren-Status als Ringdiagramm (offen / disponiert / abgefahren / abgeschlossen)
- Tagesübersicht und die letzten 5 Touren

Die **Navigation** links ist in Gruppen gegliedert:

| Gruppe | Module |
|--------|--------|
| **Stammdaten** | Niederlassungen, OEMs, Werke, Lieferanten, Abladestellen, Transport-Unternehmer, Fahrzeuge, Routen, Konditionen, Umschlagpunkte |
| **Disposition** | Avise, Touren, Mengenplan, Dispo-Orte, Dispo-Regeln, EDI Eingang, Forecast |
| **Operativ** | Abfahrten, Nacharbeit, Sendungsbildung |
| **Abrechnung** | TU-Abrechnung |
| **Berichte** | 13 Berichte mit CSV-Export |
| **Verwaltung** | Benutzer, Audit-Log |

---

## Kern-Workflow durchspielen

Der typische Ablauf in TMSA entspricht dem realen Logistikprozess:

### 1. Avis anlegen (Disposition > Avise)

Ein Avis ist eine Voranmeldung vom Lieferanten ("Es kommen 200 Stoßdämpfer").

1. Klick auf **"Neues Avis"**
2. Avis-Nummer vergeben (z.B. AV-TEST-001), Ladedatum setzen
3. Lieferant, Werk und Niederlassung auswählen
4. **Speichern**
5. Avis in der Tabelle anklicken → unten erscheinen die **Artikelzeilen**
6. **"+ Neue Zeile"** → Beschreibung, Menge, Gewicht eingeben → Speichern

### 2. Tour erstellen und Zeilen zuweisen (Disposition > Mengenplan)

Der Mengenplan ist das Herzstück der Disposition — hier werden Artikelzeilen Touren zugewiesen.

1. **Datumsfilter** setzen (z.B. 01.03.–31.03.2026) → "Aktualisieren"
2. Links erscheinen **offene Artikelzeilen** (aus Avisen)
3. Rechts die **Touren** — über "Neue Tour" eine anlegen (Tour-Nr., Datum, Niederlassung)
4. Tour rechts anklicken, Zeilen links per **Checkbox** markieren → **"Zuweisen"**
5. Die Zeilen wandern von links nach rechts in die Tour

### 3. Abfahrt erstellen (Operativ > Abfahrten)

Eine Abfahrt dokumentiert die tatsächliche Fahrt.

1. **"Abfahrt aus Tour"** → Tour auswählen → Erstellen
2. Ein Bordero (Lademanifest) wird automatisch mit den Sendungen erstellt
3. Über die Buttons **CMR** und **Bordero** können PDFs erzeugt werden

### 4. Nacharbeit (Operativ > Nacharbeit)

Nach der Fahrt werden Ist-Daten erfasst.

1. Datumsfilter setzen → "Aktualisieren"
2. Tour anklicken → Detail-Panel öffnet sich
3. **TU und Kondition** zuweisen (für die Kostenberechnung)
4. **Kilometer** eingeben (Last-km, Leer-km, Maut-km)
5. **Quittung** anhaken + Datum → Speichern

### 5. TU-Abrechnung (Abrechnung > TU-Abrechnung)

Hier werden die Transportkosten berechnet und abgerechnet.

1. Tab **"Bewerten"**: Datumsfilter → "Vorschau" → Kosten werden berechnet → "Jetzt bewerten"
2. Tab **"Freigeben & Erzeugen"**: Bewertete Touren selektieren → "Freigeben" → "Abrechnung erzeugen"
3. Tab **"Abrechnungen"**: Fertige Abrechnungen einsehen, PDF herunterladen

### 6. Berichte (Berichte > Berichte)

13 Berichte mit AG Grid Vorschau und CSV-Export:
- Touren, Avise, TU-Kosten, Abfahrten, Sendungen, Abrechnungen
- Ausfallfrachten, DFUE-Übersicht, Fahrzeugliste, Konditionsübersicht
- OEM Mengen, OEM Kosten, OEM Touren

---

## Weitere Features zum Ausprobieren

| Feature | Wo | Was tun |
|---------|-----|---------|
| **Gebrochene Verkehre** | Mengenplan → Tour auswählen | "Tour brechen" → Umschlagpunkt wählen → VL/NL-Abschnitte entstehen |
| **EDI Eingang** | Disposition > EDI Eingang | VDA 4913 / DESADV simulieren → Avis wird automatisch erstellt |
| **Forecast** | Disposition > Forecast | Mengenprognose mit Ist-vs-Soll-Vergleich pro KW |
| **PDF-Druck** | Abfahrten / TU-Abrechnung | Bordero-PDF, CMR, Tourbegleitschein, Abrechnungs-PDF |
| **Rollenverwaltung** | Verwaltung > Benutzer > Tab "Rollen" | Rechte-Matrix pro Rolle bearbeiten |
| **Audit-Log** | Verwaltung > Audit-Log | Alle Änderungen mit Vorher/Nachher-Diff |
| **NL-Wechsel** | Header oben rechts | Admin kann Niederlassung wechseln (filtert alle Daten) |

---

## Bedienung der Tabellen

Alle Tabellen nutzen AG Grid:
- **Sortieren**: Spaltenheader klicken
- **Filtern**: Kleines Menü-Icon im Spaltenheader
- **Spaltenbreite**: Trennlinie zwischen Headern ziehen
- **Zeile auswählen**: Einfach klicken → Buttons "Bearbeiten" / "Löschen" erscheinen
- **Doppelklick**: Öffnet direkt den Bearbeiten-Dialog

---

## Testdaten

Die Anwendung enthält bereits realistische Testdaten:
- 5 Niederlassungen (Gersthofen, Nürnberg, München, Frankfurt, Berlin)
- 5 OEMs (BMW, Daimler, VW, Porsche, MAN)
- 8 Werke, 8 Lieferanten, 6 Transport-Unternehmer, 9 Fahrzeuge
- 19 Touren in verschiedenen Status
- 10 Avise mit Artikelzeilen
- Routen, Konditionen, Forecasts
