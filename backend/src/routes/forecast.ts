import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

// GET /api/forecast — Liste mit Filtern
router.get("/", requireAuth, requireRecht("forecast", "lesen"), async (req: Request, res: Response) => {
  try {
    const { oemId, werkId, status } = req.query as any;
    const nlId = req.session.niederlassungId || undefined;

    const where: any = { geloeschtAm: null };
    if (nlId) where.niederlassungId = nlId;
    if (oemId) where.oemId = oemId;
    if (werkId) where.werkId = werkId;
    if (status) where.status = status;

    const data = await prisma.forecast.findMany({
      where,
      include: {
        oem: { select: { name: true, kurzbezeichnung: true } },
        werk: { select: { name: true, werkscode: true } },
        _count: { select: { details: true } },
      },
      orderBy: { erstelltAm: "desc" },
    });

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/forecast/:id — Einzeln mit Details
router.get("/:id", requireAuth, requireRecht("forecast", "lesen"), async (req: Request, res: Response) => {
  try {
    const data = await prisma.forecast.findFirst({
      where: { id: req.params.id, geloeschtAm: null },
      include: {
        oem: { select: { name: true, kurzbezeichnung: true } },
        werk: { select: { name: true, werkscode: true } },
        details: { orderBy: [{ jahr: "asc" }, { kalenderwoche: "asc" }] },
      },
    });
    if (!data) return res.status(404).json({ error: "Forecast nicht gefunden" });
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/forecast — Anlegen mit nested Details
router.post("/", requireAuth, requireRecht("forecast", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { bezeichnung, oemId, werkId, gueltigVon, gueltigBis, status, details } = req.body;

    let niederlassungId = req.session.niederlassungId;
    if (!niederlassungId) {
      const firstNl = await prisma.niederlassung.findFirst();
      niederlassungId = firstNl?.id;
    }
    if (!niederlassungId) return res.status(400).json({ error: "Keine Niederlassung verfügbar" });

    const data = await prisma.forecast.create({
      data: {
        bezeichnung,
        oemId,
        werkId,
        gueltigVon: new Date(gueltigVon),
        gueltigBis: new Date(gueltigBis),
        status: status || "entwurf",
        niederlassungId,
        details: details?.length > 0 ? {
          create: details.map((d: any) => ({
            kalenderwoche: d.kalenderwoche,
            jahr: d.jahr,
            menge: d.menge,
            gewicht: d.gewicht || 0,
          })),
        } : undefined,
      },
      include: {
        oem: { select: { name: true, kurzbezeichnung: true } },
        werk: { select: { name: true, werkscode: true } },
        details: true,
      },
    });

    return res.status(201).json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/forecast/:id — Aktualisieren (Header + Details ersetzen)
router.put("/:id", requireAuth, requireRecht("forecast", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { bezeichnung, oemId, werkId, gueltigVon, gueltigBis, status, details } = req.body;

    // Delete old details, create new ones
    await prisma.forecastDetail.deleteMany({ where: { forecastId: req.params.id } });

    const data = await prisma.forecast.update({
      where: { id: req.params.id },
      data: {
        bezeichnung,
        oemId,
        werkId,
        gueltigVon: gueltigVon ? new Date(gueltigVon) : undefined,
        gueltigBis: gueltigBis ? new Date(gueltigBis) : undefined,
        status,
        details: details?.length > 0 ? {
          create: details.map((d: any) => ({
            kalenderwoche: d.kalenderwoche,
            jahr: d.jahr,
            menge: d.menge,
            gewicht: d.gewicht || 0,
          })),
        } : undefined,
      },
      include: {
        oem: { select: { name: true, kurzbezeichnung: true } },
        werk: { select: { name: true, werkscode: true } },
        details: true,
      },
    });

    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/forecast/:id — Soft Delete
router.delete("/:id", requireAuth, requireRecht("forecast", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.forecast.update({
      where: { id: req.params.id },
      data: { geloeschtAm: new Date() },
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/forecast/:id/vergleich — Ist vs Soll
router.get("/:id/vergleich", requireAuth, requireRecht("forecast", "lesen"), async (req: Request, res: Response) => {
  try {
    const forecast = await prisma.forecast.findFirst({
      where: { id: req.params.id, geloeschtAm: null },
      include: {
        details: { orderBy: [{ jahr: "asc" }, { kalenderwoche: "asc" }] },
      },
    });
    if (!forecast) return res.status(404).json({ error: "Forecast nicht gefunden" });

    const vergleich = [];

    for (const detail of forecast.details) {
      // Calculate date range for this KW
      const kwStart = getDateOfKW(detail.jahr, detail.kalenderwoche);
      const kwEnd = new Date(kwStart);
      kwEnd.setDate(kwEnd.getDate() + 6);
      kwEnd.setHours(23, 59, 59);

      // Find actual Avis quantities for this werk in this KW
      const avise = await prisma.avis.findMany({
        where: {
          werkId: forecast.werkId,
          ladeDatum: { gte: kwStart, lte: kwEnd },
          geloeschtAm: null,
        },
        include: {
          artikelzeilen: { select: { menge: true, gewicht: true } },
        },
      });

      let istMenge = 0;
      let istGewicht = 0;
      for (const a of avise) {
        for (const z of a.artikelzeilen) {
          istMenge += Number(z.menge || 0);
          istGewicht += Number(z.gewicht || 0);
        }
      }

      const sollMenge = detail.menge;
      const differenz = istMenge - sollMenge;
      const prozent = sollMenge > 0 ? Math.round((istMenge / sollMenge) * 10000) / 100 : 0;

      vergleich.push({
        kalenderwoche: detail.kalenderwoche,
        jahr: detail.jahr,
        sollMenge,
        sollGewicht: detail.gewicht,
        istMenge: Math.round(istMenge * 100) / 100,
        istGewicht: Math.round(istGewicht * 100) / 100,
        differenz: Math.round(differenz * 100) / 100,
        prozent,
      });
    }

    return res.json({ data: vergleich });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper: Get Monday of a given ISO calendar week
function getDateOfKW(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Convert Sunday=0 to 7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default router;
