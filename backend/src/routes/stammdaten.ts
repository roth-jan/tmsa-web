import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
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
  | "kondition"
  | "dispoOrt"
  | "dispoRegel"
  | "umschlagPunkt";

interface StammdatenConfig {
  model: ModelName;
  modul: string; // Rechte-Modul (z.B. "werk", "tu")
  includes?: Record<string, boolean | object>;
  searchFields?: string[];
  /** Feld für NL-Filter, z.B. "niederlassungId" */
  nlFilterField?: string;
  /** NL-Filter über Relation, z.B. { transportUnternehmer: { niederlassungId: X } } */
  nlFilterRelation?: string;
}

function createStammdatenRouter(config: StammdatenConfig): Router {
  const router = Router();
  const { model, modul, includes, searchFields, nlFilterField, nlFilterRelation } = config;

  // NL-Filter in where-Clause einbauen
  function addNlFilter(where: any, niederlassungId: string | null) {
    if (!niederlassungId) return;
    if (nlFilterField) {
      where[nlFilterField] = niederlassungId;
    } else if (nlFilterRelation) {
      where[nlFilterRelation] = { niederlassungId };
    }
  }

  // GET /api/{model} — Liste (braucht modul.lesen)
  router.get("/", requireAuth, requireRecht(modul, "lesen"), async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = (page - 1) * limit;
      const suche = req.query.suche as string;

      const where: any = { geloeschtAm: null };
      addNlFilter(where, req.session.niederlassungId ?? null);

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
  router.get("/:id", requireAuth, requireRecht(modul, "lesen"), async (req: Request, res: Response) => {
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

  // POST /api/{model} — Neu anlegen (braucht modul.erstellen)
  router.post("/", requireAuth, requireRecht(modul, "erstellen"), async (req: Request, res: Response) => {
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

  // PUT /api/{model}/:id — Bearbeiten (braucht modul.bearbeiten)
  router.put("/:id", requireAuth, requireRecht(modul, "bearbeiten"), async (req: Request, res: Response) => {
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

  // DELETE /api/{model}/:id — Soft Delete (braucht modul.loeschen)
  router.delete("/:id", requireAuth, requireRecht(modul, "loeschen"), async (req: Request, res: Response) => {
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
// Globale Daten (kein NL-Filter): niederlassung, oem, werk, lieferant, abladestelle, route
// NL-gefiltert: tu, kfz, kondition

export const niederlassungRouter = createStammdatenRouter({
  model: "niederlassung",
  modul: "niederlassung",
  searchFields: ["name", "kurzbezeichnung", "ort"],
});

export const oemRouter = createStammdatenRouter({
  model: "oem",
  modul: "oem",
  searchFields: ["name", "kurzbezeichnung"],
});

export const werkRouter = createStammdatenRouter({
  model: "werk",
  modul: "werk",
  includes: { oem: true },
  searchFields: ["name", "werkscode", "ort"],
});

export const lieferantRouter = createStammdatenRouter({
  model: "lieferant",
  modul: "lieferant",
  searchFields: ["name", "lieferantennummer", "ort"],
});

export const abladestelleRouter = createStammdatenRouter({
  model: "abladestelle",
  modul: "abladestelle",
  includes: { werk: { include: { oem: true } } },
  searchFields: ["name", "entladeZone"],
});

export const transportUnternehmerRouter = createStammdatenRouter({
  model: "transportUnternehmer",
  modul: "tu",
  includes: { niederlassung: true },
  searchFields: ["name", "kurzbezeichnung", "ort"],
  nlFilterField: "niederlassungId",
});

export const kfzRouter = createStammdatenRouter({
  model: "kfz",
  modul: "kfz",
  includes: { transportUnternehmer: true },
  searchFields: ["kennzeichen", "fabrikat"],
  nlFilterRelation: "transportUnternehmer",
});

export const routeRouter = createStammdatenRouter({
  model: "route",
  modul: "route",
  includes: { oem: true },
  searchFields: ["routennummer", "beschreibung"],
});

export const konditionRouter = createStammdatenRouter({
  model: "kondition",
  modul: "kondition",
  includes: { transportUnternehmer: true, route: true },
  searchFields: ["name"],
  nlFilterRelation: "transportUnternehmer",
});

export const dispoOrtRouter = createStammdatenRouter({
  model: "dispoOrt",
  modul: "dispoort",
  includes: { werk: true, niederlassung: true },
  searchFields: ["bezeichnung", "ort", "plz"],
  nlFilterField: "niederlassungId",
});

export const dispoRegelRouter = createStammdatenRouter({
  model: "dispoRegel",
  modul: "disporegel",
  includes: { niederlassung: true },
  searchFields: ["bezeichnung", "regeltyp"],
  nlFilterField: "niederlassungId",
});

export const umschlagPunktRouter = createStammdatenRouter({
  model: "umschlagPunkt",
  modul: "umschlagpunkt",
  includes: { niederlassung: true },
  searchFields: ["name", "kurzbezeichnung", "ort"],
  nlFilterField: "niederlassungId",
});
