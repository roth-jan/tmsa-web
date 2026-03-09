import prisma from "../db";

interface DateFilter {
  datumVon?: string;
  datumBis?: string;
}

function datumWhere(feld: string, filter: DateFilter) {
  const where: any = {};
  if (filter.datumVon) where[feld] = { ...where[feld], gte: new Date(filter.datumVon) };
  if (filter.datumBis) where[feld] = { ...where[feld], lte: new Date(filter.datumBis + "T23:59:59") };
  return where;
}

// 1. Tourenübersicht
export async function berichtTouren(
  filter: DateFilter & { tuId?: string; routeId?: string; status?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("tourDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;
  if (filter.routeId) where.routeId = filter.routeId;
  if (filter.status) where.status = filter.status;

  return prisma.tour.findMany({
    where,
    include: {
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
      route: { select: { routennummer: true, beschreibung: true } },
      kfz: { select: { kennzeichen: true } },
      kondition: { select: { name: true } },
    },
    orderBy: { tourDatum: "asc" },
  });
}

// 2. Avis-Liste
export async function berichtAvise(
  filter: DateFilter & { werkId?: string; status?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("ladeDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.werkId) where.werkId = filter.werkId;
  if (filter.status) where.status = filter.status;

  return prisma.avis.findMany({
    where,
    include: {
      lieferant: { select: { name: true, lieferantennummer: true } },
      werk: { select: { name: true, werkscode: true } },
      _count: { select: { artikelzeilen: true } },
    },
    orderBy: { ladeDatum: "asc" },
  });
}

// 3. TU-Kostenauswertung (gruppiert nach TU)
export async function berichtTuKosten(
  filter: DateFilter & { tuId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    transportUnternehmerId: { not: null },
    kostenKondition: { not: null },
    ...datumWhere("tourDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;

  const touren = await prisma.tour.findMany({
    where,
    include: {
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
    },
    orderBy: { tourDatum: "asc" },
  });

  // Gruppierung nach TU
  const grouped = new Map<string, { tuName: string; tuKurz: string; anzahl: number; summeKosten: number }>();
  for (const t of touren) {
    const tuId = t.transportUnternehmerId!;
    const entry = grouped.get(tuId) || {
      tuName: t.transportUnternehmer?.name || "",
      tuKurz: t.transportUnternehmer?.kurzbezeichnung || "",
      anzahl: 0,
      summeKosten: 0,
    };
    entry.anzahl++;
    entry.summeKosten += Number(t.kostenKondition || 0);
    grouped.set(tuId, entry);
  }

  return Array.from(grouped.values()).map((e) => ({
    tuName: e.tuName,
    tuKurz: e.tuKurz,
    anzahlTouren: e.anzahl,
    summeKosten: Math.round(e.summeKosten * 100) / 100,
    durchschnittKosten: e.anzahl > 0 ? Math.round((e.summeKosten / e.anzahl) * 100) / 100 : 0,
  }));
}

// 4. Abfahrten-Protokoll
export async function berichtAbfahrten(
  filter: DateFilter & { status?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("datum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.status) where.status = filter.status;

  return prisma.abfahrt.findMany({
    where,
    include: {
      kfz: { select: { kennzeichen: true } },
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
      route: { select: { routennummer: true } },
      tour: { select: { tourNummer: true } },
      _count: { select: { borderos: true } },
    },
    orderBy: { datum: "asc" },
  });
}

// 5. Sendungsübersicht
export async function berichtSendungen(
  filter: DateFilter & { status?: number },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("datum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.status != null) where.status = filter.status;

  return prisma.sendung.findMany({
    where,
    include: {
      bordero: { select: { borderoNummer: true } },
      lieferant: { select: { name: true } },
      werk: { select: { name: true, werkscode: true } },
      oem: { select: { name: true, kurzbezeichnung: true } },
    },
    orderBy: { datum: "asc" },
  });
}

// 6. Abrechnungsjournal
export async function berichtAbrechnungen(
  filter: { buchungsjahr?: number; tuId?: string; status?: string },
  nlId?: string
) {
  const where: any = { geloeschtAm: null };
  if (nlId) where.niederlassungId = nlId;
  if (filter.buchungsjahr) where.buchungsjahr = filter.buchungsjahr;
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;
  if (filter.status) where.status = filter.status;

  return prisma.tuAbrechnung.findMany({
    where,
    include: {
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
      positionen: {
        select: {
          tourNummer: true,
          tourDatum: true,
          gesamtKosten: true,
        },
      },
    },
    orderBy: { erstelltAm: "desc" },
  });
}
