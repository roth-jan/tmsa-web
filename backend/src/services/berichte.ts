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

// 7. Ausfallfrachten (Leerfahrten oder Touren ohne Artikelzeilen)
export async function berichtAusfallfrachten(
  filter: DateFilter & { tuId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("tourDatum", filter),
    OR: [
      { istLeerfahrt: true },
      { artikelzeilen: { none: {} } },
    ],
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;

  return prisma.tour.findMany({
    where,
    include: {
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
      route: { select: { routennummer: true } },
      kfz: { select: { kennzeichen: true } },
      _count: { select: { artikelzeilen: true } },
    },
    orderBy: { tourDatum: "asc" },
  });
}

// 8. DFUE-Übersicht (EDI-Imports aus AuditLog)
export async function berichtDfueUebersicht(
  filter: DateFilter,
  nlId?: string
) {
  const where: any = {
    modell: "Avis",
    aktion: "create",
  };
  if (filter.datumVon) where.zeitpunkt = { ...where.zeitpunkt, gte: new Date(filter.datumVon) };
  if (filter.datumBis) where.zeitpunkt = { ...where.zeitpunkt, lte: new Date(filter.datumBis + "T23:59:59") };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { zeitpunkt: "desc" },
    take: 500,
  });

  // Filter: Nur Avise die per EDI erstellt wurden (Bemerkung enthält "EDI")
  return logs.filter((l: any) => {
    const nw = l.neuerWert as any;
    return nw?.bemerkung?.includes("EDI");
  }).map((l: any) => {
    const nw = l.neuerWert as any;
    return {
      zeitpunkt: l.zeitpunkt,
      avisNummer: nw?.avisNummer || "",
      format: nw?.bemerkung?.match(/EDI[- ]?(\S+)/)?.[1] || "VDA4913",
      status: "success",
      benutzerName: l.benutzerName,
    };
  });
}

