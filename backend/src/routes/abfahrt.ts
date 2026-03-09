import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

const abfahrtIncludes = {
  kfz: true,
  transportUnternehmer: true,
  route: { include: { oem: true } },
  tour: { select: { tourNummer: true } },
  niederlassung: true,
  _count: { select: { borderos: true } },
};

// GET /api/abfahrten/touren-fuer-abfahrt — Disponierte Touren (für "Abfahrt aus Tour" Dropdown)
// MUSS vor /:id stehen, sonst wird "touren-fuer-abfahrt" als :id interpretiert
router.get("/touren-fuer-abfahrt", requireAuth, requireRecht("abfahrt", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = {
      geloeschtAm: null,
      status: "disponiert",
    };
    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }

    const touren = await prisma.tour.findMany({
      where,
      select: {
        id: true,
        tourNummer: true,
        tourDatum: true,
        kfz: { select: { kennzeichen: true } },
        route: { select: { routennummer: true } },
      },
      orderBy: { tourDatum: "desc" },
    });

    return res.json({ data: touren });
  } catch (error) {
    console.error("Touren für Abfahrt:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/abfahrten — Liste
router.get("/", requireAuth, requireRecht("abfahrt", "lesen"), async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    const where: any = { geloeschtAm: null };
    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }
    if (req.query.datumVon || req.query.datumBis) {
      where.datum = {};
      if (req.query.datumVon) where.datum.gte = new Date(req.query.datumVon as string);
      if (req.query.datumBis) where.datum.lte = new Date(req.query.datumBis as string);
    }

    const [daten, gesamt] = await Promise.all([
      prisma.abfahrt.findMany({
        where,
        include: abfahrtIncludes,
        skip,
        take: limit,
        orderBy: { erstelltAm: "desc" },
      }),
      prisma.abfahrt.count({ where }),
    ]);

    return res.json({
      data: daten,
      pagination: { page, limit, gesamt, seiten: Math.ceil(gesamt / limit) },
    });
  } catch (error) {
    console.error("Abfahrten Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/abfahrten/:id — Detail mit Borderos und Sendungen
router.get("/:id", requireAuth, requireRecht("abfahrt", "lesen"), async (req: Request, res: Response) => {
  try {
    const abfahrt = await prisma.abfahrt.findUnique({
      where: { id: req.params.id },
      include: {
        ...abfahrtIncludes,
        borderos: {
          include: {
            _count: { select: { sendungen: true } },
            sendungen: {
              include: {
                lieferant: { select: { name: true } },
                werk: { select: { name: true } },
              },
            },
          },
          orderBy: { erstelltAm: "asc" },
        },
      },
    });

    if (!abfahrt || abfahrt.geloeschtAm) {
      return res.status(404).json({ error: "Abfahrt nicht gefunden" });
    }

    return res.json({ data: abfahrt });
  } catch (error) {
    console.error("Abfahrt Detail:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/abfahrten — Manuell erstellen
router.post("/", requireAuth, requireRecht("abfahrt", "erstellen"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.datum) data.datum = new Date(data.datum);

    const abfahrt = await prisma.abfahrt.create({
      data,
      include: abfahrtIncludes,
    });

    return res.status(201).json({ data: abfahrt });
  } catch (error: any) {
    console.error("Abfahrt Erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Abfahrt-Nummer existiert bereits" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Ungültige Referenz (FK)" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/abfahrten/aus-tour/:tourId — Abfahrt aus Tour erzeugen
router.post("/aus-tour/:tourId", requireAuth, requireRecht("abfahrt", "erstellen"), async (req: Request, res: Response) => {
  try {
    const tour = await prisma.tour.findUnique({
      where: { id: req.params.tourId },
      include: { route: true },
    });

    if (!tour || tour.geloeschtAm) {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }

    // Abfahrt-Nummer generieren: AF-YYYY-NNN
    const year = new Date().getFullYear();
    const lastAbfahrt = await prisma.abfahrt.findFirst({
      where: { abfahrtNummer: { startsWith: `AF-${year}-` } },
      orderBy: { abfahrtNummer: "desc" },
    });

    let nextNum = 1;
    if (lastAbfahrt) {
      const match = lastAbfahrt.abfahrtNummer.match(/AF-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const abfahrtNummer = `AF-${year}-${String(nextNum).padStart(3, "0")}`;

    const abfahrt = await prisma.abfahrt.create({
      data: {
        abfahrtNummer,
        datum: tour.tourDatum,
        kfzId: tour.kfzId,
        transportUnternehmerId: tour.transportUnternehmerId,
        routeId: tour.routeId,
        tourId: tour.id,
        niederlassungId: tour.niederlassungId,
      },
      include: abfahrtIncludes,
    });

    // Tour-Status → abgefahren
    await prisma.tour.update({
      where: { id: tour.id },
      data: { status: "abgefahren" },
    });

    return res.status(201).json({ data: abfahrt });
  } catch (error: any) {
    console.error("Abfahrt aus Tour:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Abfahrt-Nummer existiert bereits" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/abfahrten/:id — Update
router.put("/:id", requireAuth, requireRecht("abfahrt", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.datum) data.datum = new Date(data.datum);

    const abfahrt = await prisma.abfahrt.update({
      where: { id: req.params.id },
      data,
      include: abfahrtIncludes,
    });

    return res.json({ data: abfahrt });
  } catch (error: any) {
    console.error("Abfahrt Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Abfahrt nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/abfahrten/:id — Soft-Delete
router.delete("/:id", requireAuth, requireRecht("abfahrt", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.abfahrt.update({
      where: { id: req.params.id },
      data: { geloeschtAm: new Date() },
    });

    return res.json({ data: { message: "Abfahrt gelöscht" } });
  } catch (error: any) {
    console.error("Abfahrt Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Abfahrt nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/abfahrten/:id/borderos — Bordero hinzufügen
router.post("/:id/borderos", requireAuth, requireRecht("abfahrt", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const abfahrt = await prisma.abfahrt.findUnique({ where: { id: req.params.id } });
    if (!abfahrt || abfahrt.geloeschtAm) {
      return res.status(404).json({ error: "Abfahrt nicht gefunden" });
    }

    // Bordero-Nummer generieren: B-YYYY-NNN
    const year = new Date().getFullYear();
    const lastBordero = await prisma.bordero.findFirst({
      where: { borderoNummer: { startsWith: `B-${year}-` } },
      orderBy: { borderoNummer: "desc" },
    });

    let nextNum = 1;
    if (lastBordero) {
      const match = lastBordero.borderoNummer.match(/B-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    const borderoNummer = `B-${year}-${String(nextNum).padStart(3, "0")}`;

    const data: any = {
      borderoNummer,
      abfahrtId: req.params.id,
    };
    if (req.body.gewicht !== undefined) data.gewicht = Number(req.body.gewicht);
    if (req.body.lademeter !== undefined) data.lademeter = Number(req.body.lademeter);
    if (req.body.bemerkung) data.bemerkung = req.body.bemerkung;

    const bordero = await prisma.bordero.create({
      data,
      include: { _count: { select: { sendungen: true } } },
    });

    return res.status(201).json({ data: bordero });
  } catch (error: any) {
    console.error("Bordero Erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Bordero-Nummer existiert bereits" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/abfahrten/:abfahrtId/borderos/:borderoId — Bordero bearbeiten
router.put("/:abfahrtId/borderos/:borderoId", requireAuth, requireRecht("abfahrt", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const data: any = {};
    if (req.body.gewicht !== undefined) data.gewicht = Number(req.body.gewicht);
    if (req.body.lademeter !== undefined) data.lademeter = Number(req.body.lademeter);
    if (req.body.bemerkung !== undefined) data.bemerkung = req.body.bemerkung;
    if (req.body.status) data.status = req.body.status;

    const bordero = await prisma.bordero.update({
      where: { id: req.params.borderoId },
      data,
      include: { _count: { select: { sendungen: true } } },
    });

    return res.json({ data: bordero });
  } catch (error: any) {
    console.error("Bordero Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Bordero nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/abfahrten/:abfahrtId/borderos/:borderoId — Bordero löschen
router.delete("/:abfahrtId/borderos/:borderoId", requireAuth, requireRecht("abfahrt", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    // Sendungen aus Bordero entfernen
    await prisma.sendung.updateMany({
      where: { borderoId: req.params.borderoId },
      data: { borderoId: null, status: 0 },
    });

    await prisma.bordero.delete({
      where: { id: req.params.borderoId },
    });

    return res.json({ data: { message: "Bordero gelöscht" } });
  } catch (error: any) {
    console.error("Bordero Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Bordero nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
