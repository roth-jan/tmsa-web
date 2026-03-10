import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";
import { erstelleBorderoPdf, erstelleTuAbrechnungPdf } from "../services/pdf-generator";

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /api/pdf/bordero/:id — Bordero als PDF
// ============================================================
router.get("/bordero/:id", requireRecht("abfahrt", "lesen"), async (req: Request, res: Response) => {
  try {
    const bordero = await prisma.bordero.findUnique({
      where: { id: req.params.id },
      include: {
        abfahrt: {
          include: {
            tour: { select: { tourNummer: true } },
            kfz: { select: { kennzeichen: true } },
            transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
            route: { select: { routennummer: true, beschreibung: true } },
            niederlassung: { select: { name: true, kurzbezeichnung: true } },
          },
        },
        sendungen: {
          include: {
            lieferant: { select: { name: true } },
            werk: { select: { name: true } },
          },
          orderBy: { erstelltAm: "asc" },
        },
      },
    });

    if (!bordero) {
      return res.status(404).json({ error: "Bordero nicht gefunden" });
    }

    // NL-Filter
    if (req.session.niederlassungId && bordero.abfahrt.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    const pdfDoc = erstelleBorderoPdf(bordero);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Bordero-${bordero.borderoNummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF Bordero:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/pdf/tu-abrechnung/:id — TU-Abrechnung als PDF
// ============================================================
router.get("/tu-abrechnung/:id", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const abrechnung = await prisma.tuAbrechnung.findUnique({
      where: { id: req.params.id },
      include: {
        transportUnternehmer: true,
        niederlassung: true,
        positionen: {
          orderBy: { tourDatum: "asc" },
        },
      },
    });

    if (!abrechnung) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }

    // NL-Filter
    if (req.session.niederlassungId && abrechnung.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    const pdfDoc = erstelleTuAbrechnungPdf(abrechnung as any);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="TU-Abrechnung-${abrechnung.belegnummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF TU-Abrechnung:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
