-- CreateTable
CREATE TABLE "Nummernkreis" (
    "id" TEXT NOT NULL,
    "typ" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '',
    "letzteNummer" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL DEFAULT '{PREFIX}{NUMMER}',
    "niederlassungId" TEXT,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nummernkreis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storno" (
    "id" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "entitaetId" TEXT NOT NULL,
    "stornoGrund" TEXT NOT NULL,
    "benutzerId" TEXT,
    "benutzerName" TEXT,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Storno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Nummernkreis_typ_niederlassungId_key" ON "Nummernkreis"("typ", "niederlassungId");

-- CreateIndex
CREATE INDEX "Storno_modell_entitaetId_idx" ON "Storno"("modell", "entitaetId");
