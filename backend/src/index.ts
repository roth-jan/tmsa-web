import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { auditStore } from "./db";
import { apiLimiter } from "./middleware/rate-limit";
import { csrfProtection } from "./middleware/csrf";

import authRouter from "./routes/auth";
import benutzerRouter from "./routes/benutzer";
import auditRouter from "./routes/audit";
import avisRouter from "./routes/avis";
import tourRouter from "./routes/tour";
import mengenplanRouter from "./routes/mengenplan";
import nacharbeitRouter from "./routes/nacharbeit";
import abfahrtRouter from "./routes/abfahrt";
import sendungRouter from "./routes/sendung";
import tuabrechnungRouter from "./routes/tuabrechnung";
import berichteRouter from "./routes/berichte";
import gebrocheneVerkehreRouter from "./routes/gebrochene-verkehre";
import dashboardRouter from "./routes/dashboard";
import pdfRouter from "./routes/pdf";
import ediRouter from "./routes/edi";
import forecastRouter from "./routes/forecast";
import importRouter from "./routes/import";
import adminRouter from "./routes/admin";
import { startEdiWatcher } from "./services/edi-watcher";
import {
  niederlassungRouter,
  oemRouter,
  werkRouter,
  lieferantRouter,
  abladestelleRouter,
  transportUnternehmerRouter,
  kfzRouter,
  routeRouter,
  konditionRouter,
  dispoOrtRouter,
  dispoRegelRouter,
  umschlagPunktRouter,
  nummernkreisRouter,
} from "./routes/stammdaten";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
  exposedHeaders: ["Content-Disposition"],
}));
app.use(express.json());

// Rate Limiting global
app.use("/api", apiLimiter);

// Session-Store: PostgreSQL (persistent über Server-Neustarts)
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "session",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.COOKIE_SECURE === "true",
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
  },
}));

// CSRF-Protection (nach Session, vor Routes)
app.use(csrfProtection);

// Audit-Context Middleware: User-Infos für Prisma-Middleware durchreichen
app.use((req, _res, next) => {
  auditStore.run(
    { userId: req.session?.userId, benutzerName: req.session?.benutzername },
    () => next()
  );
});

// Routes
app.use("/api/auth", authRouter);
app.use("/api/benutzer", benutzerRouter);
app.use("/api/niederlassungen", niederlassungRouter);
app.use("/api/oems", oemRouter);
app.use("/api/werke", werkRouter);
app.use("/api/lieferanten", lieferantRouter);
app.use("/api/abladestellen", abladestelleRouter);
app.use("/api/transport-unternehmer", transportUnternehmerRouter);
app.use("/api/kfz", kfzRouter);
app.use("/api/routen", routeRouter);
app.use("/api/konditionen", konditionRouter);
app.use("/api/dispo-orte", dispoOrtRouter);
app.use("/api/dispo-regeln", dispoRegelRouter);
app.use("/api/umschlag-punkte", umschlagPunktRouter);
app.use("/api/nummernkreise", nummernkreisRouter);
app.use("/api/avise", avisRouter);
app.use("/api/touren", tourRouter);
app.use("/api/mengenplan", mengenplanRouter);
app.use("/api/nacharbeit", nacharbeitRouter);
app.use("/api/abfahrten", abfahrtRouter);
app.use("/api/sendungen", sendungRouter);
app.use("/api/tu-abrechnung", tuabrechnungRouter);
app.use("/api/berichte", berichteRouter);
app.use("/api/gebrochene-verkehre", gebrocheneVerkehreRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/pdf", pdfRouter);
app.use("/api/audit-log", auditRouter);
app.use("/api/edi", ediRouter);
app.use("/api/forecast", forecastRouter);
app.use("/api/import", importRouter);
app.use("/api/admin", adminRouter);

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`TMSA Backend läuft auf http://localhost:${PORT}`);

  // EDI-Watcher starten (nur wenn Verzeichnis konfiguriert)
  if (process.env.EDI_WATCH_DIR) {
    startEdiWatcher();
    console.log(`EDI-Watcher aktiv: ${process.env.EDI_WATCH_DIR} (Intervall: ${process.env.EDI_INTERVAL || 300000}ms)`);
  }
});
