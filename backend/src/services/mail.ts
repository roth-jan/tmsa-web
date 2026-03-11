import nodemailer from "nodemailer";

// ============================================================
// Mail-Service — SMTP-Integration mit Templates
// ============================================================

interface MailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getConfig(): MailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || "";
  const from = process.env.MAIL_FROM || user;

  if (!host) return null; // Mail deaktiviert wenn kein SMTP konfiguriert

  return {
    host,
    port,
    secure: port === 465,
    user,
    pass,
    from,
  };
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const config = getConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });

  return transporter;
}

// ============================================================
// Mail-Templates
// ============================================================

function tourStatusTemplate(tourNummer: string, neuerStatus: string, disponentName: string): { subject: string; html: string } {
  return {
    subject: `Tour ${tourNummer} — Status: ${neuerStatus}`,
    html: `
      <h2>Tour-Status geändert</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px;font-weight:bold;">Tour-Nr.:</td><td style="padding:4px 12px;">${tourNummer}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Neuer Status:</td><td style="padding:4px 12px;">${neuerStatus}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Disponent:</td><td style="padding:4px 12px;">${disponentName}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Zeitpunkt:</td><td style="padding:4px 12px;">${new Date().toLocaleString("de-DE")}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px;">— TMSA-Web (automatische Benachrichtigung)</p>
    `,
  };
}

function abrechnungTemplate(belegnummer: string, tuName: string, betrag: string): { subject: string; html: string } {
  return {
    subject: `TU-Abrechnung ${belegnummer} erstellt`,
    html: `
      <h2>TU-Abrechnung erstellt</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px;font-weight:bold;">Beleg-Nr.:</td><td style="padding:4px 12px;">${belegnummer}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Transport-Unternehmer:</td><td style="padding:4px 12px;">${tuName}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Gesamtbetrag:</td><td style="padding:4px 12px;">${betrag}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px;">— TMSA-Web (automatische Benachrichtigung)</p>
    `,
  };
}

function ediImportFehlerTemplate(dateiname: string, fehler: string): { subject: string; html: string } {
  return {
    subject: `EDI-Import Fehler: ${dateiname}`,
    html: `
      <h2>EDI-Import fehlgeschlagen</h2>
      <table style="border-collapse:collapse;">
        <tr><td style="padding:4px 12px;font-weight:bold;">Dateiname:</td><td style="padding:4px 12px;">${dateiname}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Fehler:</td><td style="padding:4px 12px;color:red;">${fehler}</td></tr>
        <tr><td style="padding:4px 12px;font-weight:bold;">Zeitpunkt:</td><td style="padding:4px 12px;">${new Date().toLocaleString("de-DE")}</td></tr>
      </table>
      <p style="color:#888;font-size:12px;margin-top:20px;">— TMSA-Web (automatische Benachrichtigung)</p>
    `,
  };
}

// ============================================================
// Öffentliche API
// ============================================================

export async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log(`[Mail] SMTP nicht konfiguriert — Mail an ${to} übersprungen: ${subject}`);
    return false;
  }

  const config = getConfig()!;

  try {
    await t.sendMail({
      from: config.from,
      to,
      subject,
      html,
    });
    console.log(`[Mail] Gesendet an ${to}: ${subject}`);
    return true;
  } catch (err: any) {
    console.error(`[Mail] Fehler beim Senden an ${to}:`, err.message);
    return false;
  }
}

export async function sendTourStatusMail(email: string, tourNummer: string, neuerStatus: string, disponentName: string): Promise<boolean> {
  const tpl = tourStatusTemplate(tourNummer, neuerStatus, disponentName);
  return sendMail(email, tpl.subject, tpl.html);
}

export async function sendAbrechnungMail(email: string, belegnummer: string, tuName: string, betrag: string): Promise<boolean> {
  const tpl = abrechnungTemplate(belegnummer, tuName, betrag);
  return sendMail(email, tpl.subject, tpl.html);
}

export async function sendEdiImportFehlerMail(adminEmail: string, dateiname: string, fehler: string): Promise<boolean> {
  const tpl = ediImportFehlerTemplate(dateiname, fehler);
  return sendMail(adminEmail, tpl.subject, tpl.html);
}

export async function verifySmtpConnection(): Promise<{ connected: boolean; error?: string }> {
  const t = getTransporter();
  if (!t) return { connected: false, error: "SMTP nicht konfiguriert" };

  try {
    await t.verify();
    return { connected: true };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
