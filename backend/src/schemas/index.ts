import { z } from "zod";
import { Request, Response, NextFunction } from "express";

// ============================================================
// Passwort-Policy
// ============================================================

export const passwortPolicy = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
  .regex(/[A-Z]/, "Passwort muss mindestens einen Großbuchstaben enthalten")
  .regex(/[0-9]/, "Passwort muss mindestens eine Zahl enthalten")
  .regex(/[^A-Za-z0-9]/, "Passwort muss mindestens ein Sonderzeichen enthalten");

export function validatePasswort(passwort: string): { valid: boolean; error?: string } {
  const result = passwortPolicy.safeParse(passwort);
  if (!result.success) {
    return { valid: false, error: result.error.errors[0].message };
  }
  return { valid: true };
}

// ============================================================
// Auth Schemas
// ============================================================

export const loginSchema = z.object({
  benutzername: z.string().min(1, "Benutzername erforderlich"),
  passwort: z.string().min(1, "Passwort erforderlich"),
});

export const passwortAendernSchema = z.object({
  altesPasswort: z.string().min(1, "Altes Passwort erforderlich"),
  neuesPasswort: passwortPolicy,
});

// ============================================================
// Benutzer Schemas
// ============================================================

export const benutzerErstellenSchema = z.object({
  benutzername: z.string().min(2, "Benutzername muss mindestens 2 Zeichen haben"),
  passwort: passwortPolicy,
  vorname: z.string().min(1, "Vorname ist Pflicht"),
  nachname: z.string().min(1, "Nachname ist Pflicht"),
  email: z.string().email("Ungültige E-Mail").nullable().optional(),
  niederlassungId: z.string().uuid().nullable().optional(),
  rollenIds: z.array(z.string().uuid()).optional(),
  aktiv: z.boolean().optional(),
});

export const benutzerBearbeitenSchema = z.object({
  benutzername: z.string().min(2).optional(),
  passwort: passwortPolicy.optional(),
  vorname: z.string().min(1).optional(),
  nachname: z.string().min(1).optional(),
  email: z.string().email().nullable().optional(),
  niederlassungId: z.string().uuid().nullable().optional(),
  rollenIds: z.array(z.string().uuid()).optional(),
  aktiv: z.boolean().optional(),
});

// ============================================================
// Stammdaten Schemas
// ============================================================

export const niederlassungSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  kurzbezeichnung: z.string().min(1, "Kurzbezeichnung ist Pflicht"),
  adresse: z.string().nullable().optional(),
  plz: z.string().nullable().optional(),
  ort: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const oemSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  kurzbezeichnung: z.string().min(1, "Kurzbezeichnung ist Pflicht"),
  ediKennung: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const werkSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  oemId: z.string().uuid("Ungültige OEM-ID"),
  werkscode: z.string().nullable().optional(),
  adresse: z.string().nullable().optional(),
  plz: z.string().nullable().optional(),
  ort: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const lieferantSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  lieferantennummer: z.string().nullable().optional(),
  adresse: z.string().nullable().optional(),
  plz: z.string().nullable().optional(),
  ort: z.string().nullable().optional(),
  land: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const abladestelleSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  werkId: z.string().uuid("Ungültige Werk-ID"),
  entladeZone: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const tuSchema = z.object({
  name: z.string().min(1, "Name ist Pflicht"),
  kurzbezeichnung: z.string().min(1, "Kurzbezeichnung ist Pflicht"),
  adresse: z.string().nullable().optional(),
  plz: z.string().nullable().optional(),
  ort: z.string().nullable().optional(),
  niederlassungId: z.string().uuid("Ungültige Niederlassungs-ID"),
  aktiv: z.boolean().optional(),
});

export const kfzSchema = z.object({
  kennzeichen: z.string().min(1, "Kennzeichen ist Pflicht"),
  transportUnternehmerId: z.string().uuid("Ungültige TU-ID"),
  fabrikat: z.string().nullable().optional(),
  lkwTyp: z.string().nullable().optional(),
  maxLdm: z.number().nullable().optional(),
  maxGewicht: z.number().nullable().optional(),
  schadstoffklasse: z.string().nullable().optional(),
  aktiv: z.boolean().optional(),
});

export const routeSchema = z.object({
  routennummer: z.string().min(1, "Routennummer ist Pflicht"),
  oemId: z.string().uuid("Ungültige OEM-ID"),
  beschreibung: z.string().nullable().optional(),
  kilometerLast: z.number().nullable().optional(),
  kilometerLeer: z.number().nullable().optional(),
  kilometerMaut: z.number().nullable().optional(),
  aktiv: z.boolean().optional(),
});

// ============================================================
// Avis / Tour Schemas
// ============================================================

export const avisSchema = z.object({
  avisNummer: z.string().min(1, "Avis-Nummer ist Pflicht"),
  ladeDatum: z.string().or(z.date()),
  lieferantId: z.string().uuid(),
  werkId: z.string().uuid(),
  abladestelleId: z.string().uuid().nullable().optional(),
  routeId: z.string().uuid().nullable().optional(),
  bemerkung: z.string().nullable().optional(),
  artikelzeilen: z.array(z.object({
    artikelBeschreibung: z.string().min(1),
    menge: z.number().positive(),
    masseinheit: z.string().optional(),
    gewicht: z.number().nullable().optional(),
    volumen: z.number().nullable().optional(),
    gutArt: z.string().optional(),
  })).optional(),
});

export const tourSchema = z.object({
  tourNummer: z.string().min(1, "Tour-Nummer ist Pflicht"),
  tourDatum: z.string().or(z.date()),
  kfzId: z.string().uuid().nullable().optional(),
  transportUnternehmerId: z.string().uuid().nullable().optional(),
  konditionId: z.string().uuid().nullable().optional(),
  routeId: z.string().uuid().nullable().optional(),
  bemerkungIntern: z.string().nullable().optional(),
  bemerkungExtern: z.string().nullable().optional(),
});

// ============================================================
// Validation Middleware Factory
// ============================================================

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      return res.status(400).json({ error: errors[0], details: errors });
    }
    next();
  };
}
