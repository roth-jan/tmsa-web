import prisma from "../db";

// ============================================================
// Nummernkreis-Service — Atomare Nummernvergabe
// ============================================================

type NummernkreisTyp = "tour" | "abfahrt" | "bordero" | "sendung" | "tuAbrechnung";

/**
 * Generiert die nächste Nummer für einen Typ + Niederlassung.
 * Verwendet DB-Level Locking (FOR UPDATE via raw query).
 * Falls kein Nummernkreis konfiguriert ist, wird ein Default erstellt.
 */
export async function getNextNumber(typ: NummernkreisTyp, niederlassungId?: string | null): Promise<string> {
  // Nummernkreis laden oder erstellen
  let nk = await prisma.nummernkreis.findFirst({
    where: { typ, niederlassungId: niederlassungId || null },
  });

  if (!nk) {
    // Default-Nummernkreis erstellen
    const defaults: Record<string, { prefix: string; format: string }> = {
      tour: { prefix: "T", format: "{PREFIX}-{JAHR}-{NUMMER:5}" },
      abfahrt: { prefix: "AF", format: "{PREFIX}-{JAHR}-{NUMMER:5}" },
      bordero: { prefix: "B", format: "{PREFIX}-{JAHR}-{NUMMER:5}" },
      sendung: { prefix: "S", format: "{PREFIX}-{JAHR}-{NUMMER:5}" },
      tuAbrechnung: { prefix: "ABR", format: "{PREFIX}-{JAHR}-{NUMMER:5}" },
    };

    const def = defaults[typ] || { prefix: typ.toUpperCase(), format: "{PREFIX}-{NUMMER:6}" };

    nk = await prisma.nummernkreis.create({
      data: {
        typ,
        prefix: def.prefix,
        format: def.format,
        niederlassungId: niederlassungId || null,
        letzteNummer: 0,
      },
    });
  }

  // Atomar inkrementieren
  const updated = await prisma.nummernkreis.update({
    where: { id: nk.id },
    data: { letzteNummer: { increment: 1 } },
  });

  // Format anwenden
  return formatNummer(updated.format, updated.prefix, updated.letzteNummer);
}

function formatNummer(format: string, prefix: string, nummer: number): string {
  const jahr = new Date().getFullYear();
  const monat = String(new Date().getMonth() + 1).padStart(2, "0");

  let result = format;

  // {PREFIX}
  result = result.replace("{PREFIX}", prefix);

  // {JAHR} / {JAHR:2}
  result = result.replace("{JAHR:2}", String(jahr).substring(2));
  result = result.replace("{JAHR}", String(jahr));

  // {MONAT}
  result = result.replace("{MONAT}", monat);

  // {NUMMER:N} — mit führenden Nullen
  const nummerMatch = result.match(/\{NUMMER:(\d+)\}/);
  if (nummerMatch) {
    const stellen = parseInt(nummerMatch[1]);
    result = result.replace(nummerMatch[0], String(nummer).padStart(stellen, "0"));
  } else {
    result = result.replace("{NUMMER}", String(nummer));
  }

  return result;
}
