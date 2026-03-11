// ============================================================
// EDI-Generator — VDA 4913 Versandmeldung + IFTSTA Statusmeldung
// ============================================================

export interface EdiExportTour {
  tourNummer: string;
  tourDatum: Date;
  status: string;
  kfzKennzeichen?: string;
  tuName?: string;
  routennummer?: string;
  artikelzeilen: Array<{
    beschreibung: string;
    menge: number;
    me: string;
    gewicht: number;
    lieferantNr?: string;
    werkscode?: string;
  }>;
}

// ── VDA 4913 Versandmeldung generieren ───────────────────────
export function generateVda4913(tour: EdiExportTour): string {
  const lines: string[] = [];
  const datum = formatDatum(tour.tourDatum);
  const laufnr = tour.tourNummer.replace(/[^0-9]/g, "").padStart(4, "0").substring(0, 4);

  // 511: Header (OEM + Datum + Laufnr)
  const header = `511${(tour.tuName || "").padEnd(10).substring(0, 10)}${datum}${laufnr}`;
  lines.push(header);

  // 512: Lieferant (erstes Avis)
  const ersteLiefNr = tour.artikelzeilen[0]?.lieferantNr || "0000000";
  lines.push(`512${ersteLiefNr.padEnd(7).substring(0, 7)}${"Lieferant".padEnd(35).substring(0, 35)}`);

  // 513: Werk
  const erstesWerk = tour.artikelzeilen[0]?.werkscode || "0000000";
  lines.push(`513${erstesWerk.padEnd(7).substring(0, 7)}${"Werk".padEnd(35).substring(0, 35)}`);

  // 514: Artikelzeilen
  tour.artikelzeilen.forEach((az, i) => {
    const pos = String(i + 1).padStart(3, "0");
    const beschreibung = az.beschreibung.padEnd(30).substring(0, 30);
    const menge = String(az.menge).padStart(6, "0");
    const me = (az.me || "ST").padEnd(4).substring(0, 4);
    const gewicht = String(az.gewicht || 0).padStart(6, "0");
    lines.push(`514${pos}${beschreibung}${menge}${me}${gewicht}`);
  });

  // 519: Ende
  lines.push(`519${datum}${laufnr}`);

  return lines.join("\n");
}

// ── IFTSTA Statusmeldung generieren ──────────────────────────
export function generateIftsta(tour: EdiExportTour, statusCode: string): string {
  const segments: string[] = [];
  const datum = formatDatumEdifact(tour.tourDatum);
  const msgRef = `IFTSTA${Date.now().toString(36).toUpperCase()}`;

  // Service String Advice
  segments.push("UNA:+.? '");

  // Interchange Header
  segments.push(`UNB+UNOC:3+TMSA-WEB+EMPFAENGER+${datum.substring(0, 6)}:${datum.substring(6, 10)}+${msgRef}'`);

  // Message Header
  segments.push(`UNH+1+IFTSTA:D:00B:UN'`);

  // Beginning of Message
  segments.push(`BGM+77+${msgRef}+9'`);

  // Date
  segments.push(`DTM+137:${datum}:203'`);

  // Consignment Info
  segments.push(`CNI+1+${tour.tourNummer}'`);

  // Status
  const statusMap: Record<string, string> = {
    "1": "Abgeholt",
    "2": "Unterwegs",
    "3": "Angekommen",
    "5": "Zugestellt",
  };
  segments.push(`STS+1+${statusCode}'`);

  // Reference
  segments.push(`RFF+CU:${tour.tourNummer}'`);

  // Status Date
  segments.push(`DTM+334:${datum}:203'`);

  // Message Trailer
  segments.push(`UNT+${segments.length - 1}+1'`);
  segments.push(`UNZ+1+${msgRef}'`);

  return segments.join("\n");
}

// ── Hilfsfunktionen ──────────────────────────────────────────
function formatDatum(d: Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}`;
}

function formatDatumEdifact(d: Date): string {
  const dt = new Date(d);
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}${String(dt.getHours()).padStart(2, "0")}${String(dt.getMinutes()).padStart(2, "0")}`;
}
