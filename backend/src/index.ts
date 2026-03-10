import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";
import { auditStore } from "./db";

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
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
  },
}));

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

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`TMSA Backend läuft auf http://localhost:${PORT}`);
});
