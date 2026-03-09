-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "abrechnungsStatus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "abrechnungsStopp" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "bemerkungAbrechnung" TEXT,
ADD COLUMN     "istLeerfahrt" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quittung" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quittungDatum" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Abfahrt" (
    "id" TEXT NOT NULL,
    "abfahrtNummer" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offen',
    "abrechnungsStatus" INTEGER NOT NULL DEFAULT 0,
    "kfzId" TEXT,
    "transportUnternehmerId" TEXT,
    "routeId" TEXT,
    "tourId" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Abfahrt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bordero" (
    "id" TEXT NOT NULL,
    "borderoNummer" TEXT NOT NULL,
    "abfahrtId" TEXT NOT NULL,
    "gewicht" DECIMAL(10,2),
    "lademeter" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'offen',
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bordero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sendung" (
    "id" TEXT NOT NULL,
    "sendungNummer" TEXT NOT NULL,
    "datum" TIMESTAMP(3) NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 0,
    "richtungsArt" TEXT NOT NULL DEFAULT 'WE',
    "borderoId" TEXT,
    "oemId" TEXT,
    "werkId" TEXT,
    "lieferantId" TEXT,
    "abladestelleId" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "gewicht" DECIMAL(10,2),
    "lademeter" DECIMAL(10,2),
    "bemerkungExtern" TEXT,
    "istSonderfahrt" BOOLEAN NOT NULL DEFAULT false,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Sendung_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Abfahrt_abfahrtNummer_key" ON "Abfahrt"("abfahrtNummer");

-- CreateIndex
CREATE UNIQUE INDEX "Bordero_borderoNummer_key" ON "Bordero"("borderoNummer");

-- CreateIndex
CREATE UNIQUE INDEX "Sendung_sendungNummer_key" ON "Sendung"("sendungNummer");

-- AddForeignKey
ALTER TABLE "Abfahrt" ADD CONSTRAINT "Abfahrt_kfzId_fkey" FOREIGN KEY ("kfzId") REFERENCES "Kfz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abfahrt" ADD CONSTRAINT "Abfahrt_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abfahrt" ADD CONSTRAINT "Abfahrt_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abfahrt" ADD CONSTRAINT "Abfahrt_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abfahrt" ADD CONSTRAINT "Abfahrt_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bordero" ADD CONSTRAINT "Bordero_abfahrtId_fkey" FOREIGN KEY ("abfahrtId") REFERENCES "Abfahrt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_borderoId_fkey" FOREIGN KEY ("borderoId") REFERENCES "Bordero"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_oemId_fkey" FOREIGN KEY ("oemId") REFERENCES "Oem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_werkId_fkey" FOREIGN KEY ("werkId") REFERENCES "Werk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "Lieferant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_abladestelleId_fkey" FOREIGN KEY ("abladestelleId") REFERENCES "Abladestelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sendung" ADD CONSTRAINT "Sendung_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
