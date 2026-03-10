import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

// User-Context für Audit-Logging
interface AuditContext {
  userId?: string;
  benutzerName?: string;
}

export const auditStore = new AsyncLocalStorage<AuditContext>();

const basePrisma = new PrismaClient();

// Models die geloggt werden sollen
const AUDITED_MODELS = new Set([
  "avis", "artikelzeile", "tour", "abfahrt", "bordero", "sendung",
  "tuAbrechnung", "tuAbrechnungsPosition",
  "benutzer", "rolle", "kondition",
  "dispoOrt", "dispoRegel", "umschlagPunkt", "streckenabschnitt",
  "niederlassung", "oem", "werk", "lieferant", "abladestelle",
  "transportUnternehmer", "kfz", "route",
]);

// Prisma Client Extension für Auto-Audit-Logging
const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);
        if (AUDITED_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1))) {
          logAudit(model, "create", result?.id, null, result);
        }
        return result;
      },
      async update({ model, args, query }) {
        let alterWert: any = null;
        if (AUDITED_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1)) && args.where) {
          try {
            alterWert = await (basePrisma as any)[model.charAt(0).toLowerCase() + model.slice(1)]
              .findUnique({ where: args.where });
          } catch { /* ignore */ }
        }
        const result = await query(args);
        if (AUDITED_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1))) {
          logAudit(model, "update", result?.id || (args.where as any)?.id, alterWert, result);
        }
        return result;
      },
      async delete({ model, args, query }) {
        let alterWert: any = null;
        if (AUDITED_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1)) && args.where) {
          try {
            alterWert = await (basePrisma as any)[model.charAt(0).toLowerCase() + model.slice(1)]
              .findUnique({ where: args.where });
          } catch { /* ignore */ }
        }
        const result = await query(args);
        if (AUDITED_MODELS.has(model.charAt(0).toLowerCase() + model.slice(1))) {
          logAudit(model, "delete", (args.where as any)?.id, alterWert, null);
        }
        return result;
      },
    },
  },
});

function logAudit(model: string, aktion: string, entitaetId: any, alterWert: any, neuerWert: any) {
  const ctx = auditStore.getStore() || {};
  basePrisma.auditLog.create({
    data: {
      modell: model,
      aktion,
      entitaetId: String(entitaetId || "unknown"),
      benutzerId: ctx.userId || null,
      benutzerName: ctx.benutzerName || null,
      alterWert: alterWert ? JSON.parse(JSON.stringify(alterWert)) : null,
      neuerWert: neuerWert ? JSON.parse(JSON.stringify(neuerWert)) : null,
    },
  }).catch((err) => {
    console.error("Audit-Log Fehler:", err);
  });
}

export default prisma;
