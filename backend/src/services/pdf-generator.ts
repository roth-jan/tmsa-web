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

// ============================================================
// 3. CMR-Frachtbrief
// ============================================================

export interface CmrData {
  tourNummer: string;
  tourDatum: any;
  absender: { name: string; adresse?: string | null; plz?: string | null; ort?: string | null };
  empfaenger: { name: string; adresse?: string | null; plz?: string | null; ort?: string | null };
  frachtfuehrer: { name: string; adresse?: string | null; plz?: string | null; ort?: string | null };
  ortDerUebernahme: string;
  ortDerAblieferung: string;
  gueter: Array<{
    beschreibung: string;
    menge: number;
    masseinheit: string;
    gewicht: number;
  }>;
  kfzKennzeichen: string;
  routeBeschreibung: string;
  niederlassung: string;
}

export function erstelleCmrPdf(data: CmrData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 30 });

  // ---- Header ----
  doc.font("Helvetica-Bold").fontSize(14).text("CMR — INTERNATIONALER FRACHTBRIEF", { align: "center" });
  doc.font("Helvetica").fontSize(8).text("(Übereinkommen über den Beförderungsvertrag im internationalen Straßengüterverkehr)", { align: "center" });
  doc.moveDown(0.5);

  const boxW = 250;
  const leftX = 30;
  const rightX = 290;
  let y = doc.y + 5;

  // Feld 1: Absender
  doc.rect(leftX, y, boxW, 55).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("1  Absender (Name, Anschrift, Land)", leftX + 4, y + 3);
  doc.font("Helvetica").fontSize(9);
  doc.text(data.absender.name, leftX + 4, y + 14);
  if (data.absender.adresse) doc.text(data.absender.adresse, leftX + 4, y + 26);
  if (data.absender.plz || data.absender.ort) doc.text(`${data.absender.plz || ""} ${data.absender.ort || ""}`.trim(), leftX + 4, y + 38);

  // Feld 16: Frachtführer
  doc.rect(rightX, y, boxW, 55).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("16  Frachtführer (Name, Anschrift, Land)", rightX + 4, y + 3);
  doc.font("Helvetica").fontSize(9);
  doc.text(data.frachtfuehrer.name, rightX + 4, y + 14);
  if (data.frachtfuehrer.adresse) doc.text(data.frachtfuehrer.adresse, rightX + 4, y + 26);
  if (data.frachtfuehrer.plz || data.frachtfuehrer.ort) doc.text(`${data.frachtfuehrer.plz || ""} ${data.frachtfuehrer.ort || ""}`.trim(), rightX + 4, y + 38);

  y += 58;

  // Feld 2: Empfänger
  doc.rect(leftX, y, boxW, 55).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("2  Empfänger (Name, Anschrift, Land)", leftX + 4, y + 3);
  doc.font("Helvetica").fontSize(9);
  doc.text(data.empfaenger.name, leftX + 4, y + 14);
  if (data.empfaenger.adresse) doc.text(data.empfaenger.adresse, leftX + 4, y + 26);
  if (data.empfaenger.plz || data.empfaenger.ort) doc.text(`${data.empfaenger.plz || ""} ${data.empfaenger.ort || ""}`.trim(), leftX + 4, y + 38);

  // Feld 17: Nachfolgende Frachtführer
  doc.rect(rightX, y, boxW, 55).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("17  Nachfolgende Frachtführer", rightX + 4, y + 3);

  y += 58;

  // Feld 3: Ort der Übernahme
  doc.rect(leftX, y, boxW, 30).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("3  Ort der Übernahme des Gutes", leftX + 4, y + 3);
  doc.font("Helvetica").fontSize(9).text(data.ortDerUebernahme, leftX + 4, y + 14);

  // Feld 18: KFZ
  doc.rect(rightX, y, boxW, 30).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("18  Kennzeichen KFZ / Auflieger", rightX + 4, y + 3);
  doc.font("Helvetica").fontSize(9).text(data.kfzKennzeichen, rightX + 4, y + 14);

  y += 33;

  // Feld 4: Ort der Ablieferung
  doc.rect(leftX, y, boxW, 30).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("4  Ort und Datum der Ablieferung", leftX + 4, y + 3);
  doc.font("Helvetica").fontSize(9).text(`${data.ortDerAblieferung}, ${datumDE(data.tourDatum)}`, leftX + 4, y + 14);

  // Tour-Nr + Route
  doc.rect(rightX, y, boxW, 30).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("Tour / Route", rightX + 4, y + 3);
  doc.font("Helvetica").fontSize(9).text(`${data.tourNummer} — ${data.routeBeschreibung}`, rightX + 4, y + 14);

  y += 35;

  // Gütertabelle (Felder 6-12)
  doc.font("Helvetica-Bold").fontSize(7).text("6-12  Güterbezeichnung, Menge, Gewicht", leftX + 4, y);
  y += 12;

  const gueterCols: TableCol[] = [
    { header: "Pos", width: 35, align: "right" },
    { header: "Bezeichnung", width: 200 },
    { header: "Menge", width: 60, align: "right" },
    { header: "ME", width: 40 },
    { header: "Gewicht (kg)", width: 80, align: "right" },
  ];

  y = drawTableHeader(doc, gueterCols, leftX, y);

  let gesamtGewicht = 0;
  data.gueter.forEach((g, i) => {
    y = checkPageBreak(doc, y);
    gesamtGewicht += g.gewicht;
    y = drawTableRow(doc, gueterCols, [
      String(i + 1),
      g.beschreibung,
      String(g.menge),
      g.masseinheit,
      g.gewicht ? decDE(g.gewicht) : "",
    ], leftX, y, i % 2 === 1);
  });

  y += 6;
  doc.font("Helvetica-Bold").fontSize(9).text(`Gesamtgewicht: ${decDE(gesamtGewicht)} kg`, leftX + 4, y);

  // Unterschriften
  y += 30;
  y = checkPageBreak(doc, y, 100);

  const sigW = 160;
  doc.font("Helvetica").fontSize(8);

  doc.rect(leftX, y, sigW, 50).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("22  Unterschrift Absender", leftX + 4, y + 3);
  doc.font("Helvetica").fontSize(8).text(datumDE(data.tourDatum), leftX + 4, y + 36);

  doc.rect(leftX + sigW + 5, y, sigW, 50).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("23  Unterschrift Frachtführer", leftX + sigW + 9, y + 3);

  doc.rect(leftX + 2 * (sigW + 5), y, sigW, 50).stroke();
  doc.font("Helvetica-Bold").fontSize(7).text("24  Unterschrift Empfänger", leftX + 2 * (sigW + 5) + 4, y + 3);

  // Fußzeile
  doc.font("Helvetica").fontSize(7).fillColor("gray");
  doc.text(`Erstellt am ${datumDE(new Date())} — ${data.niederlassung}`, 30, 780, { align: "center", width: 535 });
  doc.fillColor("black");

  doc.end();
  return doc;
}

