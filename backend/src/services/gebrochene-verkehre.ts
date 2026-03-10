import prisma from "../db";

interface AbschnittInput {
  reihenfolge: number;
  typ: string; // VL, HL, NL
  vonBeschreibung: string;
  nachBeschreibung: string;
  umschlagPunktId?: string;
  routeId?: string;
  transportUnternehmerId?: string;
  kfzId?: string;
  konditionId?: string;
}

/**
 * Tour in Teilstrecken aufteilen (brechen).
 * Setzt istGebrochen=true und erstellt Streckenabschnitt-Records.
 */
export async function tourBrechen(tourId: string, abschnitte: AbschnittInput[]) {
  const tour = await prisma.tour.findUnique({ where: { id: tourId } });
  if (!tour || tour.geloeschtAm) {
    throw new Error("Tour nicht gefunden");
  }
  if (!["offen", "disponiert"].includes(tour.status)) {
    throw new Error("Tour kann nur im Status 'offen' oder 'disponiert' gebrochen werden");
  }
  if (tour.istGebrochen) {
    throw new Error("Tour ist bereits gebrochen");
  }
  if (!abschnitte.length) {
    throw new Error("Mindestens ein Streckenabschnitt erforderlich");
  }

  return prisma.$transaction(async (tx) => {
    await tx.tour.update({
      where: { id: tourId },
      data: { istGebrochen: true },
    });

    await tx.streckenabschnitt.createMany({
      data: abschnitte.map((a) => ({
        tourId,
        reihenfolge: a.reihenfolge,
        typ: a.typ,
        vonBeschreibung: a.vonBeschreibung,
        nachBeschreibung: a.nachBeschreibung,
        umschlagPunktId: a.umschlagPunktId || null,
        routeId: a.routeId || null,
        transportUnternehmerId: a.transportUnternehmerId || null,
        kfzId: a.kfzId || null,
        konditionId: a.konditionId || null,
      })),
    });

    return tx.tour.findUnique({
      where: { id: tourId },
      include: {
        streckenabschnitte: {
          orderBy: { reihenfolge: "asc" },
          include: {
            umschlagPunkt: true,
            route: true,
            transportUnternehmer: true,
            kfz: true,
            kondition: true,
          },
        },
      },
    });
  });
}

/**
 * Einzelnen Streckenabschnitt aktualisieren (TU, KFZ, Route, Kondition, km, Status).
 */
export async function abschnittAktualisieren(
  abschnittId: string,
  data: {
    transportUnternehmerId?: string | null;
    kfzId?: string | null;
    routeId?: string | null;
    konditionId?: string | null;
    lastKilometer?: number | null;
    leerKilometer?: number | null;
    mautKilometer?: number | null;
    kostenKondition?: number | null;
    status?: string;
  }
) {
  const abschnitt = await prisma.streckenabschnitt.findUnique({ where: { id: abschnittId } });
  if (!abschnitt) {
    throw new Error("Streckenabschnitt nicht gefunden");
  }

  return prisma.streckenabschnitt.update({
    where: { id: abschnittId },
    data,
    include: {
      umschlagPunkt: true,
      route: true,
      transportUnternehmer: true,
      kfz: true,
      kondition: true,
    },
  });
}

/**
 * Brechung rückgängig machen: Löscht alle Abschnitte und setzt istGebrochen=false.
 */
export async function tourZusammenfuehren(tourId: string) {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: { streckenabschnitte: true },
  });
  if (!tour || tour.geloeschtAm) {
    throw new Error("Tour nicht gefunden");
  }
  if (!tour.istGebrochen) {
    throw new Error("Tour ist nicht gebrochen");
  }

  return prisma.$transaction(async (tx) => {
    await tx.streckenabschnitt.deleteMany({ where: { tourId } });
    return tx.tour.update({
      where: { id: tourId },
      data: { istGebrochen: false },
    });
  });
}
