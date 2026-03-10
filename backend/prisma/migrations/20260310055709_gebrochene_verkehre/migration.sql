-- AlterTable
ALTER TABLE "Tour" ADD COLUMN     "istGebrochen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "UmschlagPunkt" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kurzbezeichnung" TEXT NOT NULL,
    "adresse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "UmschlagPunkt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Streckenabschnitt" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,
    "typ" TEXT NOT NULL,
    "vonBeschreibung" TEXT NOT NULL,
    "nachBeschreibung" TEXT NOT NULL,
    "umschlagPunktId" TEXT,
    "routeId" TEXT,
    "transportUnternehmerId" TEXT,
    "kfzId" TEXT,
    "konditionId" TEXT,
    "lastKilometer" DECIMAL(10,2),
    "leerKilometer" DECIMAL(10,2),
    "mautKilometer" DECIMAL(10,2),
    "kostenKondition" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'offen',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Streckenabschnitt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Streckenabschnitt_tourId_reihenfolge_key" ON "Streckenabschnitt"("tourId", "reihenfolge");

-- AddForeignKey
ALTER TABLE "UmschlagPunkt" ADD CONSTRAINT "UmschlagPunkt_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_umschlagPunktId_fkey" FOREIGN KEY ("umschlagPunktId") REFERENCES "UmschlagPunkt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_kfzId_fkey" FOREIGN KEY ("kfzId") REFERENCES "Kfz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Streckenabschnitt" ADD CONSTRAINT "Streckenabschnitt_konditionId_fkey" FOREIGN KEY ("konditionId") REFERENCES "Kondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
