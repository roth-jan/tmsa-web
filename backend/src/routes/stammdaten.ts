import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";

// Generische CRUD-Route für Stammdaten-Tabellen
// Jede Tabelle bekommt: GET (Liste), GET/:id, POST, PUT/:id, DELETE/:id

type ModelName =
  | "niederlassung"
  | "oem"
  | "werk"
  | "lieferant"
  | "abladestelle"
  | "transportUnternehmer"
  | "kfz"
  | "route"
  | "kondition";

interface StammdatenConfig {
  model: ModelName;
  includes?: Record<string, boolean | object>;
  searchFields?: string[];
}

function createStammdatenRouter(config: StammdatenConfig): Router {
  const router = Router();
  const { model, includes, searchFields } = config;

  // GET /api/{model} — Liste
  router.get("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const suche = req.query.suche as string;

      const where: any = { geloeschtAm: null };

      // Textsuche über konfigurierte Felder
      if (suche && searchFields) {
        where.OR = searchFields.map((field) => ({
          [field]: { contains: suche, mode: "insensitive" },
        }));
      }

      const [daten, gesamt] = await Promise.all([
        (prisma as any)[model].findMany({
          where,
          include: includes,
          skip,
          take: limit,
          orderBy: { erstelltAm: "desc" },
        }),
        (prisma as any)[model].count({ where }),
      ]);

      return res.json({
        data: daten,
        pagination: { page, limit, gesamt, seiten: Math.ceil(gesamt / limit) },
      });
    } catch (error) {
      console.error(`${model} Liste:`, error);
      return res.status(500).json({ error: "Serverfehler" });
    }
  });

  // GET /api/{model}/:id — Einzeln
  router.get("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const eintrag = await (prisma as any)[model].findUnique({
        where: { id: req.params.id },
        include: includes,
      });

      if (!eintrag || eintrag.geloeschtAm) {
        return res.status(404).json({ error: "Nicht gefunden" });
      }

      return res.json({ data: eintrag });
    } catch (error) {
      console.error(`${model} Detail:`, error);
      return res.status(500).json({ error: "Serverfehler" });
    }
  });

  // POST /api/{model} — Neu anlegen
  router.post("/", requireAuth, async (req: Request, res: Response) => {
    try {
      const eintrag = await (prisma as any)[model].create({
        data: req.body,
        include: includes,
      });

      return res.status(201).json({ data: eintrag });
    } catch (error: any) {
      console.error(`${model} Erstellen:`, error);
      if (error.code === "P2002") {
        return res.status(409).json({ error: "Eintrag existiert bereits" });
      }
      if (error.code === "P2003") {
        return res.status(400).json({ error: "Ungültige Referenz (FK)" });
      }
      return res.status(500).json({ error: "Serverfehler" });
    }
  });

  // PUT /api/{model}/:id — Bearbeiten
  router.put("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const eintrag = await (prisma as any)[model].update({
        where: { id: req.params.id },
        data: req.body,
        include: includes,
      });

      return res.json({ data: eintrag });
    } catch (error: any) {
      console.error(`${model} Aktualisieren:`, error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Nicht gefunden" });
      }
      return res.status(500).json({ error: "Serverfehler" });
    }
  });

  // DELETE /api/{model}/:id — Soft Delete
  router.delete("/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      await (prisma as any)[model].update({
        where: { id: req.params.id },
        data: { geloeschtAm: new Date() },
      });

      return res.json({ data: { message: "Gelöscht" } });
    } catch (error: any) {
      console.error(`${model} Löschen:`, error);
      if (error.code === "P2025") {
        return res.status(404).json({ error: "Nicht gefunden" });
      }
      return res.status(500).json({ error: "Serverfehler" });
    }
  });

  return router;
}

// Alle Stammdaten-Router exportieren
export const niederlassungRouter = createStammdatenRouter({
  model: "niederlassung",
  searchFields: ["name", "kurzbezeichnung", "ort"],
});

export const oemRouter = createStammdatenRouter({
  model: "oem",
  searchFields: ["name", "kurzbezeichnung"],
});

export const werkRouter = createStammdatenRouter({
  model: "werk",
  includes: { oem: true },
  searchFields: ["name", "werkscode", "ort"],
});

export const lieferantRouter = createStammdatenRouter({
  model: "lieferant",
  searchFields: ["name", "lieferantennummer", "ort"],
});

export const abladestelleRouter = createStammdatenRouter({
  model: "abladestelle",
  includes: { werk: { include: { oem: true } } },
  searchFields: ["name", "entladeZone"],
});

export const transportUnternehmerRouter = createStammdatenRouter({
  model: "transportUnternehmer",
  includes: { niederlassung: true },
  searchFields: ["name", "kurzbezeichnung", "ort"],
});

export const kfzRouter = createStammdatenRouter({
  model: "kfz",
  includes: { transportUnternehmer: true },
  searchFields: ["kennzeichen", "fabrikat"],
});

export const routeRouter = createStammdatenRouter({
  model: "route",
  includes: { oem: true },
  searchFields: ["routennummer", "beschreibung"],
});

export const konditionRouter = createStammdatenRouter({
  model: "kondition",
  includes: { transportUnternehmer: true, route: true },
  searchFields: ["name"],
});
