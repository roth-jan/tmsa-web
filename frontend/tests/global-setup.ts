import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function globalSetup() {
  const backendDir = path.resolve(__dirname, "../../backend");
  console.log("Resetting database for clean test state...");

  // Drop all data via TRUNCATE CASCADE, then re-seed
  execSync(
    `npx tsx -e "
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      prisma.\\$executeRawUnsafe('TRUNCATE TABLE \\"session\\", \\"Storno\\", \\"Nummernkreis\\", \\"ForecastDetail\\", \\"Forecast\\", \\"AuditLog\\", \\"EdiImport\\", \\"TuAbrechnungsPosition\\", \\"TuAbrechnung\\", \\"Streckenabschnitt\\", \\"Sendung\\", \\"Bordero\\", \\"Abfahrt\\", \\"Artikelzeile\\", \\"Tour\\", \\"Avis\\", \\"Kondition\\", \\"DispoRegel\\", \\"DispoOrt\\", \\"UmschlagPunkt\\", \\"Kfz\\", \\"TransportUnternehmer\\", \\"Route\\", \\"Abladestelle\\", \\"Werk\\", \\"Oem\\", \\"RolleRecht\\", \\"BenutzerRolle\\", \\"Recht\\", \\"Benutzer\\", \\"Rolle\\", \\"Niederlassung\\" CASCADE')
      .then(() => prisma.\\$disconnect())
      .then(() => console.log('Tables truncated'));
    "`,
    { cwd: backendDir, stdio: "inherit" }
  );

  // Re-seed with fresh data
  execSync("npx tsx src/seed.ts", { cwd: backendDir, stdio: "inherit" });
  console.log("Database re-seeded.");
}
