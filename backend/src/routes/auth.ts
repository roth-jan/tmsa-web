import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import prisma from "../db";
import { requireAuth } from "../middleware/auth";
import { loginLimiter, passwortLimiter } from "../middleware/rate-limit";
import { setCsrfToken } from "../middleware/csrf";
import { loginSchema, passwortAendernSchema, validatePasswort } from "../schemas";

const router = Router();

// POST /api/auth/login
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { benutzername, passwort } = parsed.data;

    const benutzer = await prisma.benutzer.findUnique({
      where: { benutzername },
      include: {
        niederlassung: true,
        rollen: {
          include: {
            rolle: {
              include: {
                rechte: {
                  include: { recht: true },
                },
              },
            },
          },
        },
      },
    });

    if (!benutzer || !benutzer.aktiv) {
      return res.status(401).json({ error: "Benutzername oder Passwort falsch" });
    }

    const passwortKorrekt = await bcrypt.compare(passwort, benutzer.passwortHash);
    if (!passwortKorrekt) {
      return res.status(401).json({ error: "Benutzername oder Passwort falsch" });
    }

    // Rechte sammeln
    const rechte = benutzer.rollen.flatMap((br) =>
      br.rolle.rechte.map((rr) => `${rr.recht.modul}.${rr.recht.aktion}`)
    );

    // Session setzen
    req.session.userId = benutzer.id;
    req.session.benutzername = benutzer.benutzername;
    req.session.niederlassungId = benutzer.niederlassungId;
    req.session.rechte = rechte;

    // CSRF-Token setzen
    setCsrfToken(req, res);

    return res.json({
      data: {
        id: benutzer.id,
        benutzername: benutzer.benutzername,
        vorname: benutzer.vorname,
        nachname: benutzer.nachname,
        niederlassung: benutzer.niederlassung?.name || null,
        niederlassungId: benutzer.niederlassungId,
        rechte,
        csrfToken: (req.session as any).csrfToken,
      },
    });
  } catch (error) {
    console.error("Login-Fehler:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Logout fehlgeschlagen" });
    }
    res.clearCookie("connect.sid");
    res.clearCookie("tmsa-csrf");
    return res.json({ data: { message: "Abgemeldet" } });
  });
});

// GET /api/auth/me
router.get("/me", async (req: Request, res: Response) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht angemeldet" });
  }

  const benutzer = await prisma.benutzer.findUnique({
    where: { id: req.session.userId },
    include: { niederlassung: true },
  });

  if (!benutzer) {
    return res.status(401).json({ error: "Benutzer nicht gefunden" });
  }

  // CSRF Token generieren falls Session aus der Zeit vor PostgreSQL-Sessions stammt
  if (!(req.session as any).csrfToken) {
    const { randomBytes } = await import("node:crypto");
    (req.session as any).csrfToken = randomBytes(32).toString("hex");
  }

  return res.json({
    data: {
      id: benutzer.id,
      benutzername: benutzer.benutzername,
      vorname: benutzer.vorname,
      nachname: benutzer.nachname,
      niederlassung: benutzer.niederlassung?.name || null,
      niederlassungId: req.session.niederlassungId ?? benutzer.niederlassungId,
      rechte: req.session.rechte || [],
      csrfToken: (req.session as any).csrfToken,
    },
  });
});

// POST /api/auth/passwort-aendern
router.post("/passwort-aendern", requireAuth, passwortLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = passwortAendernSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0].message });
    }

    const { altesPasswort, neuesPasswort } = parsed.data;

    const benutzer = await prisma.benutzer.findUnique({
      where: { id: req.session.userId },
    });

    if (!benutzer) {
      return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    const altesKorrekt = await bcrypt.compare(altesPasswort, benutzer.passwortHash);
    if (!altesKorrekt) {
      return res.status(400).json({ error: "Altes Passwort ist falsch" });
    }

    const neuerHash = await bcrypt.hash(neuesPasswort, 10);
    await prisma.benutzer.update({
      where: { id: req.session.userId },
      data: { passwortHash: neuerHash },
    });

    return res.json({ data: { message: "Passwort wurde geändert" } });
  } catch (error) {
    console.error("Passwort ändern:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// POST /api/auth/nl-wechseln — Admin kann Niederlassung temporär wechseln
router.post("/nl-wechseln", requireAuth, async (req: Request, res: Response) => {
  try {
    const { niederlassungId } = req.body;

    if (!req.session.rechte?.includes("benutzer.bearbeiten")) {
      return res.status(403).json({ error: "Nur Admins können die Niederlassung wechseln" });
    }

    if (niederlassungId === null || niederlassungId === "") {
      req.session.niederlassungId = null;
    } else {
      const nl = await prisma.niederlassung.findUnique({ where: { id: niederlassungId } });
      if (!nl) {
        return res.status(404).json({ error: "Niederlassung nicht gefunden" });
      }
      req.session.niederlassungId = niederlassungId;
    }

    return res.json({ data: { niederlassungId: req.session.niederlassungId } });
  } catch (error) {
    console.error("NL-Wechsel:", error);
    return res.status(500).json({ error: "Interner Serverfehler" });
  }
});

export default router;
