import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";
import {
  erstelleBorderoPdf,
  erstelleTuAbrechnungPdf,
  erstelleCmrPdf,
  erstelleTourbegleitscheinPdf,
  erstelleLieferscheinPdf,
  CmrData,
  TourbegleitscheinData,
  LieferscheinData,
} from "../services/pdf-generator";

const router = Router();
router.use(requireAuth);

// ============================================================
// GET /api/pdf/bordero/:id — Bordero als PDF
// ============================================================
router.get("/bordero/:id", requireRecht("abfahrt", "lesen"), async (req: Request, res: Response) => {
  try {
    const bordero = await prisma.bordero.findUnique({
      where: { id: req.params.id as string },
      include: {
        abfahrt: {
          include: {
            tour: { select: { tourNummer: true } },
            kfz: { select: { kennzeichen: true } },
            transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
            route: { select: { routennummer: true, beschreibung: true } },
            niederlassung: { select: { name: true, kurzbezeichnung: true } },
          },
        },
        sendungen: {
          include: {
            lieferant: { select: { name: true } },
            werk: { select: { name: true } },
          },
          orderBy: { erstelltAm: "asc" },
        },
      },
    });

    if (!bordero) {
      return res.status(404).json({ error: "Bordero nicht gefunden" });
    }

    if (req.session.niederlassungId && bordero.abfahrt.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    const pdfDoc = erstelleBorderoPdf(bordero);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Bordero-${bordero.borderoNummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF Bordero:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/pdf/tu-abrechnung/:id — TU-Abrechnung als PDF
// ============================================================
router.get("/tu-abrechnung/:id", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const abrechnung = await prisma.tuAbrechnung.findUnique({
      where: { id: req.params.id as string },
      include: {
        transportUnternehmer: true,
        niederlassung: true,
        positionen: {
          orderBy: { tourDatum: "asc" },
        },
      },
    });

    if (!abrechnung) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }

    if (req.session.niederlassungId && abrechnung.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    const pdfDoc = erstelleTuAbrechnungPdf(abrechnung as any);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="TU-Abrechnung-${abrechnung.belegnummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF TU-Abrechnung:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/pdf/cmr/:tourId — CMR-Frachtbrief
// ============================================================
router.get("/cmr/:tourId", requireRecht("tour", "lesen"), async (req: Request, res: Response) => {
  try {
    const tourRaw = await prisma.tour.findUnique({
      where: { id: req.params.tourId as string },
      include: {
        kfz: true,
        transportUnternehmer: true,
        route: { include: { oem: true } },
        niederlassung: true,
        artikelzeilen: {
          include: {
            avis: {
              include: {
                lieferant: true,
                werk: { include: { oem: true } },
              },
            },
          },
        },
      },
    });
    const tour = tourRaw as any;

    if (!tour) {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }

    if (req.session.niederlassungId && tour.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    // Daten für CMR aufbereiten
    const erstesAvis = tour.artikelzeilen[0]?.avis;
    const lieferant = erstesAvis?.lieferant;
    const werk = erstesAvis?.werk;

    const cmrData: CmrData = {
      tourNummer: tour.tourNummer,
      tourDatum: tour.tourDatum,
      absender: {
        name: lieferant?.name || "—",
        adresse: lieferant?.adresse,
        plz: lieferant?.plz,
        ort: lieferant?.ort,
      },
      empfaenger: {
        name: werk?.name || "—",
        adresse: werk?.adresse,
        plz: werk?.plz,
        ort: werk?.ort,
      },
      frachtfuehrer: {
        name: tour.transportUnternehmer?.name || "—",
        adresse: tour.transportUnternehmer?.adresse,
        plz: tour.transportUnternehmer?.plz,
        ort: tour.transportUnternehmer?.ort,
      },
      ortDerUebernahme: lieferant ? `${lieferant.plz || ""} ${lieferant.ort || ""}`.trim() || lieferant.name : "—",
      ortDerAblieferung: werk ? `${werk.plz || ""} ${werk.ort || ""}`.trim() || werk.name : "—",
      gueter: tour.artikelzeilen.map((az) => ({
        beschreibung: az.artikelBeschreibung,
        menge: Number(az.menge),
        masseinheit: az.masseinheit,
        gewicht: Number(az.gewicht || 0),
      })),
      kfzKennzeichen: tour.kfz?.kennzeichen || "—",
      routeBeschreibung: tour.route ? `${tour.route.routennummer} ${tour.route.beschreibung || ""}` : "—",
      niederlassung: tour.niederlassung?.name || "",
    };

    const pdfDoc = erstelleCmrPdf(cmrData);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="CMR-${tour.tourNummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF CMR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/pdf/tourbegleitschein/:id — Tourbegleitschein
// ============================================================
router.get("/tourbegleitschein/:id", requireRecht("tour", "lesen"), async (req: Request, res: Response) => {
  try {
    const tourRaw2 = await prisma.tour.findUnique({
      where: { id: req.params.id as string },
      include: {
        kfz: true,
        transportUnternehmer: true,
        route: true,
        niederlassung: true,
        artikelzeilen: {
          include: {
            avis: {
              include: {
                lieferant: true,
                werk: true,
              },
            },
          },
        },
      },
    });
    const tour = tourRaw2 as any;

    if (!tour) {
      return res.status(404).json({ error: "Tour nicht gefunden" });
    }

    if (req.session.niederlassungId && tour.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    // Artikelzeilen nach Avis gruppieren
    const aviseMap = new Map<string, any>();
    for (const az of tour.artikelzeilen) {
      const key = az.avis.id;
      if (!aviseMap.has(key)) {
        aviseMap.set(key, {
          avisNummer: az.avis.avisNummer,
          lieferant: az.avis.lieferant?.name || "—",
          werk: az.avis.werk?.name || "—",
          zeilen: [],
        });
      }
      aviseMap.get(key).zeilen.push({
        beschreibung: az.artikelBeschreibung,
        menge: Number(az.menge),
        me: az.masseinheit,
        gewicht: Number(az.gewicht || 0),
      });
    }

    const tbData: TourbegleitscheinData = {
      tourNummer: tour.tourNummer,
      tourDatum: tour.tourDatum,
      status: tour.status,
      kfz: tour.kfz?.kennzeichen || "—",
      tu: tour.transportUnternehmer?.kurzbezeichnung || "—",
      route: tour.route?.routennummer || "—",
      routeBeschreibung: tour.route?.beschreibung || "",
      niederlassung: tour.niederlassung?.name || "",
      avise: Array.from(aviseMap.values()),
    };

    const pdfDoc = erstelleTourbegleitscheinPdf(tbData);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Tourbegleitschein-${tour.tourNummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF Tourbegleitschein:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/pdf/lieferschein/:sendungId — Lieferschein
// ============================================================
router.get("/lieferschein/:sendungId", requireRecht("sendung", "lesen"), async (req: Request, res: Response) => {
  try {
    const sendungRaw = await prisma.sendung.findUnique({
      where: { id: req.params.sendungId as string },
      include: {
        lieferant: true,
        werk: true,
        abladestelle: true,
        bordero: true,
        niederlassung: true,
      },
    });
    const sendung = sendungRaw as any;

    if (!sendung) {
      return res.status(404).json({ error: "Sendung nicht gefunden" });
    }

    if (req.session.niederlassungId && sendung.niederlassungId !== req.session.niederlassungId) {
      return res.status(403).json({ error: "Kein Zugriff auf diese Niederlassung" });
    }

    const lsData: LieferscheinData = {
      sendungNummer: sendung.sendungNummer,
      datum: sendung.datum,
      lieferant: {
        name: sendung.lieferant?.name || "—",
        adresse: sendung.lieferant?.adresse,
        plz: sendung.lieferant?.plz,
        ort: sendung.lieferant?.ort,
      },
      werk: {
        name: sendung.werk?.name || "—",
        adresse: sendung.werk?.adresse,
        plz: sendung.werk?.plz,
        ort: sendung.werk?.ort,
      },
      abladestelle: sendung.abladestelle?.name || "",
      gewicht: Number(sendung.gewicht || 0),
      lademeter: Number(sendung.lademeter || 0),
      borderoNummer: sendung.bordero?.borderoNummer || "—",
      niederlassung: sendung.niederlassung?.name || "",
    };

    const pdfDoc = erstelleLieferscheinPdf(lsData);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Lieferschein-${sendung.sendungNummer}.pdf"`);
    pdfDoc.pipe(res);
  } catch (err: any) {
    console.error("PDF Lieferschein:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
