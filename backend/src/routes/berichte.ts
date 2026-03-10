import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import { toCsv, CsvColumn } from "../services/csv-export";
import {
  berichtTouren,
  berichtAvise,
  berichtTuKosten,
  berichtAbfahrten,
  berichtSendungen,
  berichtAbrechnungen,
  berichtAusfallfrachten,
  berichtDfueUebersicht,
  berichtFahrzeugliste,
  berichtKonditionsuebersicht,
} from "../services/berichte";

const router = Router();

function sendCsv(res: Response, data: any[], columns: CsvColumn[], filename: string) {
  const csv = toCsv(data, columns);
  const datum = new Date().toISOString().split("T")[0];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}-${datum}.csv"`);
  return res.send(csv);
}

// 1. Tourenübersicht
const tourenCols: CsvColumn[] = [
  { header: "Tour-Nr.", field: "tourNummer" },
  { header: "Datum", field: "tourDatum", format: "date" },
  { header: "Status", field: "status" },
  { header: "TU", field: "transportUnternehmer.kurzbezeichnung" },
  { header: "Route", field: "route.routennummer" },
  { header: "KFZ", field: "kfz.kennzeichen" },
  { header: "Kondition", field: "kondition.name" },
  { header: "Last-km", field: "lastKilometer", format: "decimal" },
  { header: "Leer-km", field: "leerKilometer", format: "decimal" },
  { header: "Maut-km", field: "mautKilometer", format: "decimal" },
  { header: "Kosten (Kondition)", field: "kostenKondition", format: "decimal" },
  { header: "Kosten (Manuell)", field: "kostenManuell", format: "decimal" },
];