// ============================================================
// 4. Tourbegleitschein
// ============================================================

export interface TourbegleitscheinData {
  tourNummer: string;
  tourDatum: any;
  status: string;
  kfz: string;
  tu: string;
  route: string;
  routeBeschreibung: string;
  niederlassung: string;
  avise: Array<{
    avisNummer: string;
    lieferant: string;
    werk: string;
    zeilen: Array<{
      beschreibung: string;
      menge: number;
      me: string;
      gewicht: number;
    }>;
  }>;
}

export function erstelleTourbegleitscheinPdf(data: TourbegleitscheinData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Header
  doc.font("Helvetica-Bold").fontSize(16).text("ABT Automotive Logistik", { align: "center" });
  doc.fontSize(12).text("Tourbegleitschein", { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // Info-Block
  doc.font("Helvetica").fontSize(9);
  const infoY = doc.y;
  const left = [
    ["Tour-Nr.:", data.tourNummer],
    ["Datum:", datumDE(data.tourDatum)],
    ["Status:", data.status],
  ];
  const right = [
    ["KFZ:", data.kfz],
    ["TU:", data.tu],
    ["Route:", `${data.route} ${data.routeBeschreibung}`],
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

  let y = Math.max(ly, ry) + 15;

  // Avise mit Artikelzeilen
  const cols: TableCol[] = [
    { header: "Pos", width: 35, align: "right" },
    { header: "Artikel", width: 180 },
    { header: "Menge", width: 60, align: "right" },
    { header: "ME", width: 40 },
    { header: "Gewicht (kg)", width: 80, align: "right" },
  ];

  let posNr = 0;
  for (const avis of data.avise) {
    y = checkPageBreak(doc, y, 40);

    doc.font("Helvetica-Bold").fontSize(9);
    doc.text(`Avis ${avis.avisNummer} — ${avis.lieferant} → ${avis.werk}`, 40, y);
    y += 14;

    y = drawTableHeader(doc, cols, 40, y);

    for (const z of avis.zeilen) {
      y = checkPageBreak(doc, y);
      posNr++;
      y = drawTableRow(doc, cols, [
        String(posNr),
        z.beschreibung,
        String(z.menge),
        z.me,
        z.gewicht ? decDE(z.gewicht) : "",
      ], 40, y, posNr % 2 === 0);
    }
    y += 10;
  }

  // Summe
  y += 4;
  doc.moveTo(40, y).lineTo(555, y).stroke();
  y += 6;
  doc.font("Helvetica-Bold").fontSize(9);
  doc.text(`Gesamt: ${data.avise.length} Avis(e), ${posNr} Artikelzeile(n)`, 40, y);

  // Unterschriften
  y += 30;
  y = checkPageBreak(doc, y, 60);
  doc.font("Helvetica").fontSize(9);
  doc.moveTo(40, y + 30).lineTo(220, y + 30).stroke();
  doc.text("Unterschrift Fahrer", 40, y + 34, { width: 180, align: "center" });
  doc.moveTo(340, y + 30).lineTo(520, y + 30).stroke();
  doc.text("Stempel/Unterschrift Empfänger", 340, y + 34, { width: 180, align: "center" });

  // Fußzeile
  doc.font("Helvetica").fontSize(7).fillColor("gray");
  doc.text(`Erstellt am ${datumDE(new Date())} — ${data.niederlassung}`, 40, 780, { align: "center", width: 515 });
  doc.fillColor("black");

  doc.end();
  return doc;
}

// ============================================================
// 5. Lieferschein
// ============================================================

export interface LieferscheinData {
  sendungNummer: string;
  datum: any;
  lieferant: { name: string; adresse?: string | null; plz?: string | null; ort?: string | null };
  werk: { name: string; adresse?: string | null; plz?: string | null; ort?: string | null };
  abladestelle: string;
  gewicht: number;
  lademeter: number;
  borderoNummer: string;
  niederlassung: string;
}

export function erstelleLieferscheinPdf(data: LieferscheinData): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // Header
  doc.font("Helvetica-Bold").fontSize(16).text("ABT Automotive Logistik", { align: "center" });
  doc.fontSize(12).text("Lieferschein", { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // Info
  doc.font("Helvetica").fontSize(9);
  const lsInfoY = doc.y;

  const lsLeft = [
    ["Sendung-Nr.:", data.sendungNummer],
    ["Datum:", datumDE(data.datum)],
    ["Bordero:", data.borderoNummer],
  ];
  const lsRight = [
    ["Gewicht:", data.gewicht ? `${decDE(data.gewicht)} kg` : "—"],
    ["Lademeter:", data.lademeter ? decDE(data.lademeter, 1) : "—"],
    ["Abladestelle:", data.abladestelle || "—"],
  ];

  let lsly = lsInfoY;
  for (const [label, val] of lsLeft) {
    doc.font("Helvetica-Bold").text(label, 40, lsly, { continued: true, width: 90 });
    doc.font("Helvetica").text(` ${val}`, { width: 200 });
    lsly += 14;
  }
  let lsry = lsInfoY;
  for (const [label, val] of lsRight) {
    doc.font("Helvetica-Bold").text(label, 300, lsry, { continued: true, width: 90 });
    doc.font("Helvetica").text(` ${val}`, { width: 200 });
    lsry += 14;
  }

  let lsy = Math.max(lsly, lsry) + 15;

  // Lieferant / Empfänger
  const boxWidth = 240;
  doc.rect(40, lsy, boxWidth, 60).stroke();
  doc.font("Helvetica-Bold").fontSize(8).text("Lieferant:", 44, lsy + 4);
  doc.font("Helvetica").fontSize(9);
  doc.text(data.lieferant.name, 44, lsy + 16);
  if (data.lieferant.adresse) doc.text(data.lieferant.adresse, 44, lsy + 28);
  if (data.lieferant.plz || data.lieferant.ort) doc.text(`${data.lieferant.plz || ""} ${data.lieferant.ort || ""}`.trim(), 44, lsy + 40);

  doc.rect(300, lsy, boxWidth, 60).stroke();
  doc.font("Helvetica-Bold").fontSize(8).text("Empfänger:", 304, lsy + 4);
  doc.font("Helvetica").fontSize(9);
  doc.text(data.werk.name, 304, lsy + 16);
  if (data.werk.adresse) doc.text(data.werk.adresse, 304, lsy + 28);
  if (data.werk.plz || data.werk.ort) doc.text(`${data.werk.plz || ""} ${data.werk.ort || ""}`.trim(), 304, lsy + 40);

  // Unterschriften
  lsy += 100;
  doc.font("Helvetica").fontSize(9);
  doc.moveTo(40, lsy + 30).lineTo(220, lsy + 30).stroke();
  doc.text("Unterschrift Absender", 40, lsy + 34, { width: 180, align: "center" });
  doc.moveTo(340, lsy + 30).lineTo(520, lsy + 30).stroke();
  doc.text("Unterschrift Empfänger", 340, lsy + 34, { width: 180, align: "center" });

  // Fußzeile
  doc.font("Helvetica").fontSize(7).fillColor("gray");
  doc.text(`Erstellt am ${datumDE(new Date())} — ${data.niederlassung}`, 40, 780, { align: "center", width: 515 });
  doc.fillColor("black");

  doc.end();
  return doc;
}
