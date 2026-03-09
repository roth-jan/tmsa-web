import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

// GET /api/benutzer — Liste aller Benutzer
router.get("/", requireAuth, requireRecht("benutzer", "lesen"), async (_req: Request, res: Response) => {
  try {
    const benutzer = await prisma.benutzer.findMany({
      include: {
        niederlassung: true,
        rollen: { include: { rolle: true } },
      },
      orderBy: { nachname: "asc" },
    });

    return res.json({
      data: benutzer.map((b) => ({
        id: b.id,
        benutzername: b.benutzername,
        vorname: b.vorname,
        nachname: b.nachname,
        email: b.email,
        aktiv: b.aktiv,
        niederlassungId: b.niederlassungId,
        niederlassung: b.niederlassung,
        rollen: b.rollen.map((br) => br.rolle),
        erstelltAm: b.erstelltAm,
      })),
    });
  } catch (error) {
    console.error("Benutzer Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// GET /api/rollen — Alle Rollen
router.get("/rollen", requireAuth, async (_req: Request, res: Response) => {
  try {
    const rollen = await prisma.rolle.findMany({
      include: { rechte: { include: { recht: true } } },
      orderBy: { name: "asc" },
    });

    return res.json({
      data: rollen.map((r) => ({
        id: r.id,
        name: r.name,
        beschreibung: r.beschreibung,
        rechteAnzahl: r.rechte.length,
      })),
    });
  } catch (error) {
    console.error("Rollen Liste:", error);
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// POST /api/benutzer — Neuen Benutzer anlegen
router.post("/", requireAuth, requireRecht("benutzer", "erstellen"), async (req: Request, res: Response) => {
  try {
    const { benutzername, passwort, vorname, nachname, email, niederlassungId, rollenIds, aktiv } = req.body;

    if (!benutzername || !passwort || !vorname || !nachname) {
      return res.status(400).json({ error: "Benutzername, Passwort, Vorname und Nachname sind Pflicht" });
    }

    const passwortHash = await bcrypt.hash(passwort, 10);

    const benutzer = await prisma.benutzer.create({
      data: {
        benutzername,
        passwortHash,
        vorname,
        nachname,
        email: email || null,
        niederlassungId: niederlassungId || null,
        aktiv: aktiv !== false,
      },
    });

    // Rollen zuweisen
    if (rollenIds?.length) {
      await prisma.benutzerRolle.createMany({
        data: rollenIds.map((rolleId: string) => ({ benutzerId: benutzer.id, rolleId })),
      });
    }

    return res.status(201).json({ data: benutzer });
  } catch (error: any) {
    console.error("Benutzer erstellen:", error);
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Benutzername bereits vergeben" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// PUT /api/benutzer/:id — Benutzer bearbeiten
router.put("/:id", requireAuth, requireRecht("benutzer", "bearbeiten"), async (req: Request, res: Response) => {
  try {
    const { benutzername, passwort, vorname, nachname, email, niederlassungId, rollenIds, aktiv } = req.body;

    const updateData: any = {};
    if (benutzername !== undefined) updateData.benutzername = benutzername;
    if (vorname !== undefined) updateData.vorname = vorname;
    if (nachname !== undefined) updateData.nachname = nachname;
    if (email !== undefined) updateData.email = email || null;
    if (niederlassungId !== undefined) updateData.niederlassungId = niederlassungId || null;
    if (aktiv !== undefined) updateData.aktiv = aktiv;

    // Passwort nur ändern wenn angegeben
    if (passwort) {
      updateData.passwortHash = await bcrypt.hash(passwort, 10);
    }

    const benutzer = await prisma.benutzer.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // Rollen aktualisieren (alle löschen, neu setzen)
    if (rollenIds !== undefined) {
      await prisma.benutzerRolle.deleteMany({ where: { benutzerId: benutzer.id } });
      if (rollenIds.length) {
        await prisma.benutzerRolle.createMany({
          data: rollenIds.map((rolleId: string) => ({ benutzerId: benutzer.id, rolleId })),
        });
      }
    }

    return res.json({ data: benutzer });
  } catch (error: any) {
    console.error("Benutzer bearbeiten:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Benutzername bereits vergeben" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

// DELETE /api/benutzer/:id — Benutzer deaktivieren
router.delete("/:id", requireAuth, requireRecht("benutzer", "loeschen"), async (req: Request, res: Response) => {
  try {
    await prisma.benutzer.update({
      where: { id: req.params.id },
      data: { aktiv: false },
    });
    return res.json({ data: { message: "Benutzer deaktiviert" } });
  } catch (error: any) {
    console.error("Benutzer deaktivieren:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }
    return res.status(500).json({ error: "Serverfehler" });
  }
});

export default router;