// 9. Fahrzeugliste (Touren gruppiert nach KFZ)
export async function berichtFahrzeugliste(
  filter: DateFilter & { tuId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    kfzId: { not: null },
    ...datumWhere("tourDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;

  const touren = await prisma.tour.findMany({
    where,
    include: {
      kfz: { select: { kennzeichen: true, fabrikat: true, lkwTyp: true } },
      transportUnternehmer: { select: { kurzbezeichnung: true } },
    },
  });

  const grouped = new Map<string, {
    kennzeichen: string; fabrikat: string; lkwTyp: string; tu: string;
    anzahlTouren: number; summeKosten: number;
  }>();

  for (const t of touren) {
    const kfzId = t.kfzId!;
    const entry = grouped.get(kfzId) || {
      kennzeichen: t.kfz?.kennzeichen || "",
      fabrikat: t.kfz?.fabrikat || "",
      lkwTyp: t.kfz?.lkwTyp || "",
      tu: t.transportUnternehmer?.kurzbezeichnung || "",
      anzahlTouren: 0,
      summeKosten: 0,
    };
    entry.anzahlTouren++;
    entry.summeKosten += Number(t.kostenKondition || 0);
    grouped.set(kfzId, entry);
  }

  return Array.from(grouped.values()).map((e) => ({
    ...e,
    summeKosten: Math.round(e.summeKosten * 100) / 100,
    durchschnittKosten: e.anzahlTouren > 0 ? Math.round((e.summeKosten / e.anzahlTouren) * 100) / 100 : 0,
  }));
}

// 10. Konditionsübersicht
export async function berichtKonditionsuebersicht(
  filter: { tuId?: string; routeId?: string },
  nlId?: string
) {
  const where: any = { geloeschtAm: null };
  if (filter.tuId) where.transportUnternehmerId = filter.tuId;
  if (filter.routeId) where.routeId = filter.routeId;

  // NL-Filter via TU
  if (nlId) {
    where.transportUnternehmer = { niederlassungId: nlId };
  }

  return prisma.kondition.findMany({
    where,
    include: {
      transportUnternehmer: { select: { name: true, kurzbezeichnung: true } },
      route: { select: { routennummer: true, beschreibung: true } },
    },
    orderBy: { erstelltAm: "desc" },
  });
}

// 11. OEM Mengen (Avise + Artikelzeilen gruppiert nach OEM via Avis→Werk→OEM)
export async function berichtOemMengen(
  filter: DateFilter & { oemId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    ...datumWhere("ladeDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.oemId) where.werk = { oemId: filter.oemId };

  const avise = await prisma.avis.findMany({
    where,
    include: {
      werk: { select: { oemId: true, oem: { select: { name: true, kurzbezeichnung: true } } } },
      artikelzeilen: { select: { menge: true, gewicht: true } },
    },
  });

  const grouped = new Map<string, {
    oemName: string; oemKurz: string; anzahlAvise: number;
    anzahlZeilen: number; summeMenge: number; summeGewicht: number;
  }>();

  for (const a of avise) {
    const oemId = a.werk.oemId;
    const entry = grouped.get(oemId) || {
      oemName: a.werk.oem.name,
      oemKurz: a.werk.oem.kurzbezeichnung,
      anzahlAvise: 0, anzahlZeilen: 0, summeMenge: 0, summeGewicht: 0,
    };
    entry.anzahlAvise++;
    entry.anzahlZeilen += a.artikelzeilen.length;
    for (const z of a.artikelzeilen) {
      entry.summeMenge += Number(z.menge || 0);
      entry.summeGewicht += Number(z.gewicht || 0);
    }
    grouped.set(oemId, entry);
  }

  return Array.from(grouped.values()).map((e) => ({
    ...e,
    summeMenge: Math.round(e.summeMenge * 100) / 100,
    summeGewicht: Math.round(e.summeGewicht * 100) / 100,
  }));
}

// 12. OEM Kosten (Touren gruppiert nach OEM via Tour→Route→OEM)
export async function berichtOemKosten(
  filter: DateFilter & { oemId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    kostenKondition: { not: null },
    route: { isNot: null },
    ...datumWhere("tourDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.oemId) where.route = { ...where.route, oemId: filter.oemId };

  const touren = await prisma.tour.findMany({
    where,
    include: {
      route: { select: { oemId: true, oem: { select: { name: true, kurzbezeichnung: true } } } },
    },
  });

  const grouped = new Map<string, {
    oemName: string; oemKurz: string; anzahlTouren: number; summeKosten: number;
  }>();

  for (const t of touren) {
    if (!t.route) continue;
    const oemId = t.route.oemId;
    const entry = grouped.get(oemId) || {
      oemName: t.route.oem.name,
      oemKurz: t.route.oem.kurzbezeichnung,
      anzahlTouren: 0, summeKosten: 0,
    };
    entry.anzahlTouren++;
    entry.summeKosten += Number(t.kostenKondition || 0);
    grouped.set(oemId, entry);
  }

  return Array.from(grouped.values()).map((e) => ({
    ...e,
    summeKosten: Math.round(e.summeKosten * 100) / 100,
    durchschnittKosten: e.anzahlTouren > 0 ? Math.round((e.summeKosten / e.anzahlTouren) * 100) / 100 : 0,
  }));
}

// 13. OEM Touren (Tour-Counts + Status-Verteilung nach OEM)
export async function berichtOemTouren(
  filter: DateFilter & { oemId?: string },
  nlId?: string
) {
  const where: any = {
    geloeschtAm: null,
    route: { isNot: null },
    ...datumWhere("tourDatum", filter),
  };
  if (nlId) where.niederlassungId = nlId;
  if (filter.oemId) where.route = { ...where.route, oemId: filter.oemId };

  const touren = await prisma.tour.findMany({
    where,
    include: {
      route: { select: { oemId: true, oem: { select: { name: true, kurzbezeichnung: true } } } },
    },
  });

  const grouped = new Map<string, {
    oemName: string; oemKurz: string;
    gesamt: number; offen: number; disponiert: number; abgefahren: number; abgeschlossen: number;
  }>();

  for (const t of touren) {
    if (!t.route) continue;
    const oemId = t.route.oemId;
    const entry = grouped.get(oemId) || {
      oemName: t.route.oem.name, oemKurz: t.route.oem.kurzbezeichnung,
      gesamt: 0, offen: 0, disponiert: 0, abgefahren: 0, abgeschlossen: 0,
    };
    entry.gesamt++;
    if (t.status === "offen") entry.offen++;
    else if (t.status === "disponiert") entry.disponiert++;
    else if (t.status === "abgefahren") entry.abgefahren++;
    else if (t.status === "abgeschlossen") entry.abgeschlossen++;
    grouped.set(oemId, entry);
  }

  return Array.from(grouped.values());
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
