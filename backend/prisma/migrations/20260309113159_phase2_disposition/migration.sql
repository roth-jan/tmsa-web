-- CreateTable
CREATE TABLE "DispoOrt" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "plz" TEXT,
    "ort" TEXT,
    "land" TEXT DEFAULT 'DE',
    "sortierung" INTEGER NOT NULL DEFAULT 0,
    "werkId" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "DispoOrt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispoRegel" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "regeltyp" TEXT NOT NULL,
    "prioritaet" INTEGER NOT NULL DEFAULT 0,
    "bedingung" TEXT,
    "aktion" TEXT,
    "istAktiv" BOOLEAN NOT NULL DEFAULT true,
    "niederlassungId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "DispoRegel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Avis" (
    "id" TEXT NOT NULL,
    "avisNummer" TEXT NOT NULL,
    "ladeDatum" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offen',
    "bemerkung" TEXT,
    "lieferantId" TEXT NOT NULL,
    "werkId" TEXT NOT NULL,
    "abladestelleId" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "routeId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Avis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artikelzeile" (
    "id" TEXT NOT NULL,
    "artikelBeschreibung" TEXT NOT NULL,
    "menge" DECIMAL(10,2) NOT NULL,
    "masseinheit" TEXT NOT NULL DEFAULT 'ST',
    "gewicht" DECIMAL(10,2),
    "volumen" DECIMAL(10,4),
    "gutArt" TEXT NOT NULL DEFAULT 'VOLLGUT',
    "status" INTEGER NOT NULL DEFAULT 0,
    "avisId" TEXT NOT NULL,
    "tourId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Artikelzeile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "tourNummer" TEXT NOT NULL,
    "tourDatum" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'offen',
    "kfzId" TEXT,
    "transportUnternehmerId" TEXT,
    "konditionId" TEXT,
    "routeId" TEXT,
    "leerKilometer" DECIMAL(10,2),
    "lastKilometer" DECIMAL(10,2),
    "mautKilometer" DECIMAL(10,2),
    "kostenKondition" DECIMAL(10,2),
    "kostenManuell" DECIMAL(10,2),
    "bemerkungIntern" TEXT,
    "bemerkungExtern" TEXT,
    "niederlassungId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Avis_avisNummer_key" ON "Avis"("avisNummer");

-- CreateIndex
CREATE UNIQUE INDEX "Tour_tourNummer_key" ON "Tour"("tourNummer");

-- AddForeignKey
ALTER TABLE "DispoOrt" ADD CONSTRAINT "DispoOrt_werkId_fkey" FOREIGN KEY ("werkId") REFERENCES "Werk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispoOrt" ADD CONSTRAINT "DispoOrt_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispoRegel" ADD CONSTRAINT "DispoRegel_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_lieferantId_fkey" FOREIGN KEY ("lieferantId") REFERENCES "Lieferant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_werkId_fkey" FOREIGN KEY ("werkId") REFERENCES "Werk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_abladestelleId_fkey" FOREIGN KEY ("abladestelleId") REFERENCES "Abladestelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Avis" ADD CONSTRAINT "Avis_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artikelzeile" ADD CONSTRAINT "Artikelzeile_avisId_fkey" FOREIGN KEY ("avisId") REFERENCES "Avis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artikelzeile" ADD CONSTRAINT "Artikelzeile_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_kfzId_fkey" FOREIGN KEY ("kfzId") REFERENCES "Kfz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_konditionId_fkey" FOREIGN KEY ("konditionId") REFERENCES "Kondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
