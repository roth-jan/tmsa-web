import fs from "fs";
import path from "path";
import prisma from "../db";
import { parseEdi, detectFormat, ParsedIFTSTAResult } from "./edi-parser";

const EDI_WATCH_DIR = process.env.EDI_WATCH_DIR || "/data/edi-eingang";
const EDI_ARCHIV_DIR = process.env.EDI_ARCHIV_DIR || "/data/edi-archiv";
const EDI_FEHLER_DIR = process.env.EDI_FEHLER_DIR || "/data/edi-fehler";
const EDI_INTERVAL = parseInt(process.env.EDI_INTERVAL || "300000"); // Default: 5 Min

let watcherInterval: NodeJS.Timeout | null = null;

function ensureDirs() {
  for (const dir of [EDI_WATCH_DIR, EDI_ARCHIV_DIR, EDI_FEHLER_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

async function processFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  const dateiname = path.basename(filePath);
  const content = fs.readFileSync(filePath, "utf-8");

  try {
    const format = detectFormat(content);
    if (format === "UNKNOWN") {
      return { success: false, error: `Format nicht erkannt: ${dateiname}` };
    }

    const result = parseEdi(content);

    // IFTSTA: Status-Updates
    if (result.format === "IFTSTA") {
      const iftsta = result as ParsedIFTSTAResult;
      let updatedCount = 0;
      const errors: string[] = [];

      for (const update of iftsta.statusUpdates) {
        try {
          const tour = await prisma.tour.findFirst({
            where: { tourNummer: update.referenz, geloeschtAm: null },
          });
          if (!tour) {
            errors.push(`Tour "${update.referenz}" nicht gefunden`);
            continue;
          }
          let newStatus: string | null = null;
          if (["1", "2", "3"].includes(update.statusCode)) newStatus = "abgefahren";
          else if (update.statusCode === "5") newStatus = "abgeschlossen";

          if (newStatus) {
            await prisma.tour.update({ where: { id: tour.id }, data: { status: newStatus } });
            updatedCount++;
          }
        } catch (err: any) {
          errors.push(err.message);
        }
      }

      await prisma.ediImport.create({
        data: {
          format: "IFTSTA",
          dateiname,
          status: errors.length === 0 ? "success" : updatedCount > 0 ? "partial" : "error",
          ergebnis: { updatedCount, errors, quelle: "auto-import" },
          rohdaten: content.substring(0, 5000),
        },
      });

      return { success: errors.length === 0 };
    }

    // Standard: Avis-Import
    const createdAvisIds: string[] = [];
    const errors: string[] = [];

    for (const avisData of (result as any).avise) {
      try {
        let werkId: string | undefined;
        if (avisData.werkscode) {
          const werk = await prisma.werk.findFirst({ where: { werkscode: avisData.werkscode } });
          if (werk) werkId = werk.id;
        }

        let lieferantId: string | undefined;
        if (avisData.lieferantNr) {
          const lief = await prisma.lieferant.findFirst({ where: { lieferantennummer: avisData.lieferantNr } });
          if (lief) lieferantId = lief.id;
        }

        if (!werkId) { errors.push(`Werk "${avisData.werkscode}" nicht gefunden`); continue; }
        if (!lieferantId) { errors.push(`Lieferant "${avisData.lieferantNr}" nicht gefunden`); continue; }

        const firstNl = await prisma.niederlassung.findFirst();
        if (!firstNl) { errors.push("Keine Niederlassung verfügbar"); continue; }

        const avis = await prisma.avis.create({
          data: {
            avisNummer: avisData.avisNummer,
            ladeDatum: new Date(avisData.ladeDatum),
            status: "offen",
            werkId,
            lieferantId,
            niederlassungId: firstNl.id,
            bemerkung: `EDI Auto-Import ${result.format} (${dateiname})`,
            artikelzeilen: {
              create: avisData.zeilen.map((z: any) => ({
                artikelBeschreibung: z.beschreibung,
                menge: z.menge,
                masseinheit: z.me || "ST",
                gewicht: z.gewicht || 0,
                gutArt: "VOLLGUT",
              })),
            },
          },
        });
        createdAvisIds.push(avis.id);
      } catch (err: any) {
        errors.push(err.message);
      }
    }

    await prisma.ediImport.create({
      data: {
        format: result.format,
        dateiname,
        status: errors.length === 0 ? "success" : createdAvisIds.length > 0 ? "partial" : "error",
        ergebnis: { createdAvisIds, errors, quelle: "auto-import" },
        rohdaten: content.substring(0, 5000),
      },
    });

    return { success: errors.length === 0, error: errors.length > 0 ? errors.join("; ") : undefined };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function pollDirectory() {
  if (!fs.existsSync(EDI_WATCH_DIR)) return;

  const files = fs.readdirSync(EDI_WATCH_DIR).filter((f) => !f.startsWith("."));
  if (files.length === 0) return;

  console.log(`[EDI-Watcher] ${files.length} Datei(en) gefunden in ${EDI_WATCH_DIR}`);

  for (const file of files) {
    const filePath = path.join(EDI_WATCH_DIR, file);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    console.log(`[EDI-Watcher] Verarbeite: ${file}`);
    const result = await processFile(filePath);

    if (result.success) {
      // Erfolgreich → Archiv
      const archivPath = path.join(EDI_ARCHIV_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${file}`);
      fs.renameSync(filePath, archivPath);
      console.log(`[EDI-Watcher] ✓ ${file} → Archiv`);
    } else {
      // Fehler → Fehler-Verzeichnis + Fehlerbericht
      const fehlerPath = path.join(EDI_FEHLER_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${file}`);
      fs.renameSync(filePath, fehlerPath);
      // Fehlerbericht schreiben
      const berichtPath = fehlerPath + ".fehler.txt";
      fs.writeFileSync(berichtPath, `Fehler beim Import von ${file}:\n${result.error}\n\nZeitpunkt: ${new Date().toISOString()}`);
      console.log(`[EDI-Watcher] ✗ ${file} → Fehler: ${result.error}`);
    }
  }
}

export function startEdiWatcher() {
  try {
    ensureDirs();
  } catch {
    console.log("[EDI-Watcher] Verzeichnisse nicht verfügbar — Watcher deaktiviert");
    return;
  }

  console.log(`[EDI-Watcher] Gestartet — Überwache ${EDI_WATCH_DIR} alle ${EDI_INTERVAL / 1000}s`);

  // Sofort einmal prüfen
  pollDirectory().catch((err) => console.error("[EDI-Watcher] Fehler:", err));

  // Dann im Intervall
  watcherInterval = setInterval(() => {
    pollDirectory().catch((err) => console.error("[EDI-Watcher] Fehler:", err));
  }, EDI_INTERVAL);
}

export function stopEdiWatcher() {
  if (watcherInterval) {
    clearInterval(watcherInterval);
    watcherInterval = null;
    console.log("[EDI-Watcher] Gestoppt");
  }
}
