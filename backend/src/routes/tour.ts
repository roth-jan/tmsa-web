import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

const tourIncludes = {
  kfz: true,
  transportUnternehmer: true,
  kondition: true,
  route: { include: { oem: true } },
  niederlassung: true,
  _count: { select: { artikelzeilen: true } },
};

// GET /api/touren — Liste mit Artikelzeilen-Count
router.get("/", requireAuth, requireRecht("tour", "lesen"), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const suche = req.query.suche as string;

    const where: any = { geloeschtAm: null };
    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }
    if (suche) {
      where.OR = [
        { tourNummer: { contains: suche, mode: "insensitive" } },
      ];
    }
    // Optional: Datum-Filter
    if (req.query.datumVon || req.query.datumBis) {
      where.tourDatum = {};
      if (req.query.datumVon) where.tourDatum.gte = new Date(req.query.datumVon as string);
      if (req.query.datumBis) where.tourDatum.lte = new Date(req.query.datumBis as string);
    }

    const [daten, gesamt] = await Promise.all([
      prisma.tour.findMany({
        where,
        include: tourIncludes,
        skip,
        take: limit,
        orderBy: { erstelltAm: "desc" },
      }),
      prisma.tour.count({ where }),
    ]);

    return res.json({
      data: daten,
      pagination: { page, limit, gesamt, seiten: Math.ceil(gesamt / limit) },
    });
  } catch (error) {
    console.error("Touren Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/touren/:id — Tour mit zugewiesenen Artikelzeilen
router.get("/:id", requireAuth, requireRecht("tour", "lesen"), async (req: Request, res: Response) => {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: req.params.id },
      include: {
        ...tourIncludes,
        artikelzeilen: {
          include: {
            avis: { select: { avisNummer: true, lieferant: { select: { name: true } } } },
          },
          orderBy: { erstelltAm: "asc" },
        },
      },
    });

    if (!tour || tour.geloeschtAm) {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }

    return res.json({ data: tour });
  } catch (error) {
    console.error("Tour Detail:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/touren — Neue Tour erstellen
router.post("/", requireAuth, requireRecht("tour", "erstellen"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.tourDatum) data.tourDatum = new Date(data.tourDatum);
    if (data.leerKilometer) data.leerKilometer = Number(data.leerKilometer);
    if (data.lastKilometer) data.lastKilometer = Number(data.lastKilometer);
    if (data.mautKilometer) data.mautKilometer = Number(data.mautKilometer);
    if (data.kostenKondition) data.kostenKondition = Number(data.kostenKondition);
    if (data.kostenManuell) data.kostenManuell = Number(data.kostenManuell);

    const tour = await prisma.tour.create({
      data,
      include: tourIncludes,
    });

    return res.status(201).json({ data: tour });
  } catch (error: any) {
    console.error("Tour Erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Tour-Nummer existiert bereits" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Ungültige Referenz (FK)" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/touren/:id — Tour-Header updaten
router.put("/:id", requireAuth, requireRecht("tour", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.tourDatum) data.tourDatum = new Date(data.tourDatum);

    const tour = await prisma.tour.update({
      where: { id: req.params.id },
      data,
      include: tourIncludes,
    });

    return res.json({ data: tour });
  } catch (error: any) {
    console.error("Tour Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/touren/:id — Soft-Delete
router.delete("/:id", requireAuth, requireRecht("tour", "loeschen"), async (req: Request, res: Response) => {
  try {
    // Zuerst alle Artikelzeilen dieser Tour zurücksetzen
    await prisma.artikelzeile.updateMany({
      where: { tourId: req.params.id },
      data: { tourId: null, status: 0 },
    });

    await prisma.tour.update({
      where: { id: req.params.id },
      data: { geloeschtAm: new Date() },
    });

    return res.json({ data: { message: "Tour gelöscht" } });
  } catch (error: any) {
    console.error("Tour Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/touren/:id/zuweisen — Artikelzeilen zuweisen
router.post("/:id/zuweisen", requireAuth, requireRecht("tour", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { zeilenIds } = req.body;
    if (!zeilenIds?.length) {
      return res.status(400).json({ error: "Keine Zeilen angegeben" });
    }

    await prisma.artikelzeile.updateMany({
      where: { id: { in: zeilenIds }, status: 0 },
      data: { tourId: req.params.id, status: 1 },
    });

    return res.json({ data: { message: `${zeilenIds.length} Zeilen zugewiesen` } });
  } catch (error) {
    console.error("Zeilen zuweisen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/touren/:id/entfernen — Artikelzeilen zurücknehmen
router.post("/:id/entfernen", requireAuth, requireRecht("tour", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { zeilenIds } = req.body;
    if (!zeilenIds?.length) {
      return res.status(400).json({ error: "Keine Zeilen angegeben" });
    }

    await prisma.artikelzeile.updateMany({
      where: { id: { in: zeilenIds }, tourId: req.params.id },
      data: { tourId: null, status: 0 },
    });

    return res.json({ data: { message: `${zeilenIds.length} Zeilen entfernt` } });
  } catch (error) {
    console.error("Zeilen entfernen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
