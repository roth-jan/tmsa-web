import { Router, Request, Response } from "express";
import prisma from "../db";
import { requireAuth, requireRecht } from "../middleware/auth";
import { berechneKosten, findeKondition } from "../services/konditionsberechnung";
import { sendAbrechnungMail } from "../services/mail";

const router = Router();
router.use(requireAuth);

// ============================================================
// POST /vorschau — Trockenlauf (Preview ohne Speichern)
// ============================================================
router.post("/vorschau", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, nurTuId, nurRouteId } = req.body;
    if (!datumVon || !datumBis) {
      return res.status(400).json({ error: "datumVon und datumBis sind Pflicht" });
    }

    const where: any = {
      abrechnungsStatus: 0,
      abrechnungsStopp: false,
      geloeschtAm: null,
      tourDatum: {
        gte: new Date(datumVon),
        lte: new Date(datumBis),
      },
    };
    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }
    if (nurTuId) where.transportUnternehmerId = nurTuId;
    if (nurRouteId) where.routeId = nurRouteId;

    const touren = await prisma.tour.findMany({
      where,
      include: {
        kfz: true,
        transportUnternehmer: true,
        kondition: true,
        route: true,
        niederlassung: true,
        _count: { select: { artikelzeilen: true } },
      },
      orderBy: { tourDatum: "asc" },
    });

    const ergebnisse = [];
    for (const tour of touren) {
      if (tour.kostenManuell) {
        ergebnisse.push({
          ...tour,
          berechnung: {
            tourKosten: 0, stoppKosten: 0, tagKosten: 0,
            lastKmKosten: 0, leerKmKosten: 0, mautKmKosten: 0,
            zwischensumme: Number(tour.kostenManuell),
            gesamtKosten: Number(tour.kostenManuell),
            konditionId: null,
            konditionName: "Manuell",
          },
          istManuell: true,
        });
        continue;
      }

      let kondition = tour.kondition;
      if (!kondition && tour.transportUnternehmerId) {
        kondition = await findeKondition(
          tour.transportUnternehmerId,
          tour.routeId,
          tour.tourDatum
        );
      }

      if (!kondition) {
        ergebnisse.push({
          ...tour,
          berechnung: null,
          fehler: "Keine Kondition gefunden",
        });
        continue;
      }

      const berechnung = berechneKosten(tour, kondition);
      ergebnisse.push({ ...tour, berechnung, istManuell: false });
    }

    res.json({
      touren: ergebnisse,
      anzahl: ergebnisse.length,
      gesamtKosten: ergebnisse.reduce((s, t) => s + (t.berechnung?.gesamtKosten ?? 0), 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /bewerten — Bulk-Bewertung (Kosten berechnen + Status 0→1)
// ============================================================
router.post("/bewerten", requireRecht("tuabrechnung", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { datumVon, datumBis, nurTuId, nurRouteId } = req.body;
    if (!datumVon || !datumBis) {
      return res.status(400).json({ error: "datumVon und datumBis sind Pflicht" });
    }

    const where: any = {
      abrechnungsStatus: 0,
      abrechnungsStopp: false,
      geloeschtAm: null,
      tourDatum: {
        gte: new Date(datumVon),
        lte: new Date(datumBis),
      },
    };
    if (req.session.niederlassungId) {
      where.niederlassungId = req.session.niederlassungId;
    }
    if (nurTuId) where.transportUnternehmerId = nurTuId;
    if (nurRouteId) where.routeId = nurRouteId;

    const touren = await prisma.tour.findMany({
      where,
      include: {
        kondition: true,
        route: true,
        _count: { select: { artikelzeilen: true } },
      },
    });

    let bewerteteTouren = 0;
    let gesamtKosten = 0;
    const details: any[] = [];

    for (const tour of touren) {
      let kosten: number;
      let konditionId: string | null = null;

      if (tour.kostenManuell) {
        kosten = Number(tour.kostenManuell);
      } else {
        let kondition = tour.kondition;
        if (!kondition && tour.transportUnternehmerId) {
          kondition = await findeKondition(
            tour.transportUnternehmerId,
            tour.routeId,
            tour.tourDatum
          );
        }
        if (!kondition) continue;

        const ergebnis = berechneKosten(tour, kondition);
        kosten = ergebnis.gesamtKosten;
        konditionId = kondition.id;
      }

      await prisma.tour.update({
        where: { id: tour.id },
        data: {
          kostenKondition: kosten,
          abrechnungsStatus: 1,
          konditionId: konditionId || tour.konditionId,
        },
      });

      bewerteteTouren++;
      gesamtKosten += kosten;
      details.push({ tourId: tour.id, tourNummer: tour.tourNummer, kosten });
    }

    res.json({ bewerteteTouren, gesamtKosten: Math.round(gesamtKosten * 100) / 100, details });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /freigeben — Bulk-Freigabe (Status 1→2)
// ============================================================
router.post("/freigeben", requireRecht("tuabrechnung", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { tourIds } = req.body;
    if (!tourIds?.length) {
      return res.status(400).json({ error: "tourIds sind Pflicht" });
    }

    const touren = await prisma.tour.findMany({
      where: { id: { in: tourIds }, geloeschtAm: null },
      select: { id: true, abrechnungsStatus: true },
    });

    const nichtBereit = touren.filter(t => t.abrechnungsStatus !== 1);
    if (nichtBereit.length > 0) {
      return res.status(400).json({
        error: `${nichtBereit.length} Tour(en) haben nicht Status "bewertet"`,
      });
    }

    await prisma.tour.updateMany({
      where: { id: { in: tourIds } },
      data: { abrechnungsStatus: 2 },
    });

    res.json({ freigegebeneTouren: touren.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /erzeugen — Abrechnungsdokument generieren (Status 2→3)
// ============================================================
router.post("/erzeugen", requireRecht("tuabrechnung", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { tourIds, buchungsjahr } = req.body;
    if (!tourIds?.length) {
      return res.status(400).json({ error: "tourIds sind Pflicht" });
    }

    const touren = await prisma.tour.findMany({
      where: { id: { in: tourIds }, geloeschtAm: null },
      include: {
        transportUnternehmer: true,
        kondition: true,
        route: true,
        _count: { select: { artikelzeilen: true } },
      },
    });

    const nichtBereit = touren.filter(t => t.abrechnungsStatus !== 2);
    if (nichtBereit.length > 0) {
      return res.status(400).json({
        error: `${nichtBereit.length} Tour(en) haben nicht Status "freigegeben"`,
      });
    }

    const jahr = buchungsjahr || new Date().getFullYear();

    // Gruppiere nach TU
    const nachTu = new Map<string, typeof touren>();
    for (const tour of touren) {
      const tuId = tour.transportUnternehmerId || "OHNE_TU";
      if (!nachTu.has(tuId)) nachTu.set(tuId, []);
      nachTu.get(tuId)!.push(tour);
    }

    const erstellteAbrechnungen: any[] = [];

    for (const [tuId, tuTouren] of nachTu.entries()) {
      // Nächste Belegnummer
      const letzteAbr = await prisma.tuAbrechnung.findFirst({
        where: { buchungsjahr: jahr },
        orderBy: { belegnummer: "desc" },
        select: { belegnummer: true },
      });
      let naechsteNr = 1;
      if (letzteAbr) {
        const match = letzteAbr.belegnummer.match(/(\d+)$/);
        if (match) naechsteNr = parseInt(match[1]) + 1;
      }
      const belegnummer = `ABR-${jahr}-${String(naechsteNr).padStart(3, "0")}`;

      // Zeitraum
      const daten = tuTouren.map(t => t.tourDatum.getTime());
      const zeitraumVon = new Date(Math.min(...daten));
      const zeitraumBis = new Date(Math.max(...daten));

      // Gesamtbetrag
      const gesamtbetrag = tuTouren.reduce(
        (s, t) => s + Number(t.kostenManuell || t.kostenKondition || 0),
        0
      );

      const nlId = tuTouren[0].niederlassungId;

      const abrechnung = await prisma.$transaction(async (tx) => {
        const abr = await tx.tuAbrechnung.create({
          data: {
            belegnummer,
            buchungsjahr: jahr,
            zeitraumVon,
            zeitraumBis,
            transportUnternehmerId: tuId === "OHNE_TU" ? tuTouren[0].transportUnternehmerId! : tuId,
            niederlassungId: nlId,
            anzahlPositionen: tuTouren.length,
            gesamtbetrag: Math.round(gesamtbetrag * 100) / 100,
            status: "erzeugt",
          },
        });

        for (const tour of tuTouren) {
          const kosten = Number(tour.kostenManuell || tour.kostenKondition || 0);
          const istManuell = !!tour.kostenManuell;

          let breakdown = {
            tourKosten: 0, stoppKosten: 0, tagKosten: 0,
            lastKmKosten: 0, leerKmKosten: 0, mautKmKosten: 0,
          };

          if (!istManuell && tour.kondition) {
            const erg = berechneKosten(tour, tour.kondition);
            breakdown = {
              tourKosten: erg.tourKosten,
              stoppKosten: erg.stoppKosten,
              tagKosten: erg.tagKosten,
              lastKmKosten: erg.lastKmKosten,
              leerKmKosten: erg.leerKmKosten,
              mautKmKosten: erg.mautKmKosten,
            };
          }

          await tx.tuAbrechnungsPosition.create({
            data: {
              tuAbrechnungId: abr.id,
              tourId: tour.id,
              tourNummer: tour.tourNummer,
              tourDatum: tour.tourDatum,
              konditionId: tour.konditionId,
              konditionName: tour.kondition?.name || null,
              ...breakdown,
              gesamtKosten: kosten,
              lastKilometer: tour.lastKilometer,
              leerKilometer: tour.leerKilometer,
              mautKilometer: tour.mautKilometer,
              istManuell,
            },
          });

          await tx.tour.update({
            where: { id: tour.id },
            data: { abrechnungsStatus: 3 },
          });
        }

        return abr;
      });

      erstellteAbrechnungen.push(abrechnung);

      // Mail-Benachrichtigung an TU (wenn konfiguriert)
      const tuMitMail = await prisma.transportUnternehmer.findUnique({
        where: { id: abrechnung.transportUnternehmerId },
      });
      if (tuMitMail?.email) {
        sendAbrechnungMail(tuMitMail.email, abrechnung.belegnummer, tuMitMail.name, String(abrechnung.gesamtbetrag))
          .catch((err) => console.error("Mail-Versand TU-Abrechnung:", err));
      }
    }

    res.json({ abrechnungen: erstellteAbrechnungen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /touren/bewertet — Bewertete Touren (Status 1)
// ============================================================
router.get("/touren/bewertet", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = { abrechnungsStatus: 1, geloeschtAm: null };
    if (req.session.niederlassungId) where.niederlassungId = req.session.niederlassungId;

    const touren = await prisma.tour.findMany({
      where,
      include: {
        kfz: true, transportUnternehmer: true, kondition: true, route: true,
        _count: { select: { artikelzeilen: true } },
      },
      orderBy: { tourDatum: "asc" },
    });
    res.json({ data: touren });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /touren/freigegeben — Freigegebene Touren (Status 2)
// ============================================================
router.get("/touren/freigegeben", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const where: any = { abrechnungsStatus: 2, geloeschtAm: null };
    if (req.session.niederlassungId) where.niederlassungId = req.session.niederlassungId;

    const touren = await prisma.tour.findMany({
      where,
      include: {
        kfz: true, transportUnternehmer: true, kondition: true, route: true,
        _count: { select: { artikelzeilen: true } },
      },
      orderBy: { tourDatum: "asc" },
    });
    res.json({ data: touren });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET / — Liste aller Abrechnungen
// ============================================================
router.get("/", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const { buchungsjahr, tuId, status } = req.query;
    const where: any = { geloeschtAm: null };
    if (req.session.niederlassungId) where.niederlassungId = req.session.niederlassungId;
    if (buchungsjahr) where.buchungsjahr = parseInt(buchungsjahr as string);
    if (tuId) where.transportUnternehmerId = tuId;
    if (status) where.status = status;

    const abrechnungen = await prisma.tuAbrechnung.findMany({
      where,
      include: {
        transportUnternehmer: true,
        niederlassung: true,
        _count: { select: { positionen: true } },
      },
      orderBy: { erstelltAm: "desc" },
    });
    res.json({ data: abrechnungen });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /:id — Detail mit Positionen (MUSS nach /touren/* kommen!)
// ============================================================
router.get("/:id", requireRecht("tuabrechnung", "lesen"), async (req: Request, res: Response) => {
  try {
    const abrechnung = await prisma.tuAbrechnung.findUnique({
      where: { id: req.params.id },
      include: {
        transportUnternehmer: true,
        niederlassung: true,
        positionen: {
          include: { tour: true, kondition: true },
          orderBy: { tourDatum: "asc" },
        },
      },
    });
    if (!abrechnung) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }
    res.json(abrechnung);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /:id/storno — Stornierung
// ============================================================
router.post("/:id/storno", requireRecht("tuabrechnung", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { stornoGrund } = req.body || {};

    if (!stornoGrund || !stornoGrund.trim()) {
      return res.status(400).json({ error: "Storno-Grund ist Pflicht" });
    }

    const abrechnung = await prisma.tuAbrechnung.findUnique({
      where: { id: req.params.id },
      include: { positionen: true },
    });
    if (!abrechnung) {
      return res.status(404).json({ error: "Abrechnung nicht gefunden" });
    }
    if (abrechnung.status === "storniert") {
      return res.status(400).json({ error: "Abrechnung ist bereits storniert" });
    }

    const tourIds = abrechnung.positionen.map(p => p.tourId);

    await prisma.$transaction(async (tx) => {
      await tx.tuAbrechnung.update({
        where: { id: abrechnung.id },
        data: { status: "storniert" },
      });
      if (tourIds.length > 0) {
        await tx.tour.updateMany({
          where: { id: { in: tourIds } },
          data: { abrechnungsStatus: 0 },
        });
      }
      // Storno-Protokoll
      await tx.storno.create({
        data: {
          modell: "TuAbrechnung",
          entitaetId: abrechnung.id,
          stornoGrund: stornoGrund.trim(),
          benutzerId: req.session.userId || null,
          benutzerName: req.session.benutzername || null,
        },
      });
    });

    res.json({ storniertePositionen: tourIds.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
