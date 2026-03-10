import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

// GET /api/mengenplan/offene-zeilen — Unzugewiesene Artikelzeilen
router.get("/offene-zeilen", requireAuth, requireRecht("mengenplan", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = {
      status: 0,
      tourId: null,
      avis: {
        geloeschtAm: null,
        status: { not: "storniert" },
      },
    };

    // NL-Filter
    if (req.session.niederlassungId) {
      where.avis.niederlassungId = req.session.niederlassungId;
    }

    // Datum-Filter
    if (req.query.datumVon || req.query.datumBis) {
      where.avis.ladeDatum = {};
      if (req.query.datumVon) where.avis.ladeDatum.gte = new Date(req.query.datumVon as string);
      if (req.query.datumBis) where.avis.ladeDatum.lte = new Date(req.query.datumBis as string);
    }

    // Lieferant-Filter
    if (req.query.lieferantId) {
      where.avis.lieferantId = req.query.lieferantId as string;
    }

    // Werk-Filter
    if (req.query.werkId) {
      where.avis.werkId = req.query.werkId as string;
    }

    const zeilen = await prisma.artikelzeile.findMany({
      where,
      include: {
        avis: {
          select: {
            avisNummer: true,
            ladeDatum: true,
            lieferant: { select: { name: true } },
            werk: { select: { name: true, oem: { select: { kurzbezeichnung: true } } } },
          },
        },
      },
      orderBy: [
        { avis: { ladeDatum: "asc" } },
        { erstelltAm: "asc" },
      ],
    });

    return res.json({ data: zeilen });
  } catch (error) {
    console.error("Offene Zeilen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/mengenplan/touren — Touren für Zeitraum
router.get("/touren", requireAuth, requireRecht("mengenplan", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = { geloeschtAm: null };

    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }

    if (req.query.datumVon || req.query.datumBis) {
      where.tourDatum = {};
      if (req.query.datumVon) where.tourDatum.gte = new Date(req.query.datumVon as string);
      if (req.query.datumBis) where.tourDatum.lte = new Date(req.query.datumBis as string);
    }

    const touren = await prisma.tour.findMany({
      where,
      include: {
        kfz: true,
        transportUnternehmer: true,
        route: true,
        _count: { select: { artikelzeilen: true } },
        artikelzeilen: {
          include: {
            avis: {
              select: {
                avisNummer: true,
                lieferant: { select: { name: true } },
              },
            },
          },
        },
        streckenabschnitte: {
          orderBy: { reihenfolge: "asc" },
          include: {
            umschlagPunkt: true,
            route: true,
            transportUnternehmer: true,
            kfz: true,
          },
        },
      },
      orderBy: { tourDatum: "asc" },
    });

    return res.json({ data: touren });
  } catch (error) {
    console.error("Mengenplan Touren:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/mengenplan/zuweisen — Artikelzeilen → Tour zuweisen
router.post("/zuweisen", requireAuth, requireRecht("mengenplan", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { zeilenIds, tourId } = req.body;
    if (!zeilenIds?.length || !tourId) {
      return res.status(400).json({ error: "zeilenIds und tourId erforderlich" });
    }

    const result = await prisma.artikelzeile.updateMany({
      where: {
        id: { in: zeilenIds },
        status: 0,
        tourId: null,
      },
      data: { tourId, status: 1 },
    });

    return res.json({ data: { zugewiesen: result.count } });
  } catch (error) {
    console.error("Mengenplan zuweisen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/mengenplan/zuruecknehmen — Zuweisung rückgängig
router.post("/zuruecknehmen", requireAuth, requireRecht("mengenplan", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { zeilenIds } = req.body;
    if (!zeilenIds?.length) {
      return res.status(400).json({ error: "zeilenIds erforderlich" });
    }

    const result = await prisma.artikelzeile.updateMany({
      where: {
        id: { in: zeilenIds },
        status: 1,
      },
      data: { tourId: null, status: 0 },
    });

    return res.json({ data: { zurueckgenommen: result.count } });
  } catch (error) {
    console.error("Mengenplan zurücknehmen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/mengenplan/neue-tour — Schnell-Erstellung
router.post("/neue-tour", requireAuth, requireRecht("mengenplan", "erstellen"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.tourDatum) data.tourDatum = new Date(data.tourDatum);

    const tour = await prisma.tour.create({
      data,
      include: {
        kfz: true,
        transportUnternehmer: true,
        route: true,
        _count: { select: { artikelzeilen: true } },
      },
    });

    return res.status(201).json({ data: tour });
  } catch (error: any) {
    console.error("Schnell-Tour:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Tour-Nummer existiert bereits" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
