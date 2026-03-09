-- CreateTable
CREATE TABLE "TuAbrechnung" (
    "id" TEXT NOT NULL,
    "belegnummer" TEXT NOT NULL,
    "buchungsjahr" INTEGER NOT NULL,
    "zeitraumVon" TIMESTAMP(3) NOT NULL,
    "zeitraumBis" TIMESTAMP(3) NOT NULL,
    "transportUnternehmerId" TEXT NOT NULL,
    "niederlassungId" TEXT NOT NULL,
    "anzahlPositionen" INTEGER NOT NULL DEFAULT 0,
    "gesamtbetrag" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'offen',
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "TuAbrechnung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuAbrechnungsPosition" (
    "id" TEXT NOT NULL,
    "tuAbrechnungId" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "tourNummer" TEXT NOT NULL,
    "tourDatum" TIMESTAMP(3) NOT NULL,
    "konditionId" TEXT,
    "konditionName" TEXT,
    "tourKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "stoppKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tagKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastKmKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "leerKmKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "mautKmKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "gesamtKosten" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lastKilometer" DECIMAL(10,2),
    "leerKilometer" DECIMAL(10,2),
    "mautKilometer" DECIMAL(10,2),
    "istManuell" BOOLEAN NOT NULL DEFAULT false,
    "bemerkung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TuAbrechnungsPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TuAbrechnung_belegnummer_key" ON "TuAbrechnung"("belegnummer");

-- AddForeignKey
ALTER TABLE "TuAbrechnung" ADD CONSTRAINT "TuAbrechnung_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuAbrechnung" ADD CONSTRAINT "TuAbrechnung_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuAbrechnungsPosition" ADD CONSTRAINT "TuAbrechnungsPosition_tuAbrechnungId_fkey" FOREIGN KEY ("tuAbrechnungId") REFERENCES "TuAbrechnung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuAbrechnungsPosition" ADD CONSTRAINT "TuAbrechnungsPosition_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuAbrechnungsPosition" ADD CONSTRAINT "TuAbrechnungsPosition_konditionId_fkey" FOREIGN KEY ("konditionId") REFERENCES "Kondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
