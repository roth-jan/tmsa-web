import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import session from "express-session";

import authRouter from "./routes/auth";
import benutzerRouter from "./routes/benutzer";
import avisRouter from "./routes/avis";
import tourRouter from "./routes/tour";
import mengenplanRouter from "./routes/mengenplan";
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
} from "./routes/stammdaten";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "fallback-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // true in production mit HTTPS
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8 Stunden
  },
}));

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
app.use("/api/avise", avisRouter);
app.use("/api/touren", tourRouter);
app.use("/api/mengenplan", mengenplanRouter);

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`TMSA Backend läuft auf http://localhost:${PORT}`);
});
