import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import prisma from "../db";

const router = Router();

// GET /api/dashboard/kennzahlen — Alle KPIs in einem Request
router.get("/kennzahlen", requireAuth, async (req: Request, res: Response) => {
  try {
    const nlFilter: any = { geloeschtAm: null };
    if (req.session.niederlassungId) {
      nlFilter.niederlassungId = req.session.niederlassungId;
    }

    const heute = new Date();
    heute.setHours(0, 0, 0, 0);
    const morgen = new Date(heute);
    morgen.setDate(morgen.getDate() + 1);

    const monatsAnfang = new Date(heute.getFullYear(), heute.getMonth(), 1);
    const monatsEnde = new Date(heute.getFullYear(), heute.getMonth() + 1, 1);

    const nlFilterAvis: any = { geloeschtAm: null };
    if (req.session.niederlassungId) {
      nlFilterAvis.niederlassungId = req.session.niederlassungId;
    }

    const [
      offeneZeilen,
      tourenHeute,
      tourenOffen,
      tourenDisponiert,
      tourenAbgefahren,
      tourenAbgeschlossen,
      tourenGebrochen,
      aviseOffen,
      abfahrtenHeute,
      sendungenHeute,
      abrechnungenOffen,
      kostenMonatAgg,
      letzteTouren,
    ] = await Promise.all([
      // Offene Artikelzeilen (status=0, keine Tour)
      prisma.artikelzeile.count({
        where: {
          status: 0,
          tourId: null,
          avis: nlFilter,
        },
      }),
      // Touren heute
      prisma.tour.count({
        where: {
          ...nlFilter,
          tourDatum: { gte: heute, lt: morgen },
        },
      }),
      // Touren nach Status
      prisma.tour.count({ where: { ...nlFilter, status: "offen" } }),
      prisma.tour.count({ where: { ...nlFilter, status: "disponiert" } }),
      prisma.tour.count({ where: { ...nlFilter, status: "abgefahren" } }),
      prisma.tour.count({ where: { ...nlFilter, status: "abgeschlossen" } }),
      // Gebrochene Touren
      prisma.tour.count({ where: { ...nlFilter, istGebrochen: true } }),
      // Offene Avise
      prisma.avis.count({ where: { ...nlFilterAvis, status: "offen" } }),
      // Abfahrten heute
      prisma.abfahrt.count({
        where: {
          ...nlFilter,
          datum: { gte: heute, lt: morgen },
        },
      }),
      // Sendungen heute
      prisma.sendung.count({
        where: {
          ...nlFilter,
          datum: { gte: heute, lt: morgen },
        },
      }),
      // Offene Abrechnungen
      prisma.tuAbrechnung.count({ where: { ...nlFilter, status: "offen" } }),
      // Kosten aktueller Monat
      prisma.tour.aggregate({
        where: {
          ...nlFilter,
          tourDatum: { gte: monatsAnfang, lt: monatsEnde },
        },
        _sum: { kostenKondition: true },
      }),
      // Letzte 5 Touren
      prisma.tour.findMany({
        where: nlFilter,
        include: {
          kfz: true,
          transportUnternehmer: true,
          route: { include: { oem: true } },
          niederlassung: true,
        },
        orderBy: { erstelltAm: "desc" },
        take: 5,
      }),
    ]);

    return res.json({
      data: {
        offeneZeilen,
        tourenHeute,
        tourenOffen,
        tourenDisponiert,
        tourenAbgefahren,
        tourenAbgeschlossen,
        tourenGebrochen,
        aviseOffen,
        abfahrtenHeute,
        sendungenHeute,
        abrechnungenOffen,
        kostenMonat: Number(kostenMonatAgg._sum.kostenKondition || 0),
        letzteTouren,
      },
    });
  } catch (error) {
    console.error("Dashboard Kennzahlen:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
