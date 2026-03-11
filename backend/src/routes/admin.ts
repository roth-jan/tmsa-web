import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();
router.use(requireAuth);
router.use(requireRecht("benutzer", "bearbeiten")); // Nur Admins

// GET /api/admin/dsgvo-export/:benutzerId — Alle Daten eines Users als JSON
router.get("/dsgvo-export/:benutzerId", async (req: Request, res: Response) => {
  try {
    const benutzerId = req.params.benutzerId as string;

    const benutzer = await prisma.benutzer.findUnique({
      where: { id: benutzerId },
      include: {
        niederlassung: true,
        rollen: { include: { rolle: true } },
      },
    });

    if (!benutzer) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // Alle Audit-Log-Einträge dieses Benutzers
    const auditLogs = await prisma.auditLog.findMany({
      where: { benutzerId },
      orderBy: { zeitpunkt: "desc" },
    });

    // EDI-Importe dieses Benutzers
    const ediImporte = await prisma.ediImport.findMany({
      where: { benutzerId },
      orderBy: { erstelltAm: "desc" },
    });

    const exportData = {
      exportDatum: new Date().toISOString(),
      benutzer: {
        id: benutzer.id,
        benutzername: benutzer.benutzername,
        vorname: benutzer.vorname,
        nachname: benutzer.nachname,
        email: benutzer.email,
        aktiv: benutzer.aktiv,
        niederlassung: benutzer.niederlassung?.name || null,
        rollen: benutzer.rollen.map((br: any) => br.rolle.name),
        erstelltAm: benutzer.erstelltAm,
        geaendertAm: benutzer.geaendertAm,
      },
      auditLog: auditLogs.map((a) => ({
        modell: a.modell,
        aktion: a.aktion,
        zeitpunkt: a.zeitpunkt,
      })),
      ediImporte: ediImporte.map((e) => ({
        format: e.format,
        dateiname: e.dateiname,
        status: e.status,
        erstelltAm: e.erstelltAm,
      })),
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="dsgvo-export-${benutzer.benutzername}.json"`);
    return res.json({ data: exportData });
  } catch (err: any) {
    console.error("DSGVO-Export:", err);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/dsgvo-loeschen/:benutzerId — Anonymisierung
router.delete("/dsgvo-loeschen/:benutzerId", async (req: Request, res: Response) => {
  try {
    const benutzerId = req.params.benutzerId as string;

    const benutzer = await prisma.benutzer.findUnique({
      where: { id: benutzerId },
    });

    if (!benutzer) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    // Anonymisierung (keine echte Löschung wegen Audit-Trail)
    await prisma.benutzer.update({
      where: { id: benutzerId },
      data: {
        benutzername: `geloescht_${benutzerId.substring(0, 8)}`,
        vorname: "Gelöscht",
        nachname: "Gelöscht",
        email: null,
        passwortHash: "ANONYMISIERT",
        aktiv: false,
      },
    });

    // Audit-Log anonymisieren
    await prisma.auditLog.updateMany({
      where: { benutzerId },
      data: { benutzerName: "Gelöscht" },
    });

    // EDI-Import anonymisieren
    await prisma.ediImport.updateMany({
      where: { benutzerId },
      data: { benutzerName: "Gelöscht" },
    });

    // Rollen entfernen
    await prisma.benutzerRolle.deleteMany({
      where: { benutzerId },
    });

    return res.json({
      data: { message: `Benutzer ${benutzerId} wurde anonymisiert (DSGVO-konform)` },
    });
  } catch (err: any) {
    console.error("DSGVO-Löschung:", err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
