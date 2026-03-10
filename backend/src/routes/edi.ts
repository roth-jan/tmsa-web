import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";
import { parseEdi, detectFormat } from "../services/edi-parser";

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

// POST /api/edi/import — Parsen + Avise in DB erstellen
router.post("/import", requireAuth, requireRecht("edi", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { text, formatHint, dateiname } = req.body;
    if (!text) return res.status(400).json({ error: "Kein Text zum Importieren" });

    const result = parseEdi(text, formatHint);
    const createdAvisIds: string[] = [];
    const errors: string[] = [];
    const nlId = req.session.niederlassungId;

    for (const avisData of result.avise) {
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

export default router;
