-- CreateTable
CREATE TABLE "Benutzer" (
    "id" TEXT NOT NULL,
    "benutzername" TEXT NOT NULL,
    "passwortHash" TEXT NOT NULL,
    "vorname" TEXT NOT NULL,
    "nachname" TEXT NOT NULL,
    "email" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "niederlassungId" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benutzer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rolle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rolle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenutzerRolle" (
    "benutzerId" TEXT NOT NULL,
    "rolleId" TEXT NOT NULL,

    CONSTRAINT "BenutzerRolle_pkey" PRIMARY KEY ("benutzerId","rolleId")
);

-- CreateTable
CREATE TABLE "Recht" (
    "id" TEXT NOT NULL,
    "modul" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,

    CONSTRAINT "Recht_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolleRecht" (
    "rolleId" TEXT NOT NULL,
    "rechtId" TEXT NOT NULL,

    CONSTRAINT "RolleRecht_pkey" PRIMARY KEY ("rolleId","rechtId")
);

-- CreateTable
CREATE TABLE "Niederlassung" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kurzbezeichnung" TEXT NOT NULL,
    "adresse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Niederlassung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Oem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kurzbezeichnung" TEXT NOT NULL,
    "ediKennung" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Oem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Werk" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "werkscode" TEXT,
    "adresse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "oemId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Werk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lieferant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lieferantennummer" TEXT,
    "adresse" TEXT,
    "plz" TEXT,
    "ort" TEXT,
    "land" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Lieferant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abladestelle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "werkId" TEXT NOT NULL,
    "entladeZone" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Abladestelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportUnternehmer" (
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

    CONSTRAINT "TransportUnternehmer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kfz" (
    "id" TEXT NOT NULL,
    "kennzeichen" TEXT NOT NULL,
    "transportUnternehmerId" TEXT NOT NULL,
    "fabrikat" TEXT,
    "lkwTyp" TEXT,
    "maxLdm" DECIMAL(10,2),
    "maxGewicht" DECIMAL(10,2),
    "schadstoffklasse" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Kfz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" TEXT NOT NULL,
    "routennummer" TEXT NOT NULL,
    "oemId" TEXT NOT NULL,
    "beschreibung" TEXT,
    "kilometerLast" DECIMAL(10,2),
    "kilometerLeer" DECIMAL(10,2),
    "kilometerMaut" DECIMAL(10,2),
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kondition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "transportUnternehmerId" TEXT NOT NULL,
    "routeId" TEXT,
    "tourFaktor" DECIMAL(10,4),
    "stoppFaktor" DECIMAL(10,4),
    "tagFaktor" DECIMAL(10,4),
    "lastKmFaktor" DECIMAL(10,4),
    "leerKmFaktor" DECIMAL(10,4),
    "mautKmFaktor" DECIMAL(10,4),
    "maximalFrachtProTour" DECIMAL(10,2),
    "maximalFrachtProTag" DECIMAL(10,2),
    "gueltigVon" TIMESTAMP(3) NOT NULL,
    "gueltigBis" TIMESTAMP(3),
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Kondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Benutzer_benutzername_key" ON "Benutzer"("benutzername");

-- CreateIndex
CREATE UNIQUE INDEX "Rolle_name_key" ON "Rolle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Recht_modul_aktion_key" ON "Recht"("modul", "aktion");

-- AddForeignKey
ALTER TABLE "Benutzer" ADD CONSTRAINT "Benutzer_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenutzerRolle" ADD CONSTRAINT "BenutzerRolle_benutzerId_fkey" FOREIGN KEY ("benutzerId") REFERENCES "Benutzer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenutzerRolle" ADD CONSTRAINT "BenutzerRolle_rolleId_fkey" FOREIGN KEY ("rolleId") REFERENCES "Rolle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolleRecht" ADD CONSTRAINT "RolleRecht_rolleId_fkey" FOREIGN KEY ("rolleId") REFERENCES "Rolle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolleRecht" ADD CONSTRAINT "RolleRecht_rechtId_fkey" FOREIGN KEY ("rechtId") REFERENCES "Recht"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Werk" ADD CONSTRAINT "Werk_oemId_fkey" FOREIGN KEY ("oemId") REFERENCES "Oem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abladestelle" ADD CONSTRAINT "Abladestelle_werkId_fkey" FOREIGN KEY ("werkId") REFERENCES "Werk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportUnternehmer" ADD CONSTRAINT "TransportUnternehmer_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kfz" ADD CONSTRAINT "Kfz_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_oemId_fkey" FOREIGN KEY ("oemId") REFERENCES "Oem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kondition" ADD CONSTRAINT "Kondition_transportUnternehmerId_fkey" FOREIGN KEY ("transportUnternehmerId") REFERENCES "TransportUnternehmer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kondition" ADD CONSTRAINT "Kondition_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;
