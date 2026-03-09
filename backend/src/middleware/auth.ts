import { Request, Response, NextFunction } from "express";

// Session-Typ erweitern
declare module "express-session" {
  interface SessionData {
    userId: string;
    benutzername: string;
    niederlassungId: string | null;
    rechte: string[];
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Nicht angemeldet" });
  }
  next();
}

export function requireRecht(modul: string, aktion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: "Nicht angemeldet" });
    }
    const recht = `${modul}.${aktion}`;
    if (!req.session.rechte?.includes(recht)) {
      return res.status(403).json({ error: `Keine Berechtigung: ${recht}` });
    }
    next();
  };
}
