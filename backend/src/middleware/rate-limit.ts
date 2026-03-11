import rateLimit from "express-rate-limit";
import { Request, Response, NextFunction } from "express";

const isTest = process.env.NODE_ENV === "test";

// Passthrough-Middleware für Tests (Rate Limiting deaktiviert)
const noopMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

// Login: Max 5 Versuche / 15 Min / IP
export const loginLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Passwort-Ändern: Max 3 / Stunde / IP
export const passwortLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: "Zu viele Passwort-Änderungen. Bitte in einer Stunde erneut versuchen." },
  standardHeaders: true,
  legacyHeaders: false,
});

// API Global: Max 200 Requests / Min / IP
export const apiLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: "Zu viele Anfragen. Bitte kurz warten." },
  standardHeaders: true,
  legacyHeaders: false,
});
