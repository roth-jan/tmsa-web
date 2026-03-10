// ============================================================
// EDI Parser — VDA 4913/4927, DESADV, IFCSUM
// ============================================================

export interface ParsedZeile {
  beschreibung: string;
  menge: number;
  me: string;
  gewicht: number;
}

export interface ParsedAvis {
  avisNummer: string;
  ladeDatum: string;
  werkscode: string;
  lieferantNr: string;
  oem: string;
  zeilen: ParsedZeile[];
}

export interface ParsedEdiResult {
  format: string;
  avise: ParsedAvis[];
  warnings: string[];
}

// ── Format-Erkennung ────────────────────────────────────────
export function detectFormat(content: string): string {
  const trimmed = content.trim();

  // EDIFACT: beginnt mit UNA oder UNB
  if (trimmed.startsWith("UNA") || trimmed.startsWith("UNB")) {
    // Suche nach Message-Type im UNH-Segment
    if (trimmed.includes("DESADV")) return "DESADV";
    if (trimmed.includes("IFCSUM")) return "IFCSUM";
    return "EDIFACT";
  }

  // VDA: Zeilen beginnen mit 3-stelligem Satztyp (5xx oder 7xx)
  const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    const first3 = lines[0].substring(0, 3);
    if (/^[57]\d{2}$/.test(first3)) {
      // 711-719 = VDA 4913, 511-519 = vereinfachtes VDA 4913
      if (first3.startsWith("7")) return "VDA4913";
      if (first3.startsWith("5")) return "VDA4913";
    }
    // VDA 4927 beginnt mit 9xx
    if (/^9\d{2}$/.test(first3)) return "VDA4927";
  }

  return "UNKNOWN";
}

// ── VDA 4913 Parser ─────────────────────────────────────────
function parseVda4913(content: string): ParsedEdiResult {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];

  let oem = "";
  let werkscode = "";
  let lieferantNr = "";
  let lieferantName = "";
  let ladeDatum = "";
  const zeilen: ParsedZeile[] = [];

  for (const line of lines) {
    const satzart = line.substring(0, 3);

    if (satzart === "511" || satzart === "711") {
      // Header: OEM (10 chars) + Datum (8 chars, YYYYMMDD) + Laufnr (4 chars)
      // Robust: Suche 8-stellige Zahl die mit 20 beginnt für Datum
      const rest = line.substring(3);
      const datumMatch = rest.match(/(20\d{6})/);
      if (datumMatch) {
        const datumRaw = datumMatch[1];
        ladeDatum = `${datumRaw.substring(0, 4)}-${datumRaw.substring(4, 6)}-${datumRaw.substring(6, 8)}`;
        oem = rest.substring(0, datumMatch.index!).trim();
      } else {
        oem = rest.substring(0, 10).trim();
        ladeDatum = new Date().toISOString().split("T")[0];
      }
    } else if (satzart === "512" || satzart === "712") {
      // Lieferant: Nr (7 chars) + Name (35 chars)
      lieferantNr = line.substring(3, 10).trim();
      lieferantName = line.substring(10, 45).trim();
    } else if (satzart === "513" || satzart === "713") {
      // Werk: Code (7 chars) + Name (35 chars)
      werkscode = line.substring(3, 10).trim();
    } else if (satzart === "514" || satzart === "714") {
      // Artikelzeile: Pos (3) + Beschreibung (30) + Menge (6) + ME (4) + Gewicht (6)
      const pos = parseInt(line.substring(3, 6)) || zeilen.length + 1;
      const beschreibung = line.substring(6, 36).trim();
      const menge = parseInt(line.substring(36, 42)) || 0;
      const me = line.substring(42, 46).trim() || "ST";
      const gewicht = parseInt(line.substring(46, 52)) || 0;
      zeilen.push({ beschreibung, menge, me, gewicht });
    }
    // 519/719 = Ende, ignoriert
  }

  if (!werkscode) warnings.push("Kein Werkscode gefunden");
  if (!lieferantNr) warnings.push("Keine Lieferantennummer gefunden");

  const avisNummer = `AV-EDI-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;

  return {
    format: "VDA4913",
    avise: [{
      avisNummer,
      ladeDatum: ladeDatum || new Date().toISOString().split("T")[0],
      werkscode,
      lieferantNr,
      oem,
      zeilen,
    }],
    warnings,
  };
}

// ── VDA 4927 Parser (Verpackung/Leergut) ────────────────────
function parseVda4927(content: string): ParsedEdiResult {
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const zeilen: ParsedZeile[] = [];

  let werkscode = "";
  let lieferantNr = "";
  let oem = "";

  for (const line of lines) {
    const satzart = line.substring(0, 3);

    if (satzart === "911") {
      oem = line.substring(3, 13).trim();
    } else if (satzart === "912") {
      lieferantNr = line.substring(3, 10).trim();
    } else if (satzart === "913") {
      werkscode = line.substring(3, 10).trim();
    } else if (satzart === "914") {
      const beschreibung = line.substring(6, 36).trim() || "Leergut";
      const menge = parseInt(line.substring(36, 42)) || 0;
      zeilen.push({ beschreibung, menge, me: "PAL", gewicht: 0 });
    }
  }

  return {
    format: "VDA4927",
    avise: [{
      avisNummer: `AV-LG-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
      ladeDatum: new Date().toISOString().split("T")[0],
      werkscode,
      lieferantNr,
      oem,
      zeilen,
    }],
    warnings,
  };
}

