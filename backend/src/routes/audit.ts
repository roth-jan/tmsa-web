import { Router, Request, Response } from "express";
import { requireAuth, requireRecht } from "../middleware/auth";
import prisma from "../db";

const router = Router();

// GET /api/audit-log
router.get("/", requireAuth, requireRecht("auditlog", "lesen"), async (req: Request, res: Response) => {
  try {
    const { modell, entitaetId, benutzerId, von, bis, page = "1", limit = "50" } = req.query as any;

    const where: any = {};
    if (modell) where.modell = modell;
    if (entitaetId) where.entitaetId = entitaetId;
    if (benutzerId) where.benutzerId = benutzerId;
    if (von || bis) {
      where.zeitpunkt = {};
      if (von) where.zeitpunkt.gte = new Date(von);
      if (bis) where.zeitpunkt.lte = new Date(bis + "T23:59:59");
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { zeitpunkt: "desc" },
        skip,
        take: limitNum,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({ data, total, page: pageNum, limit: limitNum });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
