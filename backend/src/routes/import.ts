import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();
router.use(requireAuth);

// Unterstützte Modelle und ihre Pflichtfelder
const MODELL_CONFIG: Record<string, {
  prismaModel: string;
  pflichtFelder: string[];
  optionalFelder: string[];
  uniqueKey?: string;
}> = {
  werk: {
    prismaModel: "werk",
    pflichtFelder: ["name", "oemId"],
    optionalFelder: ["werkscode", "adresse", "plz", "ort"],
    uniqueKey: "werkscode",
  },
  lieferant: {
    prismaModel: "lieferant",
    pflichtFelder: ["name"],
    optionalFelder: ["lieferantennummer", "adresse", "plz", "ort", "land"],
    uniqueKey: "lieferantennummer",
  },
  abladestelle: {
    prismaModel: "abladestelle",
    pflichtFelder: ["name", "werkId"],
    optionalFelder: ["entladeZone"],
  },
  tu: {
    prismaModel: "transportUnternehmer",
    pflichtFelder: ["name", "kurzbezeichnung", "niederlassungId"],
    optionalFelder: ["adresse", "plz", "ort", "email"],
  },
  kfz: {
    prismaModel: "kfz",
    pflichtFelder: ["kennzeichen", "transportUnternehmerId"],
    optionalFelder: ["fabrikat", "lkwTyp", "maxLdm", "maxGewicht", "schadstoffklasse"],
  },
  route: {
    prismaModel: "route",
    pflichtFelder: ["routennummer", "oemId"],
    optionalFelder: ["beschreibung", "kilometerLast", "kilometerLeer", "kilometerMaut"],
  },
};

// CSV-Parser (Semikolon-getrennt, UTF-8 BOM)
function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  // BOM entfernen
  let text = content.trim();
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }

  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(";").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(";").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

// POST /api/import/:modell — CSV-Import mit Vorschau-Modus (Admin-only)
router.post("/:modell", requireRecht("benutzer", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const modell = (req.params.modell as string).toLowerCase();
    const config = MODELL_CONFIG[modell];

    if (!config) {
      return res.status(400).json({
        error: `Unbekanntes Modell: ${modell}. Erlaubt: ${Object.keys(MODELL_CONFIG).join(", ")}`,
      });
    }

    const { csvContent, preview } = req.body;
    if (!csvContent) {
      return res.status(400).json({ error: "csvContent ist Pflicht" });
    }

    const { headers, rows } = parseCSV(csvContent);

    if (rows.length === 0) {
      return res.status(400).json({ error: "CSV enthält keine Datenzeilen" });
    }

    // Validierung
    const fehler: { zeile: number; fehler: string }[] = [];
    const valideZeilen: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const zeilenNr = i + 2; // +2 wegen 0-Index und Header

      // Pflichtfelder prüfen
      const fehlend = config.pflichtFelder.filter((f) => !row[f]?.trim());
      if (fehlend.length > 0) {
        fehler.push({ zeile: zeilenNr, fehler: `Fehlende Pflichtfelder: ${fehlend.join(", ")}` });
        continue;
      }

      // Daten aufbereiten
      const data: any = {};
      let zeileUngueltig = false;
      for (const feld of [...config.pflichtFelder, ...config.optionalFelder]) {
        if (row[feld] !== undefined && row[feld] !== "") {
          // Numerische Felder konvertieren
          if (["maxLdm", "maxGewicht", "kilometerLast", "kilometerLeer", "kilometerMaut"].includes(feld)) {
            const num = parseFloat(row[feld].replace(",", "."));
            if (isNaN(num)) {
              fehler.push({ zeile: zeilenNr, fehler: `Feld ${feld}: "${row[feld]}" ist keine gültige Zahl` });
              zeileUngueltig = true;
              break;
            }
            data[feld] = num;
          } else {
            data[feld] = row[feld];
          }
        }
      }

      if (zeileUngueltig) continue;
      valideZeilen.push(data);
    }

    // Vorschau-Modus: Nur Validierung, kein Schreiben
    if (preview === true || preview === "true") {
      return res.json({
        data: {
          modus: "vorschau",
          modell,
          gesamt: rows.length,
          valide: valideZeilen.length,
          fehler,
          vorschau: valideZeilen.slice(0, 10),
          headers,
        },
      });
    }

    // Tatsächlicher Import
    let importiert = 0;
    const importFehler: { zeile: number; fehler: string }[] = [...fehler];

    for (let i = 0; i < valideZeilen.length; i++) {
      try {
        await (prisma as any)[config.prismaModel].create({ data: valideZeilen[i] });
        importiert++;
      } catch (err: any) {
        const zeilenNr = fehler.length > 0 ? i + 2 : i + 2;
        if (err.code === "P2002") {
          importFehler.push({ zeile: zeilenNr, fehler: "Duplikat (bereits vorhanden)" });
        } else if (err.code === "P2003") {
          importFehler.push({ zeile: zeilenNr, fehler: "Referenz nicht gefunden (ungültige ID)" });
        } else {
          importFehler.push({ zeile: zeilenNr, fehler: err.message });
        }
      }
    }

    return res.json({
      data: {
        modus: "import",
        modell,
        gesamt: rows.length,
        importiert,
        fehler: importFehler,
      },
    });
  } catch (err: any) {
    console.error("CSV-Import:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
