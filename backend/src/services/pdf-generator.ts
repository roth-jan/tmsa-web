import PDFDocument from "pdfkit";

// ============================================================
// Hilfsfunktionen
// ============================================================

function datumDE(val: any): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function eurDE(val: any): string {
  if (val == null) return "0,00 €";
  const num = Number(val);
  if (isNaN(num)) return "0,00 €";
  return num.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function decDE(val: any, nachkomma = 2): string {
  if (val == null) return "";
  const num = Number(val);
  if (isNaN(num)) return "";
  return num.toLocaleString("de-DE", { minimumFractionDigits: nachkomma, maximumFractionDigits: nachkomma });
}

// ============================================================
// Tabellen-Helper
// ============================================================

interface TableCol {
  header: string;
  width: number;
  align?: "left" | "right" | "center";
}

function drawTableHeader(doc: PDFKit.PDFDocument, cols: TableCol[], x: number, y: number): number {
  doc.font("Helvetica-Bold").fontSize(8);
  doc.rect(x, y, cols.reduce((s, c) => s + c.width, 0), 16).fill("#e8e8e8");
  doc.fillColor("black");

  let cx = x;
  for (const col of cols) {
    doc.text(col.header, cx + 3, y + 4, { width: col.width - 6, align: col.align || "left" });
    cx += col.width;
  }
  return y + 16;
}

function drawTableRow(doc: PDFKit.PDFDocument, cols: TableCol[], values: string[], x: number, y: number, stripe: boolean): number {
  const rowHeight = 14;

  if (stripe) {
    doc.rect(x, y, cols.reduce((s, c) => s + c.width, 0), rowHeight).fill("#f5f5f5");
    doc.fillColor("black");
  }

  doc.font("Helvetica").fontSize(8);
  let cx = x;
  for (let i = 0; i < cols.length; i++) {
    const val = values[i] || "";
    doc.text(val, cx + 3, y + 3, { width: cols[i].width - 6, align: cols[i].align || "left" });
    cx += cols[i].width;
  }
  return y + rowHeight;
}

function checkPageBreak(doc: PDFKit.PDFDocument, y: number, needed = 40): number {
  if (y > 720) {
    doc.addPage();
    return 50;
  }
  return y;
}

// ============================================================
// 1. Bordero-PDF
// ============================================================

export interface BorderoData {
  borderoNummer: string;
  gewicht?: any;
  lademeter?: any;
  status: string;
  erstelltAm: any;
  abfahrt: {
    abfahrtNummer: string;
    datum: any;
    tour?: { tourNummer: string } | null;
    kfz?: { kennzeichen: string } | null;
    transportUnternehmer?: { name: string; kurzbezeichnung: string } | null;
    route?: { routennummer: string; beschreibung?: string | null } | null;
    niederlassung?: { name: string; kurzbezeichnung: string } | null;
  };
  sendungen: Array<{
    sendungNummer: string;
    richtungsArt: string;
    gewicht?: any;
    lademeter?: any;
    lieferant?: { name: string } | null;
    werk?: { name: string } | null;
  }>;
}

export function erstelleBorderoPdf(data: BorderoData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ---- Header ----
  doc.font("Helvetica-Bold").fontSize(16).text("ABT Automotive Logistik", { align: "center" });
  doc.fontSize(12).text("Bordero / Lademanifest", { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // ---- Info-Block (2 Spalten) ----
  doc.font("Helvetica").fontSize(9);
  const infoY = doc.y;
  const left = [
    ["Bordero-Nr.:", data.borderoNummer],
    ["Abfahrt-Nr.:", data.abfahrt.abfahrtNummer],
    ["Tour-Nr.:", data.abfahrt.tour?.tourNummer || "-"],
    ["Datum:", datumDE(data.abfahrt.datum)],
  ];
  const right = [
    ["KFZ:", data.abfahrt.kfz?.kennzeichen || "-"],
    ["TU:", data.abfahrt.transportUnternehmer?.kurzbezeichnung || "-"],
    ["Route:", data.abfahrt.route?.routennummer || "-"],
    ["NL:", data.abfahrt.niederlassung?.kurzbezeichnung || "-"],
  ];

  let ly = infoY;
  for (const [label, val] of left) {
    doc.font("Helvetica-Bold").text(label, 40, ly, { continued: true, width: 80 });
    doc.font("Helvetica").text(` ${val}`, { width: 200 });
    ly += 14;
  }

  let ry = infoY;
  for (const [label, val] of right) {
    doc.font("Helvetica-Bold").text(label, 300, ry, { continued: true, width: 80 });
    doc.font("Helvetica").text(` ${val}`, { width: 200 });
    ry += 14;
  }

  let y = Math.max(ly, ry) + 10;

  // ---- Sendungen-Tabelle ----
  const cols: TableCol[] = [
    { header: "Pos", width: 35, align: "right" },
    { header: "Sendung-Nr.", width: 100 },
    { header: "Lieferant", width: 130 },
    { header: "Werk", width: 100 },
    { header: "Ri.", width: 35 },
    { header: "Gewicht (kg)", width: 75, align: "right" },
    { header: "LDM", width: 55, align: "right" },
  ];

  y = drawTableHeader(doc, cols, 40, y);

  let gesamtGewicht = 0;
  let gesamtLDM = 0;

  data.sendungen.forEach((s, i) => {
    y = checkPageBreak(doc, y);
    const gew = Number(s.gewicht || 0);
    const ldm = Number(s.lademeter || 0);
    gesamtGewicht += gew;
    gesamtLDM += ldm;

    y = drawTableRow(doc, cols, [
      String(i + 1),
      s.sendungNummer,
      s.lieferant?.name || "-",
      s.werk?.name || "-",
      s.richtungsArt,
      gew ? decDE(gew) : "",
      ldm ? decDE(ldm, 1) : "",
    ], 40, y, i % 2 === 1);
  });

  // ---- Summenzeile ----
  y += 4;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 6;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`Anzahl Sendungen: ${data.sendungen.length}`, 40, y);
  doc.text(`Gesamtgewicht: ${decDE(gesamtGewicht)} kg`, 250, y);
  doc.text(`Gesamt-LDM: ${decDE(gesamtLDM, 1)}`, 430, y);

  // ---- Unterschriften ----
  y += 40;
  y = checkPageBreak(doc, y, 80);
  doc.font("Helvetica").fontSize(9);

  doc.moveTo(40, y + 30).lineTo(220, y + 30).stroke();
  doc.text("Unterschrift Fahrer", 40, y + 34, { width: 180, align: "center" });

  doc.moveTo(340, y + 30).lineTo(520, y + 30).stroke();
  doc.text("Unterschrift Empfänger", 340, y + 34, { width: 180, align: "center" });

  // ---- Fußzeile ----
  doc.font("Helvetica").fontSize(7).fillColor("gray");
  doc.text(`Erstellt am ${datumDE(new Date())}`, 40, 780, { align: "center", width: 515 });
  doc.fillColor("black");

  doc.end();
  return doc;
}

// ============================================================
// 2. TU-Abrechnung-PDF
// ============================================================

export interface TuAbrechnungData {
  belegnummer: string;
  buchungsjahr: number;
  zeitraumVon: any;
  zeitraumBis: any;
  status: string;
  anzahlPositionen: number;
  gesamtbetrag: any;
  transportUnternehmer: {
    name: string;
    kurzbezeichnung: string;
    adresse?: string | null;
    plz?: string | null;
    ort?: string | null;
  };
  niederlassung?: {
    name: string;
    kurzbezeichnung: string;
  } | null;
  positionen: Array<{
    tourNummer: string;
    tourDatum: any;
    konditionName?: string | null;
    lastKilometer?: any;
    leerKilometer?: any;
    mautKilometer?: any;
    tourKosten: any;
    lastKmKosten: any;
    leerKmKosten: any;
    mautKmKosten: any;
    stoppKosten: any;
    gesamtKosten: any;
    istManuell: boolean;
  }>;
}

export function erstelleTuAbrechnungPdf(data: TuAbrechnungData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ---- Header ----
  doc.font("Helvetica-Bold").fontSize(16).text("ABT Automotive Logistik", { align: "center" });
  doc.fontSize(12).text("TU-Abrechnung", { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // ---- Info-Block ----
  doc.font("Helvetica").fontSize(9);
  const infoY = doc.y;

  const left = [
    ["Beleg-Nr.:", data.belegnummer],
    ["Buchungsjahr:", String(data.buchungsjahr)],
    ["Zeitraum:", `${datumDE(data.zeitraumVon)} - ${datumDE(data.zeitraumBis)}`],
    ["Status:", data.status],
  ];

  let ly = infoY;
  for (const [label, val] of left) {
    doc.font("Helvetica-Bold").text(label, 40, ly, { continued: true, width: 90 });
    doc.font("Helvetica").text(` ${val}`, { width: 200 });
    ly += 14;
  }

  // TU-Adresse rechts
  const tu = data.transportUnternehmer;
  doc.font("Helvetica-Bold").text("Transport-Unternehmer:", 300, infoY);
  doc.font("Helvetica").text(tu.name, 300, infoY + 14);
  if (tu.adresse) doc.text(tu.adresse, 300, infoY + 28);
  if (tu.plz || tu.ort) doc.text(`${tu.plz || ""} ${tu.ort || ""}`.trim(), 300, infoY + 42);

  let y = Math.max(ly, infoY + 56) + 10;

  // ---- Positionen-Tabelle ----
  const cols: TableCol[] = [
    { header: "Tour-Nr.", width: 80 },
    { header: "Datum", width: 65 },
    { header: "Kondition", width: 80 },
    { header: "Last-km", width: 50, align: "right" },
    { header: "Leer-km", width: 50, align: "right" },
    { header: "Maut-km", width: 50, align: "right" },
    { header: "Tour-K.", width: 60, align: "right" },
    { header: "Km-K.", width: 60, align: "right" },
    { header: "Gesamt", width: 70, align: "right" },
  ];

  y = drawTableHeader(doc, cols, 40, y);

  let summeGesamt = 0;

  data.positionen.forEach((pos, i) => {
    y = checkPageBreak(doc, y);
    const gesamt = Number(pos.gesamtKosten || 0);
    summeGesamt += gesamt;
    const kmKosten = Number(pos.lastKmKosten || 0) + Number(pos.leerKmKosten || 0) + Number(pos.mautKmKosten || 0);

    y = drawTableRow(doc, cols, [
      pos.tourNummer,
      datumDE(pos.tourDatum),
      pos.konditionName || (pos.istManuell ? "Manuell" : "-"),
      decDE(pos.lastKilometer),
      decDE(pos.leerKilometer),
      decDE(pos.mautKilometer),
      eurDE(pos.tourKosten),
      eurDE(kmKosten),
      eurDE(gesamt),
    ], 40, y, i % 2 === 1);
  });

  // ---- Gesamtbetrag ----
  y += 4;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 8;
  doc.font("Helvetica-Bold").fontSize(11);
  doc.text(`Gesamtbetrag: ${eurDE(data.gesamtbetrag)}`, 40, y, { align: "right", width: 515 });
  y += 20;

  doc.font("Helvetica").fontSize(9);
  doc.text(`Anzahl Positionen: ${data.positionen.length}`, 40, y);

  // ---- Zahlungsbedingungen ----
  y += 30;
  y = checkPageBreak(doc, y, 60);
  doc.font("Helvetica").fontSize(8).fillColor("gray");
  doc.text("Zahlungsbedingungen: 30 Tage netto", 40, y);
  doc.text("Bankverbindung: [wird konfiguriert]", 40, y + 12);

  // ---- Fußzeile ----
  doc.font("Helvetica").fontSize(7);
  doc.text(`Erstellt am ${datumDE(new Date())}`, 40, 780, { align: "center", width: 515 });
  doc.fillColor("black");

  doc.end();
  return doc;
}
