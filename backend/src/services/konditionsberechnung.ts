import prisma from "../db";
import { Decimal } from "@prisma/client/runtime/library";

export interface BerechnungsErgebnis {
  tourKosten: number;
  stoppKosten: number;
  tagKosten: number;
  lastKmKosten: number;
  leerKmKosten: number;
  mautKmKosten: number;
  zwischensumme: number;
  gesamtKosten: number;
  konditionId: string;
  konditionName: string;
}

function toNum(val: Decimal | number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === "number" ? val : Number(val);
}

/**
 * Berechnet Kosten für eine Tour anhand der zugehörigen Kondition.
 *
 * Formel (aus TMSA-II):
 *   Zwischensumme = tourFaktor
 *                 + (stoppFaktor × Anzahl Stopps)
 *                 + (tagFaktor / anzahlTourenAmTag)
 *                 + (lastKilometer × lastKmFaktor)
 *                 + (leerKilometer × leerKmFaktor)
 *                 + (mautKilometer × mautKmFaktor)
 *
 *   Gesamt = min(Zwischensumme, maximalFrachtProTour)
 */
export function berechneKosten(
  tour: {
    lastKilometer?: Decimal | number | null;
    leerKilometer?: Decimal | number | null;
    mautKilometer?: Decimal | number | null;
    route?: { kilometerLast?: Decimal | number | null; kilometerLeer?: Decimal | number | null; kilometerMaut?: Decimal | number | null } | null;
    _count?: { artikelzeilen: number };
  },
  kondition: {
    id: string;
    name: string;
    tourFaktor?: Decimal | number | null;
    stoppFaktor?: Decimal | number | null;
    tagFaktor?: Decimal | number | null;
    lastKmFaktor?: Decimal | number | null;
    leerKmFaktor?: Decimal | number | null;
    mautKmFaktor?: Decimal | number | null;
    maximalFrachtProTour?: Decimal | number | null;
    maximalFrachtProTag?: Decimal | number | null;
  },
  anzahlTourenAmTag: number = 1
): BerechnungsErgebnis {
  // Kilometer: Tour-Werte > Route-Defaults
  const lastKm = toNum(tour.lastKilometer) || toNum(tour.route?.kilometerLast);
  const leerKm = toNum(tour.leerKilometer) || toNum(tour.route?.kilometerLeer);
  const mautKm = toNum(tour.mautKilometer) || toNum(tour.route?.kilometerMaut);

  const anzahlStopps = tour._count?.artikelzeilen ?? 0;

  const tourKosten = toNum(kondition.tourFaktor);
  const stoppKosten = toNum(kondition.stoppFaktor) * anzahlStopps;
  const tagKosten = anzahlTourenAmTag > 0
    ? toNum(kondition.tagFaktor) / anzahlTourenAmTag
    : 0;
  const lastKmKosten = lastKm * toNum(kondition.lastKmFaktor);
  const leerKmKosten = leerKm * toNum(kondition.leerKmFaktor);
  const mautKmKosten = mautKm * toNum(kondition.mautKmFaktor);

  const zwischensumme = tourKosten + stoppKosten + tagKosten + lastKmKosten + leerKmKosten + mautKmKosten;

  // Tour-Cap
  const maxTour = toNum(kondition.maximalFrachtProTour);
  const gesamtKosten = maxTour > 0 ? Math.min(zwischensumme, maxTour) : zwischensumme;

  return {
    tourKosten: Math.round(tourKosten * 100) / 100,
    stoppKosten: Math.round(stoppKosten * 100) / 100,
    tagKosten: Math.round(tagKosten * 100) / 100,
    lastKmKosten: Math.round(lastKmKosten * 100) / 100,
    leerKmKosten: Math.round(leerKmKosten * 100) / 100,
    mautKmKosten: Math.round(mautKmKosten * 100) / 100,
    zwischensumme: Math.round(zwischensumme * 100) / 100,
    gesamtKosten: Math.round(gesamtKosten * 100) / 100,
    konditionId: kondition.id,
    konditionName: kondition.name,
  };
}

/**
 * Findet die passende Kondition für eine Tour:
 * 1. TU + Route + gültiges Datum (spezifisch)
 * 2. TU + route=null (Fallback)
 */
export async function findeKondition(
  transportUnternehmerId: string,
  routeId: string | null,
  datum: Date
) {
  // 1. Spezifisch: TU + Route
  if (routeId) {
    const spezifisch = await prisma.kondition.findFirst({
      where: {
        transportUnternehmerId,
        routeId,
        gueltigVon: { lte: datum },
        OR: [{ gueltigBis: null }, { gueltigBis: { gte: datum } }],
        geloeschtAm: null,
      },
      orderBy: { gueltigVon: "desc" },
    });
    if (spezifisch) return spezifisch;
  }

  // 2. Fallback: TU ohne Route
  return prisma.kondition.findFirst({
    where: {
      transportUnternehmerId,
      routeId: null,
      gueltigVon: { lte: datum },
      OR: [{ gueltigBis: null }, { gueltigBis: { gte: datum } }],
      geloeschtAm: null,
    },
    orderBy: { gueltigVon: "desc" },
  });
}
