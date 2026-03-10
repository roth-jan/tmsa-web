import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";
import {
  tourBrechen,
  abschnittAktualisieren,
  tourZusammenfuehren,
} from "../services/gebrochene-verkehre";

const router = Router();

// GET /api/gebrochene-verkehre/touren/:id/abschnitte — Abschnitte einer Tour
router.get(
  "/touren/:id/abschnitte",
  requireAuth,
  requireRecht("gebrocheneverkehre", "lesen"),
  async (req: Request, res: Response) => {
    try {
      const abschnitte = await prisma.streckenabschnitt.findMany({
        where: { tourId: req.params.id },
        orderBy: { reihenfolge: "asc" },
        include: {
          umschlagPunkt: true,
          route: true,
          transportUnternehmer: true,
          kfz: true,
          kondition: true,
        },
      });
      return res.json({ data: abschnitte });
    } catch (error) {
      console.error("Abschnitte laden:", error);
      return res.status(500).json({ error: "Serverfehler" });
    }
  }
);

// POST /api/gebrochene-verkehre/touren/:id/brechen — Tour brechen
router.post(
  "/touren/:id/brechen",
  requireAuth,
  requireRecht("gebrocheneverkehre", "bearbeiten"),
  async (req: Request, res: Response) => {
    try {
      const { abschnitte } = req.body;
      if (!abschnitte?.length) {
        return res.status(400).json({ error: "Abschnitte erforderlich" });
      }
      const result = await tourBrechen(req.params.id, abschnitte);
      return res.json({ data: result });
    } catch (error: any) {
      console.error("Tour brechen:", error);
      return res.status(400).json({ error: error.message });
    }
  }
);

// PUT /api/gebrochene-verkehre/abschnitte/:id — Abschnitt bearbeiten
router.put(
  "/abschnitte/:id",
  requireAuth,
  requireRecht("gebrocheneverkehre", "bearbeiten"),
  async (req: Request, res: Response) => {
    try {
      const result = await abschnittAktualisieren(req.params.id, req.body);
      return res.json({ data: result });
    } catch (error: any) {
      console.error("Abschnitt aktualisieren:", error);
      return res.status(400).json({ error: error.message });
    }
  }
);

// DELETE /api/gebrochene-verkehre/touren/:id/zusammenfuehren — Brechung aufheben
router.delete(
  "/touren/:id/zusammenfuehren",
  requireAuth,
  requireRecht("gebrocheneverkehre", "bearbeiten"),
  async (req: Request, res: Response) => {
    try {
      const result = await tourZusammenfuehren(req.params.id);
      return res.json({ data: result });
    } catch (error: any) {
      console.error("Tour zusammenführen:", error);
      return res.status(400).json({ error: error.message });
    }
  }
);

// GET /api/gebrochene-verkehre/umschlag-punkte — USP-Liste für Dropdown
router.get(
  "/umschlag-punkte",
  requireAuth,
  requireRecht("gebrocheneverkehre", "lesen"),
  async (req: Request, res: Response) => {
    try {
      const where: any = { geloeschtAm: null, aktiv: true };
      if (req.session.niederlassungId) {
        where.niederlassungId = req.session.niederlassungId;
      }
      const usps = await prisma.umschlagPunkt.findMany({
        where,
        orderBy: { name: "asc" },
      });
      return res.json({ data: usps });
    } catch (error) {
      console.error("USP Liste:", error);
      return res.status(500).json({ error: "Serverfehler" });
    }
  }
);

export default router;
