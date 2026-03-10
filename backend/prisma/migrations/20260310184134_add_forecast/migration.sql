-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "bezeichnung" TEXT NOT NULL,
    "oemId" TEXT NOT NULL,
    "werkId" TEXT NOT NULL,
    "gueltigVon" TIMESTAMP(3) NOT NULL,
    "gueltigBis" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'entwurf',
    "niederlassungId" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "geaendertAm" TIMESTAMP(3) NOT NULL,
    "geloeschtAm" TIMESTAMP(3),

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForecastDetail" (
    "id" TEXT NOT NULL,
    "forecastId" TEXT NOT NULL,
    "kalenderwoche" INTEGER NOT NULL,
    "jahr" INTEGER NOT NULL,
    "menge" INTEGER NOT NULL,
    "gewicht" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastDetail_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_oemId_fkey" FOREIGN KEY ("oemId") REFERENCES "Oem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_werkId_fkey" FOREIGN KEY ("werkId") REFERENCES "Werk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_niederlassungId_fkey" FOREIGN KEY ("niederlassungId") REFERENCES "Niederlassung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForecastDetail" ADD CONSTRAINT "ForecastDetail_forecastId_fkey" FOREIGN KEY ("forecastId") REFERENCES "Forecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
