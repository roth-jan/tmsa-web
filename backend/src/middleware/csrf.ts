import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE = "tmsa-csrf";
const CSRF_HEADER = "x-csrf-token";

// Setzt CSRF-Token als Cookie nach erfolgreichem Login
export function setCsrfToken(req: Request, res: Response): void {
  const token = crypto.randomBytes(32).toString("hex");
  (req.session as any).csrfToken = token;
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // Frontend muss den Cookie lesen können
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden (wie Session)
  });
}

// Middleware: Prüft CSRF-Token bei Mutationen (POST/PUT/DELETE/PATCH)
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // In Tests deaktiviert
  if (process.env.NODE_ENV === "test") {
    return next();
  }

  // Sichere Methoden (GET, HEAD, OPTIONS) überspringen
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  // Login-Endpoint überspringen (hat noch kein Token)
  if (req.path === "/api/auth/login") {
    return next();
  }

  // Nicht-authentifizierte Requests überspringen
  if (!req.session?.userId) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER] as string;
  const sessionToken = (req.session as any).csrfToken;

  if (!headerToken || !sessionToken || headerToken !== sessionToken) {
    res.status(403).json({ error: "CSRF-Token ungültig oder fehlt" });
    return;
  }

  next();
}
