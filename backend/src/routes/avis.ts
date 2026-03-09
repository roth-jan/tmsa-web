import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

const avisIncludes = {
  lieferant: true,
  werk: { include: { oem: true } },
  abladestelle: true,
  route: true,
  niederlassung: true,
  _count: { select: { artikelzeilen: true } },
};

// GET /api/avise — Liste mit Artikelzeilen-Count, NL-gefiltert
router.get("/", requireAuth, requireRecht("avis", "lesen"), async (req: Request, res: Response) => {
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
        { avisNummer: { contains: suche, mode: "insensitive" } },
        { lieferant: { name: { contains: suche, mode: "insensitive" } } },
        { werk: { name: { contains: suche, mode: "insensitive" } } },
      ];
    }

    const [daten, gesamt] = await Promise.all([
      prisma.avis.findMany({
        where,
        include: avisIncludes,
        skip,
        take: limit,
        orderBy: { erstelltAm: "desc" },
      }),
      prisma.avis.count({ where }),
    ]);

    return res.json({
      data: daten,
      pagination: { page, limit, gesamt, seiten: Math.ceil(gesamt / limit) },
    });
  } catch (error) {
    console.error("Avise Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/avise/:id — Einzelnes Avis mit allen Artikelzeilen
router.get("/:id", requireAuth, requireRecht("avis", "lesen"), async (req: Request, res: Response) => {
  try {
    const avis = await prisma.avis.findUnique({
      where: { id: req.params.id },
      include: {
        ...avisIncludes,
        artikelzeilen: {
          orderBy: { erstelltAm: "asc" },
          include: { tour: true },
        },
      },
    });

    if (!avis || avis.geloeschtAm) {
      return res.status(404).json({ error: "Avis nicht gefunden" });
    }

    return res.json({ data: avis });
  } catch (error) {
    console.error("Avis Detail:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/avise — Erstellen mit verschachtelten Artikelzeilen
router.post("/", requireAuth, requireRecht("avis", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { artikelzeilen, ...avisData } = req.body;

    const avis = await prisma.avis.create({
      data: {
        ...avisData,
        ladeDatum: new Date(avisData.ladeDatum),
        artikelzeilen: artikelzeilen?.length
          ? { create: artikelzeilen }
          : undefined,
      },
      include: {
        ...avisIncludes,
        artikelzeilen: true,
      },
    });

    return res.status(201).json({ data: avis });
  } catch (error: any) {
    console.error("Avis Erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Avis-Nummer existiert bereits" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Ungültige Referenz (FK)" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/avise/:id — Header-Felder updaten
router.put("/:id", requireAuth, requireRecht("avis", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { artikelzeilen, ...avisData } = req.body;
    if (avisData.ladeDatum) {
      avisData.ladeDatum = new Date(avisData.ladeDatum);
    }

    const avis = await prisma.avis.update({
      where: { id: req.params.id },
      data: avisData,
      include: avisIncludes,
    });

    return res.json({ data: avis });
  } catch (error: any) {
    console.error("Avis Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Avis nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/avise/:id — Soft-Delete
router.delete("/:id", requireAuth, requireRecht("avis", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.avis.update({
      where: { id: req.params.id },
      data: { geloeschtAm: new Date(), status: "storniert" },
    });

    return res.json({ data: { message: "Avis gelöscht" } });
  } catch (error: any) {
    console.error("Avis Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Avis nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/avise/:id/zeilen — Artikelzeile hinzufügen
router.post("/:id/zeilen", requireAuth, requireRecht("avis", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const zeile = await prisma.artikelzeile.create({
      data: {
        ...req.body,
        avisId: req.params.id,
      },
    });

    return res.status(201).json({ data: zeile });
  } catch (error: any) {
    console.error("Artikelzeile Erstellen:", error);
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Avis nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/avise/:avisId/zeilen/:zeilenId — Einzelne Zeile bearbeiten
router.put("/:avisId/zeilen/:zeilenId", requireAuth, requireRecht("avis", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const zeile = await prisma.artikelzeile.update({
      where: { id: req.params.zeilenId },
      data: req.body,
    });

    return res.json({ data: zeile });
  } catch (error: any) {
    console.error("Artikelzeile Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Artikelzeile nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/avise/:avisId/zeilen/:zeilenId — Zeile löschen
router.delete("/:avisId/zeilen/:zeilenId", requireAuth, requireRecht("avis", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.artikelzeile.delete({
      where: { id: req.params.zeilenId },
    });

    return res.json({ data: { message: "Artikelzeile gelöscht" } });
  } catch (error: any) {
    console.error("Artikelzeile Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Artikelzeile nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
