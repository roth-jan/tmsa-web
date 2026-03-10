-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "modell" TEXT NOT NULL,
    "aktion" TEXT NOT NULL,
    "entitaetId" TEXT NOT NULL,
    "benutzerId" TEXT,
    "benutzerName" TEXT,
    "zeitpunkt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alterWert" JSONB,
    "neuerWert" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdiImport" (
    "id" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "dateiname" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "ergebnis" JSONB,
    "rohdaten" TEXT,
    "benutzerId" TEXT,
    "benutzerName" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdiImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_modell_entitaetId_idx" ON "AuditLog"("modell", "entitaetId");

-- CreateIndex
CREATE INDEX "AuditLog_benutzerId_idx" ON "AuditLog"("benutzerId");

-- CreateIndex
CREATE INDEX "AuditLog_zeitpunkt_idx" ON "AuditLog"("zeitpunkt");

-- CreateIndex
CREATE INDEX "EdiImport_format_idx" ON "EdiImport"("format");

-- CreateIndex
CREATE INDEX "EdiImport_erstelltAm_idx" ON "EdiImport"("erstelltAm");