// ── EDIFACT Helper ──────────────────────────────────────────
function splitEdifactSegments(content: string): string[] {
  // Entferne UNA Service-String-Advice
  let data = content.trim();
  if (data.startsWith("UNA")) {
    data = data.substring(9); // UNA + 6 Zeichen
  }
  // Split bei ' (Segment-Trenner)
  return data.split("'").map((s) => s.trim()).filter(Boolean);
}

function edifactField(segment: string, idx: number, subIdx = 0): string {
  const parts = segment.split("+");
  if (idx >= parts.length) return "";
  const subs = parts[idx].split(":");
  return (subs[subIdx] || "").trim();
}

// ── DESADV Parser (Despatch Advice) ─────────────────────────
function parseDesadv(content: string): ParsedEdiResult {
  const segments = splitEdifactSegments(content);
  const warnings: string[] = [];
  const zeilen: ParsedZeile[] = [];

  let werkscode = "";
  let lieferantNr = "";
  let ladeDatum = new Date().toISOString().split("T")[0];
  let currentBeschreibung = "";

  for (const seg of segments) {
    const tag = seg.substring(0, 3);

    if (tag === "DTM") {
      // DTM+137:20260315:102 → Despatch-Datum
      const qualifier = edifactField(seg, 1, 0);
      const datum = edifactField(seg, 1, 1);
      if ((qualifier === "137" || qualifier === "11") && datum.length === 8) {
        ladeDatum = `${datum.substring(0, 4)}-${datum.substring(4, 6)}-${datum.substring(6, 8)}`;
      }
    } else if (tag === "NAD") {
      // NAD+SU+12345 → Supplier, NAD+ST+WOB → Ship-To (Werk)
      const qualifier = edifactField(seg, 1);
      const id = edifactField(seg, 2);
      if (qualifier === "SU") lieferantNr = id;
      if (qualifier === "ST" || qualifier === "DP") werkscode = id;
    } else if (tag === "LIN") {
      // LIN+1++4711:IN → Line Item
      currentBeschreibung = edifactField(seg, 3, 0) || `Artikel ${edifactField(seg, 1)}`;
    } else if (tag === "QTY") {
      // QTY+12:500:PCE → Menge
      const menge = parseInt(edifactField(seg, 1, 1)) || 0;
      const me = edifactField(seg, 1, 2) || "ST";
      zeilen.push({
        beschreibung: currentBeschreibung || "DESADV-Artikel",
        menge,
        me: me === "PCE" ? "ST" : me === "KGM" ? "KG" : me,
        gewicht: 0,
      });
      currentBeschreibung = "";
    }
  }

  return {
    format: "DESADV",
    avise: [{
      avisNummer: `AV-DESADV-${Date.now().toString(36).toUpperCase()}`,
      ladeDatum,
      werkscode,
      lieferantNr,
      oem: "",
      zeilen,
    }],
    warnings,
  };
}

// ── IFCSUM Parser (Konsolidierung → Tour) ───────────────────
function parseIfcsum(content: string): ParsedEdiResult {
  const segments = splitEdifactSegments(content);
  const warnings: string[] = [];
  const zeilen: ParsedZeile[] = [];

  let werkscode = "";
  let lieferantNr = "";
  let ladeDatum = new Date().toISOString().split("T")[0];

  for (const seg of segments) {
    const tag = seg.substring(0, 3);

    if (tag === "DTM") {
      const qualifier = edifactField(seg, 1, 0);
      const datum = edifactField(seg, 1, 1);
      if (datum.length === 8) {
        ladeDatum = `${datum.substring(0, 4)}-${datum.substring(4, 6)}-${datum.substring(6, 8)}`;
      }
    } else if (tag === "NAD") {
      const qualifier = edifactField(seg, 1);
      const id = edifactField(seg, 2);
      if (qualifier === "CZ") lieferantNr = id; // Consignor
      if (qualifier === "CN" || qualifier === "DP") werkscode = id; // Consignee
    } else if (tag === "GID") {
      // GID+1+100:PCE → Goods Item
      const menge = parseInt(edifactField(seg, 2, 0)) || 0;
      const me = edifactField(seg, 2, 1) || "ST";
      zeilen.push({
        beschreibung: `Konsolidierungsgut ${edifactField(seg, 1)}`,
        menge,
        me: me === "PCE" ? "ST" : me,
        gewicht: 0,
      });
    } else if (tag === "MEA") {
      // MEA+AAE+G+KGM:1500 → Gewicht
      if (edifactField(seg, 2) === "G" && zeilen.length > 0) {
        zeilen[zeilen.length - 1].gewicht = parseInt(edifactField(seg, 3, 1)) || 0;
      }
    }
  }

  return {
    format: "IFCSUM",
    avise: [{
      avisNummer: `AV-IFCSUM-${Date.now().toString(36).toUpperCase()}`,
      ladeDatum,
      werkscode,
      lieferantNr,
      oem: "",
      zeilen,
    }],
    warnings,
  };
}

// ── Haupteinstieg ───────────────────────────────────────────
export function parseEdi(content: string, formatHint?: string): ParsedEdiResult {
  const format = formatHint || detectFormat(content);

  switch (format) {
    case "VDA4913": return parseVda4913(content);
    case "VDA4927": return parseVda4927(content);
    case "DESADV": return parseDesadv(content);
    case "IFCSUM": return parseIfcsum(content);
    default:
      return { format: "UNKNOWN", avise: [], warnings: ["Format nicht erkannt"] };
  }
}
