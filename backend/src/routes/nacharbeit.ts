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

// GET /api/nacharbeit/touren — Touren für Nacharbeit (mit Nacharbeit-Feldern)
router.get("/touren", requireAuth, requireRecht("nacharbeit", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = { geloeschtAm: null };

    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }

    // Datum-Filter
    if (req.query.datumVon || req.query.datumBis) {
      where.tourDatum = {};
      if (req.query.datumVon) where.tourDatum.gte = new Date(req.query.datumVon as string);
      if (req.query.datumBis) where.tourDatum.lte = new Date(req.query.datumBis as string);
    }

    // Status-Filter
    if (req.query.status) {
      where.status = req.query.status as string;
    }

    // Nur offene (nicht abgerechnete)
    if (req.query.nurOffene === "true") {
      where.abrechnungsStatus = { lt: 3 };
    }

    const touren = await prisma.tour.findMany({
      where,
      include: tourIncludes,
      orderBy: { tourDatum: "desc" },
    });

    return res.json({ data: touren });
  } catch (error) {
    console.error("Nacharbeit Touren:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PATCH /api/nacharbeit/tour/:id — Tour-Felder inline updaten
router.patch("/tour/:id", requireAuth, requireRecht("nacharbeit", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    // Prüfen ob Tour existiert und nicht abgerechnet
    const existing = await prisma.tour.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.geloeschtAm) {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }
    if (existing.abrechnungsStatus >= 3) {
      return res.status(400).json({ error: "Abgerechnete Tour kann nicht bearbeitet werden" });
    }

    // Nur erlaubte Felder
    const erlaubteFelder = [
      "kfzId", "transportUnternehmerId", "konditionId",
      "leerKilometer", "lastKilometer", "mautKilometer",
      "quittung", "quittungDatum", "istLeerfahrt",
      "abrechnungsStopp", "bemerkungIntern", "bemerkungExtern",
      "bemerkungAbrechnung",
    ];

    const data: any = {};
    for (const feld of erlaubteFelder) {
      if (req.body[feld] !== undefined) {
        data[feld] = req.body[feld];
      }
    }

    // Typ-Konvertierungen
    if (data.leerKilometer !== undefined) data.leerKilometer = Number(data.leerKilometer);
    if (data.lastKilometer !== undefined) data.lastKilometer = Number(data.lastKilometer);
    if (data.mautKilometer !== undefined) data.mautKilometer = Number(data.mautKilometer);
    if (data.quittungDatum !== undefined && data.quittungDatum) {
      data.quittungDatum = new Date(data.quittungDatum);
    }

    const tour = await prisma.tour.update({
      where: { id: req.params.id },
      data,
      include: tourIncludes,
    });

    return res.json({ data: tour });
  } catch (error: any) {
    console.error("Nacharbeit Tour Update:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/nacharbeit/quittung-setzen — Bulk-Quittung
router.post("/quittung-setzen", requireAuth, requireRecht("nacharbeit", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { tourIds, quittungDatum } = req.body;
    if (!tourIds?.length) {
      return res.status(400).json({ error: "Keine Touren angegeben" });
    }

    const datum = quittungDatum ? new Date(quittungDatum) : new Date();

    const result = await prisma.tour.updateMany({
      where: {
        id: { in: tourIds },
        geloeschtAm: null,
        abrechnungsStatus: { lt: 3 },
      },
      data: {
        quittung: true,
        quittungDatum: datum,
      },
    });

    return res.json({ data: { aktualisiert: result.count } });
  } catch (error) {
    console.error("Quittung setzen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