router.get("/touren", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, tuId, routeId, status, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtTouren({ datumVon, datumBis, tuId, routeId, status }, nlId);
    if (format === "csv") return sendCsv(res, data, tourenCols, "touren");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 2. Avis-Liste
const aviseCols: CsvColumn[] = [
  { header: "Avis-Nr.", field: "avisNummer" },
  { header: "Ladedatum", field: "ladeDatum", format: "date" },
  { header: "Status", field: "status" },
  { header: "Lieferant", field: "lieferant.name" },
  { header: "Lieferanten-Nr.", field: "lieferant.lieferantennummer" },
  { header: "Werk", field: "werk.name" },
  { header: "Werkscode", field: "werk.werkscode" },
  { header: "Anzahl Zeilen", field: "_count.artikelzeilen" },
];

router.get("/avise", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, werkId, status, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtAvise({ datumVon, datumBis, werkId, status }, nlId);
    if (format === "csv") return sendCsv(res, data, aviseCols, "avise");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3. TU-Kostenauswertung
const tuKostenCols: CsvColumn[] = [
  { header: "TU", field: "tuName" },
  { header: "TU-Kürzel", field: "tuKurz" },
  { header: "Anzahl Touren", field: "anzahlTouren" },
  { header: "Summe Kosten", field: "summeKosten", format: "decimal" },
  { header: "Ø Kosten/Tour", field: "durchschnittKosten", format: "decimal" },
];

router.get("/tu-kosten", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, tuId, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtTuKosten({ datumVon, datumBis, tuId }, nlId);
    if (format === "csv") return sendCsv(res, data, tuKostenCols, "tu-kosten");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Abfahrten-Protokoll
const abfahrtenCols: CsvColumn[] = [
  { header: "Abfahrt-Nr.", field: "abfahrtNummer" },
  { header: "Datum", field: "datum", format: "date" },
  { header: "Status", field: "status" },
  { header: "KFZ", field: "kfz.kennzeichen" },
  { header: "TU", field: "transportUnternehmer.kurzbezeichnung" },
  { header: "Route", field: "route.routennummer" },
  { header: "Tour", field: "tour.tourNummer" },
  { header: "Anzahl Borderos", field: "_count.borderos" },
];

router.get("/abfahrten", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, status, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtAbfahrten({ datumVon, datumBis, status }, nlId);
    if (format === "csv") return sendCsv(res, data, abfahrtenCols, "abfahrten");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Sendungsübersicht
const sendungenCols: CsvColumn[] = [
  { header: "Sendung-Nr.", field: "sendungNummer" },
  { header: "Datum", field: "datum", format: "date" },
  { header: "Status", field: "status" },
  { header: "Richtung", field: "richtungsArt" },
  { header: "Bordero", field: "bordero.borderoNummer" },
  { header: "Lieferant", field: "lieferant.name" },
  { header: "Werk", field: "werk.name" },
  { header: "OEM", field: "oem.kurzbezeichnung" },
  { header: "Gewicht (kg)", field: "gewicht", format: "decimal" },
  { header: "Lademeter", field: "lademeter", format: "decimal" },
];

router.get("/sendungen", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, status, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const statusNum = status != null ? parseInt(status) : undefined;
    const data = await berichtSendungen({ datumVon, datumBis, status: isNaN(statusNum!) ? undefined : statusNum }, nlId);
    if (format === "csv") return sendCsv(res, data, sendungenCols, "sendungen");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Abrechnungsjournal
const abrechnungenCols: CsvColumn[] = [
  { header: "Beleg-Nr.", field: "belegnummer" },
  { header: "Buchungsjahr", field: "buchungsjahr" },
  { header: "TU", field: "transportUnternehmer.name" },
  { header: "Zeitraum von", field: "zeitraumVon", format: "date" },
  { header: "Zeitraum bis", field: "zeitraumBis", format: "date" },
  { header: "Anzahl Positionen", field: "anzahlPositionen" },
  { header: "Gesamtbetrag", field: "gesamtbetrag", format: "decimal" },
  { header: "Status", field: "status" },
];

router.get("/abrechnungen", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { buchungsjahr, tuId, status, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const bj = buchungsjahr ? parseInt(buchungsjahr) : undefined;
    const data = await berichtAbrechnungen({ buchungsjahr: bj, tuId, status }, nlId);
    if (format === "csv") return sendCsv(res, data, abrechnungenCols, "abrechnungen");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Ausfallfrachten
const ausfallfrachtCols: CsvColumn[] = [
  { header: "Tour-Nr.", field: "tourNummer" },
  { header: "Datum", field: "tourDatum", format: "date" },
  { header: "Status", field: "status" },
  { header: "TU", field: "transportUnternehmer.kurzbezeichnung" },
  { header: "Route", field: "route.routennummer" },
  { header: "KFZ", field: "kfz.kennzeichen" },
  { header: "Leerfahrt", field: "istLeerfahrt" },
  { header: "Zeilen", field: "_count.artikelzeilen" },
];

router.get("/ausfallfrachten", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, tuId, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtAusfallfrachten({ datumVon, datumBis, tuId }, nlId);
    if (format === "csv") return sendCsv(res, data, ausfallfrachtCols, "ausfallfrachten");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 8. DFUE-Übersicht
const dfueCols: CsvColumn[] = [
  { header: "Zeitpunkt", field: "zeitpunkt", format: "date" },
  { header: "Avis-Nr.", field: "avisNummer" },
  { header: "Format", field: "format" },
  { header: "Status", field: "status" },
  { header: "Benutzer", field: "benutzerName" },
];

router.get("/dfue", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtDfueUebersicht({ datumVon, datumBis }, nlId);
    if (format === "csv") return sendCsv(res, data, dfueCols, "dfue");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Fahrzeugliste
const fahrzeugCols: CsvColumn[] = [
  { header: "Kennzeichen", field: "kennzeichen" },
  { header: "Fabrikat", field: "fabrikat" },
  { header: "Typ", field: "lkwTyp" },
  { header: "TU", field: "tu" },
  { header: "Touren", field: "anzahlTouren" },
  { header: "Kosten", field: "summeKosten", format: "decimal" },
  { header: "Ø Kosten", field: "durchschnittKosten", format: "decimal" },
];

router.get("/fahrzeugliste", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, tuId, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtFahrzeugliste({ datumVon, datumBis, tuId }, nlId);
    if (format === "csv") return sendCsv(res, data, fahrzeugCols, "fahrzeugliste");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 10. Konditionsübersicht
const konditionCols: CsvColumn[] = [
  { header: "TU", field: "transportUnternehmer.name" },
  { header: "Route", field: "route.routennummer" },
  { header: "Name", field: "name" },
  { header: "Tour-Faktor", field: "tourFaktor", format: "decimal" },
  { header: "Stopp-Faktor", field: "stoppFaktor", format: "decimal" },
  { header: "Last-km", field: "lastKmFaktor", format: "decimal" },
  { header: "Leer-km", field: "leerKmFaktor", format: "decimal" },
  { header: "Maut-km", field: "mautKmFaktor", format: "decimal" },
  { header: "Gültig von", field: "gueltigVon", format: "date" },
  { header: "Gültig bis", field: "gueltigBis", format: "date" },
];

router.get("/konditionsuebersicht", requireAuth, requireRecht("berichte", "lesen"), async (req: Request, res: Response) => {
  try {
    const { tuId, routeId, format } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;
    const data = await berichtKonditionsuebersicht({ tuId, routeId }, nlId);
    if (format === "csv") return sendCsv(res, data, konditionCols, "konditionsuebersicht");
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
