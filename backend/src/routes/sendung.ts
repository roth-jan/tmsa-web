import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

const sendungIncludes = {
  bordero: { select: { borderoNummer: true } },
  oem: { select: { name: true, kurzbezeichnung: true } },
  werk: { select: { name: true } },
  lieferant: { select: { name: true } },
  abladestelle: { select: { name: true } },
  niederlassung: { select: { name: true } },
};

// GET /api/sendungen — Liste
router.get("/", requireAuth, requireRecht("sendung", "lesen"), async (req: Request, res: Response) => {
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
    if (req.query.status !== undefined) {
      where.status = parseInt(req.query.status as string);
    }
    if (req.query.richtungsArt) {
      where.richtungsArt = req.query.richtungsArt as string;
    }
    if (req.query.borderoId) {
      where.borderoId = req.query.borderoId as string;
    }

    const [daten, gesamt] = await Promise.all([
      prisma.sendung.findMany({
        where,
        include: sendungIncludes,
        skip,
        take: limit,
        orderBy: { erstelltAm: "desc" },
      }),
      prisma.sendung.count({ where }),
    ]);

    return res.json({
      data: daten,
      pagination: { page, limit, gesamt, seiten: Math.ceil(gesamt / limit) },
    });
  } catch (error) {
    console.error("Sendungen Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/sendungen/:id — Detail
router.get("/:id", requireAuth, requireRecht("sendung", "lesen"), async (req: Request, res: Response) => {
  try {
    const sendung = await prisma.sendung.findUnique({
      where: { id: req.params.id },
      include: sendungIncludes,
    });

    if (!sendung || sendung.geloeschtAm) {
      return res.status(404).json({ error: "Sendung nicht gefunden" });
    }

    return res.json({ data: sendung });
  } catch (error) {
    console.error("Sendung Detail:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/sendungen — Manuell erstellen
router.post("/", requireAuth, requireRecht("sendung", "erstellen"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.datum) data.datum = new Date(data.datum);
    if (data.gewicht !== undefined) data.gewicht = Number(data.gewicht);
    if (data.lademeter !== undefined) data.lademeter = Number(data.lademeter);

    // Sendung-Nummer generieren
    const year = new Date().getFullYear();
    const lastSendung = await prisma.sendung.findFirst({
      where: { sendungNummer: { startsWith: `S-${year}-` } },
      orderBy: { sendungNummer: "desc" },
    });

    let nextNum = 1;
    if (lastSendung) {
      const match = lastSendung.sendungNummer.match(/S-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }
    data.sendungNummer = `S-${year}-${String(nextNum).padStart(3, "0")}`;

    const sendung = await prisma.sendung.create({
      data,
      include: sendungIncludes,
    });

    return res.status(201).json({ data: sendung });
  } catch (error: any) {
    console.error("Sendung Erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Sendung-Nummer existiert bereits" });
    }
    if (error.code === "P2003") {
      return res.status(400).json({ error: "Ungültige Referenz (FK)" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/sendungen/aus-artikelzeilen — Sendungsbildung
router.post("/aus-artikelzeilen", requireAuth, requireRecht("sendung", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { artikelzeilenIds, borderoId, richtungsArt } = req.body;

    if (!artikelzeilenIds?.length) {
      return res.status(400).json({ error: "Keine Artikelzeilen angegeben" });
    }

    // Artikelzeilen laden mit Avis-Daten (Lieferant, Werk)
    const zeilen = await prisma.artikelzeile.findMany({
      where: { id: { in: artikelzeilenIds } },
      include: {
        avis: {
          select: {
            lieferantId: true,
            werkId: true,
            niederlassungId: true,
            lieferant: { select: { name: true } },
            werk: { select: { name: true, oemId: true } },
          },
        },
      },
    });

    if (zeilen.length === 0) {
      return res.status(400).json({ error: "Keine gültigen Artikelzeilen gefunden" });
    }

    // Gruppierung nach Lieferant+Werk
    const gruppen = new Map<string, typeof zeilen>();
    for (const zeile of zeilen) {
      const key = `${zeile.avis.lieferantId}__${zeile.avis.werkId}`;
      if (!gruppen.has(key)) gruppen.set(key, []);
      gruppen.get(key)!.push(zeile);
    }

    // Pro Gruppe eine Sendung erzeugen
    const year = new Date().getFullYear();
    const lastSendung = await prisma.sendung.findFirst({
      where: { sendungNummer: { startsWith: `S-${year}-` } },
      orderBy: { sendungNummer: "desc" },
    });
    let nextNum = 1;
    if (lastSendung) {
      const match = lastSendung.sendungNummer.match(/S-\d{4}-(\d+)/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    const erstellteSendungen: any[] = [];

    for (const [, gruppenZeilen] of gruppen) {
      const ersteZeile = gruppenZeilen[0];
      const gesamtGewicht = gruppenZeilen.reduce(
        (sum, z) => sum + (z.gewicht ? Number(z.gewicht) : 0),
        0
      );

      const sendungNummer = `S-${year}-${String(nextNum).padStart(3, "0")}`;
      nextNum++;

      const sendung = await prisma.sendung.create({
        data: {
          sendungNummer,
          datum: new Date(),
          richtungsArt: richtungsArt || "WE",
          borderoId: borderoId || null,
          lieferantId: ersteZeile.avis.lieferantId,
          werkId: ersteZeile.avis.werkId,
          oemId: ersteZeile.avis.werk.oemId,
          niederlassungId: ersteZeile.avis.niederlassungId,
          gewicht: gesamtGewicht || null,
          status: borderoId ? 1 : 0,
        },
        include: sendungIncludes,
      });

      erstellteSendungen.push(sendung);
    }

    return res.status(201).json({
      data: erstellteSendungen,
      message: `${erstellteSendungen.length} Sendung(en) erstellt`,
    });
  } catch (error) {
    console.error("Sendungsbildung:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/sendungen/:id — Update
router.put("/:id", requireAuth, requireRecht("sendung", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const data = { ...req.body };
    if (data.datum) data.datum = new Date(data.datum);
    if (data.gewicht !== undefined) data.gewicht = Number(data.gewicht);
    if (data.lademeter !== undefined) data.lademeter = Number(data.lademeter);

    const sendung = await prisma.sendung.update({
      where: { id: req.params.id },
      data,
      include: sendungIncludes,
    });

    return res.json({ data: sendung });
  } catch (error: any) {
    console.error("Sendung Aktualisieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Sendung nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/sendungen/:id — Soft-Delete
router.delete("/:id", requireAuth, requireRecht("sendung", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.sendung.update({
      where: { id: req.params.id },
      data: { geloeschtAm: new Date(), status: 2 },
    });

    return res.json({ data: { message: "Sendung gelöscht" } });
  } catch (error: any) {
    console.error("Sendung Löschen:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Sendung nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/sendungen/:id/borderieren — Sendung einem Bordero zuweisen
router.post("/:id/borderieren", requireAuth, requireRecht("sendung", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { borderoId } = req.body;
    if (!borderoId) {
      return res.status(400).json({ error: "borderoId erforderlich" });
    }

    const sendung = await prisma.sendung.update({
      where: { id: req.params.id },
      data: { borderoId, status: 1 },
      include: sendungIncludes,
    });

    return res.json({ data: sendung });
  } catch (error: any) {
    console.error("Sendung borderieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Sendung nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
