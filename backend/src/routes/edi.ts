import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";
import { parseEdi, detectFormat, ParsedIFTSTAResult } from "../services/edi-parser";
import { generateVda4913, generateIftsta, EdiExportTour } from "../services/edi-generator";

const router = Router();

// POST /api/edi/parse — Vorschau (kein DB-Schreiben)
router.post("/parse", requireAuth, requireRecht("edi", "lesen"), async (req: Request, res: Response) => {
  try {
    const { text, formatHint } = req.body;
    if (!text) return res.status(400).json({ error: "Kein Text zum Parsen" });

    const result = parseEdi(text, formatHint);
    return res.json({ data: result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/edi/import — Parsen + Avise/Status in DB erstellen/aktualisieren
router.post("/import", requireAuth, requireRecht("edi", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { text, formatHint, dateiname } = req.body;
    if (!text) return res.status(400).json({ error: "Kein Text zum Importieren" });

    const result = parseEdi(text, formatHint);

    // IFTSTA: Status-Updates statt Avis-Erstellung
    if (result.format === "IFTSTA") {
      const iftstaResult = result as ParsedIFTSTAResult;
      let updatedCount = 0;
      const errors: string[] = [];

      for (const update of iftstaResult.statusUpdates) {
        try {
          const tour = await prisma.tour.findFirst({
            where: { tourNummer: update.referenz, geloeschtAm: null },
          });
          if (!tour) {
            errors.push(`Tour "${update.referenz}" nicht gefunden`);
            continue;
          }
          // Status-Mapping: 1,2,3 → abgefahren, 5 → abgeschlossen, 7 → keine Änderung
          let newStatus: string | null = null;
          if (["1", "2", "3"].includes(update.statusCode)) newStatus = "abgefahren";
          else if (update.statusCode === "5") newStatus = "abgeschlossen";
          else {
            errors.push(`Tour "${update.referenz}": Status ${update.statusCode} (${update.statusText}) nicht automatisch umsetzbar`);
            continue;
          }
          await prisma.tour.update({
            where: { id: tour.id },
            data: { status: newStatus },
          });
          updatedCount++;
        } catch (err: any) {
          errors.push(err.message);
        }
      }

      const status = errors.length === 0 ? "success" : updatedCount > 0 ? "partial" : "error";
      await prisma.ediImport.create({
        data: {
          format: "IFTSTA",
          dateiname: dateiname || null,
          status,
          ergebnis: { updatedCount, errors },
          rohdaten: text.substring(0, 5000),
          benutzerId: req.session.userId || null,
          benutzerName: req.session.benutzername || null,
        },
      });

      return res.json({
        data: { format: "IFTSTA", status, updatedCount, errors },
      });
    }

    // Standard: Avis-Import
    const createdAvisIds: string[] = [];
    const errors: string[] = [];
    const nlId = req.session.niederlassungId;

    for (const avisData of (result as any).avise) {
      try {
        // Werk über werkscode finden
        let werkId: string | undefined;
        if (avisData.werkscode) {
          const werk = await prisma.werk.findFirst({ where: { werkscode: avisData.werkscode } });
          if (werk) werkId = werk.id;
        }

        // Lieferant über lieferantennummer finden
        let lieferantId: string | undefined;
        if (avisData.lieferantNr) {
          const lief = await prisma.lieferant.findFirst({ where: { lieferantennummer: avisData.lieferantNr } });
          if (lief) lieferantId = lief.id;
        }

        if (!werkId) {
          errors.push(`Werk "${avisData.werkscode}" nicht gefunden`);
          continue;
        }
        if (!lieferantId) {
          errors.push(`Lieferant "${avisData.lieferantNr}" nicht gefunden`);
          continue;
        }

        // Niederlassung: Session-NL oder erste verfügbare
        let niederlassungId = nlId;
        if (!niederlassungId) {
          const firstNl = await prisma.niederlassung.findFirst();
          niederlassungId = firstNl?.id;
        }
        if (!niederlassungId) {
          errors.push("Keine Niederlassung verfügbar");
          continue;
        }

        const avis = await prisma.avis.create({
          data: {
            avisNummer: avisData.avisNummer,
            ladeDatum: new Date(avisData.ladeDatum),
            status: "offen",
            werkId,
            lieferantId,
            niederlassungId,
            bemerkung: `EDI-Import ${result.format}`,
            artikelzeilen: {
              create: avisData.zeilen.map((z: any) => ({
                artikelBeschreibung: z.beschreibung,
                menge: z.menge,
                masseinheit: z.me || "ST",
                gewicht: z.gewicht || 0,
                gutArt: "VOLLGUT",
              })),
            },
          },
        });
        createdAvisIds.push(avis.id);
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    // EdiImport loggen
    const status = errors.length === 0 ? "success" : createdAvisIds.length > 0 ? "partial" : "error";
    await prisma.ediImport.create({
      data: {
        format: result.format,
        dateiname: dateiname || null,
        status,
        ergebnis: { createdAvisIds, errors },
        rohdaten: text.substring(0, 5000),
        benutzerId: req.session.userId || null,
        benutzerName: req.session.benutzername || null,
      },
    });

    return res.json({
      data: {
        format: result.format,
        status,
        createdAvisIds,
        errors,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/edi/log — Import-Verlauf
router.get("/log", requireAuth, requireRecht("edi", "lesen"), async (req: Request, res: Response) => {
  try {
    const { page = "1", limit = "50" } = req.query as any;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));

    const [data, total] = await Promise.all([
      prisma.ediImport.findMany({
        orderBy: { erstelltAm: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.ediImport.count(),
    ]);

    return res.json({ data, total });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/edi/export/:format — EDI-Ausgang generieren
router.post("/export/:format", requireAuth, requireRecht("edi", "erstellen"), async (req: Request, res: Response) => {
  try {
    const format = req.params.format.toUpperCase();
    const { tourId, statusCode } = req.body;

    if (!tourId) return res.status(400).json({ error: "tourId ist Pflicht" });

    const tour = await prisma.tour.findUnique({
      where: { id: tourId },
      include: {
        kfz: true,
        transportUnternehmer: true,
        route: true,
        artikelzeilen: {
          include: {
            avis: {
              include: {
                lieferant: true,
                werk: true,
              },
            },
          },
        },
      },
    });

    if (!tour) return res.status(404).json({ error: "Tour nicht gefunden" });

    const exportTour: EdiExportTour = {
      tourNummer: tour.tourNummer,
      tourDatum: tour.tourDatum,
      status: tour.status,
      kfzKennzeichen: tour.kfz?.kennzeichen,
      tuName: tour.transportUnternehmer?.name,
      routennummer: tour.route?.routennummer,
      artikelzeilen: tour.artikelzeilen.map((az) => ({
        beschreibung: az.artikelBeschreibung,
        menge: Number(az.menge),
        me: az.masseinheit,
        gewicht: Number(az.gewicht || 0),
        lieferantNr: az.avis?.lieferant?.lieferantennummer || undefined,
        werkscode: az.avis?.werk?.werkscode || undefined,
      })),
    };

    let content: string;
    if (format === "VDA4913") {
      content = generateVda4913(exportTour);
    } else if (format === "IFTSTA") {
      content = generateIftsta(exportTour, statusCode || "5");
    } else {
      return res.status(400).json({ error: `Unbekanntes Format: ${format}. Erlaubt: VDA4913, IFTSTA` });
    }

    // Optional: Datei in Ausgangsverzeichnis ablegen
    const ediAusgangDir = process.env.EDI_AUSGANG_DIR || "/data/edi-ausgang";
    try {
      if (!fs.existsSync(ediAusgangDir)) fs.mkdirSync(ediAusgangDir, { recursive: true });
      const filename = `${format}_${tour.tourNummer}_${new Date().toISOString().replace(/[:.]/g, "-")}.edi`;
      fs.writeFileSync(path.join(ediAusgangDir, filename), content, "utf-8");
    } catch {
      // Verzeichnis nicht verfügbar — kein Fehler, Content wird trotzdem zurückgegeben
    }

    return res.json({
      data: {
        format,
        tourNummer: tour.tourNummer,
        content,
      },
    });
  } catch (err: any) {
    console.error("EDI-Export:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
