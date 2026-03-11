import { execSync } from "child_process";
import prisma from "./db";

async function seedArbeitstag() {
  // ============================================================
  // SCHRITT 0: Datenbank zurücksetzen (TRUNCATE wie global-setup)
  // ============================================================
  console.log("Setze Datenbank zurück...");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "ForecastDetail", "Forecast", "AuditLog", "EdiImport", "TuAbrechnungsPosition", "TuAbrechnung", "Streckenabschnitt", "Sendung", "Bordero", "Abfahrt", "Artikelzeile", "Tour", "Avis", "Kondition", "DispoRegel", "DispoOrt", "UmschlagPunkt", "Kfz", "TransportUnternehmer", "Route", "Abladestelle", "Werk", "Oem", "RolleRecht", "BenutzerRolle", "Recht", "Benutzer", "Rolle", "Niederlassung" CASCADE`
  );
  console.log("Tabellen geleert.");

  // ============================================================
  // SCHRITT 1: Basis-Seed ausführen (Stammdaten + Rechte + User)
  // ============================================================
  console.log("Führe Basis-Seed aus...");
  execSync("npx tsx src/seed.ts", { cwd: __dirname + "/..", stdio: "inherit" });

  console.log("\nErstelle Arbeitstag-Daten...\n");

  // ============================================================
  // Bestehende Stammdaten laden
  // ============================================================
  const nlAug = await prisma.niederlassung.findFirstOrThrow({ where: { kurzbezeichnung: "AUG" } });
  const nlNue = await prisma.niederlassung.findFirstOrThrow({ where: { kurzbezeichnung: "NUE" } });

  const bmw = await prisma.oem.findFirstOrThrow({ where: { kurzbezeichnung: "BMW" } });
  const daimler = await prisma.oem.findFirstOrThrow({ where: { kurzbezeichnung: "DAI" } });
  const vw = await prisma.oem.findFirstOrThrow({ where: { kurzbezeichnung: "VW" } });
  const porsche = await prisma.oem.findFirstOrThrow({ where: { kurzbezeichnung: "POR" } });
  const man = await prisma.oem.findFirstOrThrow({ where: { kurzbezeichnung: "MAN" } });

  const werkMuc = await prisma.werk.findFirstOrThrow({ where: { werkscode: "MUC" } });
  const werkDin = await prisma.werk.findFirstOrThrow({ where: { werkscode: "DIN" } });
  const werkSind = await prisma.werk.findFirstOrThrow({ where: { werkscode: "SIN" } });
  const werkWob = await prisma.werk.findFirstOrThrow({ where: { werkscode: "WOB" } });

  const bosch = await prisma.lieferant.findFirstOrThrow({ where: { lieferantennummer: "LF001" } });
  const conti = await prisma.lieferant.findFirstOrThrow({ where: { lieferantennummer: "LF002" } });
  const zf = await prisma.lieferant.findFirstOrThrow({ where: { lieferantennummer: "LF003" } });

  const tuHartmann = await prisma.transportUnternehmer.findFirstOrThrow({ where: { kurzbezeichnung: "HAR" } });
  const tuKraus = await prisma.transportUnternehmer.findFirstOrThrow({ where: { kurzbezeichnung: "KRA" } });

  const routeBmw1 = await prisma.route.findFirstOrThrow({ where: { routennummer: "BMW-R001" } });
  const routeBmw2 = await prisma.route.findFirstOrThrow({ where: { routennummer: "BMW-R002" } });

  const kfzHT1 = await prisma.kfz.findFirstOrThrow({ where: { kennzeichen: "A-HA-2847" } });
  const kfzHT2 = await prisma.kfz.findFirstOrThrow({ where: { kennzeichen: "A-HA-6193" } });
  const kfzKS1 = await prisma.kfz.findFirstOrThrow({ where: { kennzeichen: "N-KR-5934" } });

  const uspAug = await prisma.umschlagPunkt.findFirstOrThrow({ where: { kurzbezeichnung: "USP-AUG" } });

  const admin = await prisma.benutzer.findFirstOrThrow({ where: { benutzername: "admin" } });

  // ============================================================
  // SCHRITT 2: Zusätzliche Stammdaten
  // ============================================================
  console.log("Zusätzliche Stammdaten...");

  // Neue Werke
  const werkLei = await prisma.werk.create({
    data: { name: "Porsche Werk Leipzig", werkscode: "LEI", ort: "Leipzig", plz: "04158", oemId: porsche.id },
  });
  const werkEmd = await prisma.werk.create({
    data: { name: "VW Werk Emden", werkscode: "EMD", ort: "Emden", plz: "26723", oemId: vw.id },
  });
  const werkManMuc = await prisma.werk.create({
    data: { name: "MAN Werk München", werkscode: "MAM", ort: "München", plz: "80995", oemId: man.id },
  });

  // Abladestellen an neuen Werken
  await prisma.abladestelle.createMany({
    data: [
      { name: "Tor 2 West", werkId: werkLei.id, entladeZone: "West" },
      { name: "Halle 7", werkId: werkEmd.id, entladeZone: "Nord" },
      { name: "Rampe A", werkId: werkManMuc.id, entladeZone: "Ost" },
    ],
  });

  // Neue Lieferanten
  const mahle = await prisma.lieferant.create({
    data: { name: "Mahle GmbH", lieferantennummer: "LF004", ort: "Stuttgart", plz: "70376", land: "DE" },
  });
  const schaeffler = await prisma.lieferant.create({
    data: { name: "Schaeffler AG", lieferantennummer: "LF005", ort: "Herzogenaurach", plz: "91074", land: "DE" },
  });
  const thyssen = await prisma.lieferant.create({
    data: { name: "ThyssenKrupp AG", lieferantennummer: "LF006", ort: "Essen", plz: "45143", land: "DE" },
  });

  // Neue Transport-Unternehmer
  const tuMueller = await prisma.transportUnternehmer.create({
    data: { name: "Müller Logistik GmbH", kurzbezeichnung: "MUE", ort: "Augsburg", niederlassungId: nlAug.id },
  });
  const tuBauer = await prisma.transportUnternehmer.create({
    data: { name: "Bauer Transport OHG", kurzbezeichnung: "BAU", ort: "Nürnberg", niederlassungId: nlNue.id },
  });

  // Neue KFZ
  const kfzMue1 = await prisma.kfz.create({
    data: { kennzeichen: "A-ML-3001", transportUnternehmerId: tuMueller.id, fabrikat: "DAF XF", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  const kfzMue2 = await prisma.kfz.create({
    data: { kennzeichen: "A-ML-3002", transportUnternehmerId: tuMueller.id, fabrikat: "Volvo FH", lkwTyp: "Gliederzug", maxLdm: 7.7, maxGewicht: 12000 },
  });
  const kfzBau1 = await prisma.kfz.create({
    data: { kennzeichen: "N-BT-4001", transportUnternehmerId: tuBauer.id, fabrikat: "Iveco S-Way", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  const kfzBau2 = await prisma.kfz.create({
    data: { kennzeichen: "N-BT-4002", transportUnternehmerId: tuBauer.id, fabrikat: "MAN TGS", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  // Extra KFZ für bestehende TU
  const kfzHT3 = await prisma.kfz.create({
    data: { kennzeichen: "A-HT-9999", transportUnternehmerId: tuHartmann.id, fabrikat: "Mercedes Actros L", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });

  // Neue Routen
  const routeDai1 = await prisma.route.create({
    data: { routennummer: "DAI-R001", oemId: daimler.id, beschreibung: "Augsburg → Sindelfingen", kilometerLast: 165, kilometerLeer: 165, kilometerMaut: 140 },
  });
  const routeVw1 = await prisma.route.create({
    data: { routennummer: "VW-R001", oemId: vw.id, beschreibung: "Nürnberg → Wolfsburg", kilometerLast: 420, kilometerLeer: 420, kilometerMaut: 380 },
  });
  const routePor1 = await prisma.route.create({
    data: { routennummer: "POR-R001", oemId: porsche.id, beschreibung: "Nürnberg → Leipzig", kilometerLast: 280, kilometerLeer: 280, kilometerMaut: 250 },
  });
  const routeMan1 = await prisma.route.create({
    data: { routennummer: "MAN-R001", oemId: man.id, beschreibung: "Augsburg → München MAN", kilometerLast: 75, kilometerLeer: 75, kilometerMaut: 60 },
  });

  // Neue Konditionen
  const kondHartmannDai = await prisma.kondition.create({
    data: {
      name: "Hartmann Daimler Standard",
      transportUnternehmerId: tuHartmann.id,
      routeId: routeDai1.id,
      tourFaktor: 180.0, stoppFaktor: 30.0, lastKmFaktor: 1.30, leerKmFaktor: 0.90, mautKmFaktor: 0.19,
      maximalFrachtProTour: 550.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  const kondMuellerBmw = await prisma.kondition.create({
    data: {
      name: "Müller BMW München",
      transportUnternehmerId: tuMueller.id,
      routeId: routeBmw1.id,
      tourFaktor: 140.0, stoppFaktor: 22.0, lastKmFaktor: 1.20, leerKmFaktor: 0.80, mautKmFaktor: 0.19,
      maximalFrachtProTour: 420.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  const kondKrausVw = await prisma.kondition.create({
    data: {
      name: "Kraus VW Wolfsburg",
      transportUnternehmerId: tuKraus.id,
      routeId: routeVw1.id,
      tourFaktor: 250.0, stoppFaktor: 35.0, lastKmFaktor: 1.35, leerKmFaktor: 0.95, mautKmFaktor: 0.19,
      maximalFrachtProTour: 850.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  const kondBauerPor = await prisma.kondition.create({
    data: {
      name: "Bauer Porsche Leipzig",
      transportUnternehmerId: tuBauer.id,
      routeId: routePor1.id,
      tourFaktor: 200.0, stoppFaktor: 28.0, lastKmFaktor: 1.28, leerKmFaktor: 0.88, mautKmFaktor: 0.19,
      maximalFrachtProTour: 650.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  const kondMuellerMan = await prisma.kondition.create({
    data: {
      name: "Müller MAN München",
      transportUnternehmerId: tuMueller.id,
      routeId: routeMan1.id,
      tourFaktor: 130.0, stoppFaktor: 20.0, lastKmFaktor: 1.15, leerKmFaktor: 0.75, mautKmFaktor: 0.19,
      maximalFrachtProTour: 380.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });

  // Neue DispoOrte
  await prisma.dispoOrt.create({
    data: { bezeichnung: "Umschlag Nürnberg", plz: "90402", ort: "Nürnberg", sortierung: 3, niederlassungId: nlNue.id },
  });
  await prisma.dispoOrt.create({
    data: { bezeichnung: "Werk Sindelfingen", plz: "71063", ort: "Sindelfingen", werkId: werkSind.id, sortierung: 4, niederlassungId: nlAug.id },
  });

  // ============================================================
  // SCHRITT 3: 15 Avise + ~55 Artikelzeilen
  // ============================================================
  console.log("Avise + Artikelzeilen...");

  const heute = new Date("2026-03-10");

  // --- BMW München (5 Avise) ---
  const av10 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-010", ladeDatum: heute, status: "offen", lieferantId: bosch.id, werkId: werkMuc.id, niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Cockpit-Modul Typ A", menge: 80, masseinheit: "ST", gewicht: 2400, gutArt: "VOLLGUT", avisId: av10.id },
    { artikelBeschreibung: "Türverkleidung links", menge: 200, masseinheit: "ST", gewicht: 1400, gutArt: "VOLLGUT", avisId: av10.id },
    { artikelBeschreibung: "Türverkleidung rechts", menge: 200, masseinheit: "ST", gewicht: 1400, gutArt: "VOLLGUT", avisId: av10.id },
  ]});

  const av11 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-011", ladeDatum: heute, status: "offen", lieferantId: conti.id, werkId: werkMuc.id, niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Antriebswelle rechts", menge: 150, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av11.id },
    { artikelBeschreibung: "Antriebswelle links", menge: 150, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av11.id },
    { artikelBeschreibung: "Leergut-Gestelle", menge: 30, masseinheit: "PAL", gewicht: 450, gutArt: "LEERGUT", avisId: av11.id },
  ]});

  const av12 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-012", ladeDatum: heute, status: "offen", lieferantId: mahle.id, werkId: werkMuc.id, niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Kolben M3 Performance", menge: 500, masseinheit: "ST", gewicht: 750, gutArt: "VOLLGUT", avisId: av12.id },
    { artikelBeschreibung: "Ölfilter-Modul", menge: 300, masseinheit: "ST", gewicht: 420, gutArt: "VOLLGUT", avisId: av12.id },
    { artikelBeschreibung: "Turbolader K04", menge: 60, masseinheit: "ST", gewicht: 540, gutArt: "VOLLGUT", avisId: av12.id },
    { artikelBeschreibung: "Leergut-Gitterboxen", menge: 20, masseinheit: "PAL", gewicht: 300, gutArt: "LEERGUT", avisId: av12.id },
  ]});

  const av13 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-013", ladeDatum: heute, status: "offen", lieferantId: schaeffler.id, werkId: werkMuc.id, niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Radlager vorne", menge: 400, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av13.id },
    { artikelBeschreibung: "Kupplungssatz Dual-Mass", menge: 100, masseinheit: "ST", gewicht: 1500, gutArt: "VOLLGUT", avisId: av13.id },
    { artikelBeschreibung: "Spannrolle Keilrippenriemen", menge: 250, masseinheit: "ST", gewicht: 375, gutArt: "VOLLGUT", avisId: av13.id },
  ]});

  const av14 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-014", ladeDatum: heute, status: "offen", lieferantId: zf.id, werkId: werkMuc.id, niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Getriebe 8HP76", menge: 40, masseinheit: "ST", gewicht: 3600, gutArt: "VOLLGUT", avisId: av14.id },
    { artikelBeschreibung: "Lenkgetriebe elektr.", menge: 80, masseinheit: "ST", gewicht: 960, gutArt: "VOLLGUT", avisId: av14.id },
    { artikelBeschreibung: "Stoßdämpfer CDC", menge: 200, masseinheit: "ST", gewicht: 1000, gutArt: "VOLLGUT", avisId: av14.id },
  ]});

  // --- BMW Dingolfing (3 Avise) ---
  const av15 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-015", ladeDatum: heute, status: "offen", lieferantId: bosch.id, werkId: werkDin.id, niederlassungId: nlAug.id, routeId: routeBmw2.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "ESP-Steuergerät", menge: 300, masseinheit: "ST", gewicht: 450, gutArt: "VOLLGUT", avisId: av15.id },
    { artikelBeschreibung: "Einspritzdüsen CR", menge: 500, masseinheit: "ST", gewicht: 250, gutArt: "VOLLGUT", avisId: av15.id },
    { artikelBeschreibung: "Zündkerzen Set 6-Zyl", menge: 400, masseinheit: "ST", gewicht: 160, gutArt: "VOLLGUT", avisId: av15.id },
  ]});

  const av16 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-016", ladeDatum: heute, status: "offen", lieferantId: thyssen.id, werkId: werkDin.id, niederlassungId: nlAug.id, routeId: routeBmw2.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Karosserieblech Seitenteil", menge: 120, masseinheit: "ST", gewicht: 3600, gutArt: "VOLLGUT", avisId: av16.id },
    { artikelBeschreibung: "Motorhaube Rohling", menge: 80, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av16.id },
    { artikelBeschreibung: "B-Säule verstärkt", menge: 200, masseinheit: "ST", gewicht: 2400, gutArt: "VOLLGUT", avisId: av16.id },
  ]});

  const av17 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-017", ladeDatum: heute, status: "offen", lieferantId: conti.id, werkId: werkDin.id, niederlassungId: nlAug.id, routeId: routeBmw2.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Bremsscheiben 370mm", menge: 250, masseinheit: "ST", gewicht: 2250, gutArt: "VOLLGUT", avisId: av17.id },
    { artikelBeschreibung: "ABS-Sensor Set", menge: 400, masseinheit: "ST", gewicht: 280, gutArt: "VOLLGUT", avisId: av17.id },
    { artikelBeschreibung: "Bremsbelag-Verschleißanzeiger", menge: 500, masseinheit: "ST", gewicht: 100, gutArt: "VOLLGUT", avisId: av17.id },
    { artikelBeschreibung: "Leergut-KLT 6428", menge: 40, masseinheit: "PAL", gewicht: 480, gutArt: "LEERGUT", avisId: av17.id },
  ]});

  // --- Daimler Sindelfingen (3 Avise) ---
  const av18 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-018", ladeDatum: heute, status: "offen", lieferantId: zf.id, werkId: werkSind.id, niederlassungId: nlAug.id, routeId: routeDai1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Achsträger Hinterachse", menge: 60, masseinheit: "ST", gewicht: 3000, gutArt: "VOLLGUT", avisId: av18.id },
    { artikelBeschreibung: "Lenkgetriebe elektr. EPS", menge: 100, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av18.id },
    { artikelBeschreibung: "Abgasanlage V8 komplett", menge: 40, masseinheit: "ST", gewicht: 2000, gutArt: "VOLLGUT", avisId: av18.id },
  ]});

  const av19 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-019", ladeDatum: heute, status: "offen", lieferantId: mahle.id, werkId: werkSind.id, niederlassungId: nlAug.id, routeId: routeDai1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Klimakompressor 7SAS17C", menge: 80, masseinheit: "ST", gewicht: 560, gutArt: "VOLLGUT", avisId: av19.id },
    { artikelBeschreibung: "Ladeluftkühler Alu", menge: 120, masseinheit: "ST", gewicht: 720, gutArt: "VOLLGUT", avisId: av19.id },
    { artikelBeschreibung: "Wasserpumpe mech.", menge: 200, masseinheit: "ST", gewicht: 600, gutArt: "VOLLGUT", avisId: av19.id },
    { artikelBeschreibung: "Leergut-Behälter GLT", menge: 15, masseinheit: "PAL", gewicht: 225, gutArt: "LEERGUT", avisId: av19.id },
  ]});

  const av20 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-020", ladeDatum: heute, status: "offen", lieferantId: schaeffler.id, werkId: werkSind.id, niederlassungId: nlAug.id, routeId: routeDai1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Zweimassenschwungrad ZMS", menge: 70, masseinheit: "ST", gewicht: 1400, gutArt: "VOLLGUT", avisId: av20.id },
    { artikelBeschreibung: "Wälzlager Radnabe HA", menge: 300, masseinheit: "ST", gewicht: 900, gutArt: "VOLLGUT", avisId: av20.id },
    { artikelBeschreibung: "Nockenwellenversteller", menge: 150, masseinheit: "ST", gewicht: 525, gutArt: "VOLLGUT", avisId: av20.id },
  ]});

  // --- VW Wolfsburg (2 Avise) ---
  const av21 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-021", ladeDatum: heute, status: "offen", lieferantId: bosch.id, werkId: werkWob.id, niederlassungId: nlNue.id, routeId: routeVw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Scheinwerfer LED Matrix", menge: 100, masseinheit: "ST", gewicht: 700, gutArt: "VOLLGUT", avisId: av21.id },
    { artikelBeschreibung: "Instrumententafel Golf", menge: 80, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: av21.id },
    { artikelBeschreibung: "Kabelbaum Hauptstrang", menge: 60, masseinheit: "ST", gewicht: 420, gutArt: "VOLLGUT", avisId: av21.id },
  ]});

  const av22 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-022", ladeDatum: heute, status: "offen", lieferantId: thyssen.id, werkId: werkWob.id, niederlassungId: nlNue.id, routeId: routeVw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Sitzgestell Fahrer", menge: 150, masseinheit: "ST", gewicht: 2250, gutArt: "VOLLGUT", avisId: av22.id },
    { artikelBeschreibung: "Sitzgestell Beifahrer", menge: 150, masseinheit: "ST", gewicht: 2250, gutArt: "VOLLGUT", avisId: av22.id },
    { artikelBeschreibung: "Sitzschiene elektr.", menge: 300, masseinheit: "ST", gewicht: 900, gutArt: "VOLLGUT", avisId: av22.id },
    { artikelBeschreibung: "Leergut-Palette VW-Norm", menge: 25, masseinheit: "PAL", gewicht: 375, gutArt: "LEERGUT", avisId: av22.id },
  ]});

  // --- Porsche Leipzig (2 Avise) ---
  const av23 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-023", ladeDatum: heute, status: "offen", lieferantId: conti.id, werkId: werkLei.id, niederlassungId: nlNue.id, routeId: routePor1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Sportbremse PCCB VA", menge: 40, masseinheit: "ST", gewicht: 800, gutArt: "VOLLGUT", avisId: av23.id },
    { artikelBeschreibung: "Sportbremse PCCB HA", menge: 40, masseinheit: "ST", gewicht: 720, gutArt: "VOLLGUT", avisId: av23.id },
    { artikelBeschreibung: "Bremssattel 6-Kolben rot", menge: 80, masseinheit: "ST", gewicht: 640, gutArt: "VOLLGUT", avisId: av23.id },
  ]});

  const av24 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-024", ladeDatum: heute, status: "offen", lieferantId: mahle.id, werkId: werkLei.id, niederlassungId: nlNue.id, routeId: routePor1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Ladeluftkühler Sport", menge: 50, masseinheit: "ST", gewicht: 375, gutArt: "VOLLGUT", avisId: av24.id },
    { artikelBeschreibung: "Hinterachse komplett GT", menge: 30, masseinheit: "ST", gewicht: 2700, gutArt: "VOLLGUT", avisId: av24.id },
    { artikelBeschreibung: "Leergut-Spezialgestell", menge: 10, masseinheit: "PAL", gewicht: 200, gutArt: "LEERGUT", avisId: av24.id },
  ]});

  // ============================================================
  // SCHRITT 4: 15 Touren
  // ============================================================
  console.log("Touren...");

  // Kondition für Kosten-Berechnung
  const kondHartmannBmw = await prisma.kondition.findFirstOrThrow({ where: { name: "Hartmann Standard BMW" } });

  // --- 3 offene Touren (keine TU/KFZ) ---
  const tour10 = await prisma.tour.create({
    data: { tourNummer: "T-2026-010", tourDatum: heute, status: "offen", niederlassungId: nlAug.id, routeId: routeBmw1.id },
  });
  const tour11 = await prisma.tour.create({
    data: { tourNummer: "T-2026-011", tourDatum: heute, status: "offen", niederlassungId: nlAug.id, routeId: routeDai1.id },
  });
  const tour12 = await prisma.tour.create({
    data: { tourNummer: "T-2026-012", tourDatum: heute, status: "offen", niederlassungId: nlNue.id, routeId: routeVw1.id },
  });

  // --- 4 disponierte Touren (TU + KFZ) ---
  const tour13 = await prisma.tour.create({
    data: { tourNummer: "T-2026-013", tourDatum: heute, status: "disponiert", kfzId: kfzMue1.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw1.id, niederlassungId: nlAug.id },
  });
  const tour14 = await prisma.tour.create({
    data: { tourNummer: "T-2026-014", tourDatum: heute, status: "disponiert", kfzId: kfzHT3.id, transportUnternehmerId: tuHartmann.id, routeId: routeDai1.id, niederlassungId: nlAug.id },
  });
  const tour15 = await prisma.tour.create({
    data: { tourNummer: "T-2026-015", tourDatum: heute, status: "disponiert", kfzId: kfzBau1.id, transportUnternehmerId: tuBauer.id, routeId: routePor1.id, niederlassungId: nlNue.id },
  });
  const tour16 = await prisma.tour.create({
    data: { tourNummer: "T-2026-016", tourDatum: heute, status: "disponiert", kfzId: kfzKS1.id, transportUnternehmerId: tuKraus.id, routeId: routeVw1.id, niederlassungId: nlNue.id },
  });

  // --- 4 abgefahrene Touren ---
  const tour17 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-017", tourDatum: heute, status: "abgefahren",
      kfzId: kfzHT1.id, transportUnternehmerId: tuHartmann.id, routeId: routeBmw1.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 88,
    },
  });
  const tour18 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-018", tourDatum: heute, status: "abgefahren",
      kfzId: kfzMue2.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw2.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 170,
    },
  });
  const tour19 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-019", tourDatum: heute, status: "abgefahren",
      kfzId: kfzBau2.id, transportUnternehmerId: tuBauer.id, routeId: routePor1.id, niederlassungId: nlNue.id,
      quittung: true, quittungDatum: heute, lastKilometer: 285,
    },
  });
  const tour20 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-020", tourDatum: heute, status: "abgefahren",
      kfzId: kfzHT2.id, transportUnternehmerId: tuHartmann.id, routeId: routeDai1.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 168,
    },
  });

  // --- 3 abgeschlossene Touren (mit Kosten) ---
  // T-2026-021: Hartmann BMW → 150 + (25×2) + (85×1.25) + (85×0.85) + (70×0.19) = 150+50+106.25+72.25+13.30 = 391.80
  const tour21 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-021", tourDatum: heute, status: "abgeschlossen",
      kfzId: kfzHT1.id, transportUnternehmerId: tuHartmann.id, konditionId: kondHartmannBmw.id, routeId: routeBmw1.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      kostenKondition: 391.80, abrechnungsStatus: 1,
    },
  });
  // T-2026-022: Hartmann Daimler → 180 + (30×1) + (165×1.30) + (165×0.90) + (140×0.19) = 180+30+214.50+148.50+26.60 = 599.60
  const tour22 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-022", tourDatum: heute, status: "abgeschlossen",
      kfzId: kfzHT3.id, transportUnternehmerId: tuHartmann.id, konditionId: kondHartmannDai.id, routeId: routeDai1.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 165, leerKilometer: 165, mautKilometer: 140,
      kostenKondition: 599.60, abrechnungsStatus: 1,
    },
  });
  // T-2026-023: Müller BMW → 140 + (22×2) + (85×1.20) + (85×0.80) + (70×0.19) = 140+44+102+68+13.30 = 367.30
  const tour23 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-023", tourDatum: heute, status: "abgeschlossen",
      kfzId: kfzMue1.id, transportUnternehmerId: tuMueller.id, konditionId: kondMuellerBmw.id, routeId: routeBmw1.id, niederlassungId: nlAug.id,
      quittung: true, quittungDatum: heute, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      kostenKondition: 367.30, abrechnungsStatus: 0,
    },
  });

  // --- 1 gebrochene Tour ---
  const uspNue = await prisma.umschlagPunkt.create({
    data: { name: "USP Nürnberg", kurzbezeichnung: "USP-NUE", plz: "90402", ort: "Nürnberg", niederlassungId: nlNue.id },
  });

  const tour24 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-024", tourDatum: heute, status: "disponiert", istGebrochen: true,
      niederlassungId: nlNue.id,
    },
  });
  await prisma.streckenabschnitt.createMany({
    data: [
      { tourId: tour24.id, reihenfolge: 1, typ: "VL", vonBeschreibung: "Continental Hannover", nachBeschreibung: "USP Nürnberg", umschlagPunktId: uspNue.id, transportUnternehmerId: tuKraus.id, kfzId: kfzKS1.id },
      { tourId: tour24.id, reihenfolge: 2, typ: "HL", vonBeschreibung: "USP Nürnberg", nachBeschreibung: "USP Augsburg", umschlagPunktId: uspAug.id, transportUnternehmerId: tuBauer.id, kfzId: kfzBau1.id },
      { tourId: tour24.id, reihenfolge: 3, typ: "NL", vonBeschreibung: "USP Augsburg", nachBeschreibung: "Porsche Leipzig", umschlagPunktId: uspAug.id, routeId: routePor1.id, transportUnternehmerId: tuBauer.id, kfzId: kfzBau2.id },
    ],
  });

  // ============================================================
  // SCHRITT 5: 6 Abfahrten → 8 Borderos → 20 Sendungen
  // ============================================================
  console.log("Abfahrten, Borderos, Sendungen...");

  // Abfahrt 1: Tour 17 (BMW MUC, abgefahren)
  const af10 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-010", datum: heute, status: "abgefahren", kfzId: kfzHT1.id, transportUnternehmerId: tuHartmann.id, routeId: routeBmw1.id, tourId: tour17.id, niederlassungId: nlAug.id },
  });
  const b10 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-010", abfahrtId: af10.id, gewicht: 5200, lademeter: 8.5, status: "borderiert" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-010", datum: heute, status: 1, richtungsArt: "WE", borderoId: b10.id, werkId: werkMuc.id, oemId: bmw.id, lieferantId: bosch.id, niederlassungId: nlAug.id, gewicht: 2400, lademeter: 4.0 },
    { sendungNummer: "S-2026-011", datum: heute, status: 1, richtungsArt: "WE", borderoId: b10.id, werkId: werkMuc.id, oemId: bmw.id, lieferantId: conti.id, niederlassungId: nlAug.id, gewicht: 2400, lademeter: 3.5 },
    { sendungNummer: "S-2026-012", datum: heute, status: 1, richtungsArt: "WE", borderoId: b10.id, werkId: werkMuc.id, oemId: bmw.id, lieferantId: mahle.id, niederlassungId: nlAug.id, gewicht: 400, lademeter: 1.0 },
  ]});

  // Abfahrt 2: Tour 18 (BMW DIN, abgefahren)
  const af11 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-011", datum: heute, status: "abgefahren", kfzId: kfzMue2.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw2.id, tourId: tour18.id, niederlassungId: nlAug.id },
  });
  const b11 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-011", abfahrtId: af11.id, gewicht: 7200, lademeter: 10.2, status: "borderiert" } });
  const b12 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-012", abfahrtId: af11.id, gewicht: 480, lademeter: 2.0, status: "borderiert" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-013", datum: heute, status: 1, richtungsArt: "WE", borderoId: b11.id, werkId: werkDin.id, oemId: bmw.id, lieferantId: bosch.id, niederlassungId: nlAug.id, gewicht: 860, lademeter: 2.5 },
    { sendungNummer: "S-2026-014", datum: heute, status: 1, richtungsArt: "WE", borderoId: b11.id, werkId: werkDin.id, oemId: bmw.id, lieferantId: thyssen.id, niederlassungId: nlAug.id, gewicht: 3600, lademeter: 5.0 },
    { sendungNummer: "S-2026-015", datum: heute, status: 1, richtungsArt: "WE", borderoId: b11.id, werkId: werkDin.id, oemId: bmw.id, lieferantId: conti.id, niederlassungId: nlAug.id, gewicht: 2740, lademeter: 2.7 },
    { sendungNummer: "S-2026-016", datum: heute, status: 1, richtungsArt: "WE", borderoId: b12.id, werkId: werkDin.id, oemId: bmw.id, lieferantId: conti.id, niederlassungId: nlAug.id, gewicht: 480, lademeter: 2.0 },
  ]});

  // Abfahrt 3: Tour 19 (Porsche LEI, abgefahren)
  const af12 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-012", datum: heute, status: "abgefahren", kfzId: kfzBau2.id, transportUnternehmerId: tuBauer.id, routeId: routePor1.id, tourId: tour19.id, niederlassungId: nlNue.id },
  });
  const b13 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-013", abfahrtId: af12.id, gewicht: 2160, lademeter: 5.0, status: "borderiert" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-017", datum: heute, status: 1, richtungsArt: "WE", borderoId: b13.id, werkId: werkLei.id, oemId: porsche.id, lieferantId: conti.id, niederlassungId: nlNue.id, gewicht: 1520, lademeter: 3.0 },
    { sendungNummer: "S-2026-018", datum: heute, status: 1, richtungsArt: "WE", borderoId: b13.id, werkId: werkLei.id, oemId: porsche.id, lieferantId: mahle.id, niederlassungId: nlNue.id, gewicht: 640, lademeter: 2.0 },
  ]});

  // Abfahrt 4: Tour 20 (Daimler SIN, abgefahren)
  const af13 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-013", datum: heute, status: "abgefahren", kfzId: kfzHT2.id, transportUnternehmerId: tuHartmann.id, routeId: routeDai1.id, tourId: tour20.id, niederlassungId: nlAug.id },
  });
  const b14 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-014", abfahrtId: af13.id, gewicht: 6200, lademeter: 9.5, status: "borderiert" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-019", datum: heute, status: 1, richtungsArt: "WE", borderoId: b14.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: zf.id, niederlassungId: nlAug.id, gewicht: 3000, lademeter: 4.5 },
    { sendungNummer: "S-2026-020", datum: heute, status: 1, richtungsArt: "WE", borderoId: b14.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: mahle.id, niederlassungId: nlAug.id, gewicht: 1280, lademeter: 2.5 },
    { sendungNummer: "S-2026-021", datum: heute, status: 1, richtungsArt: "WE", borderoId: b14.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: schaeffler.id, niederlassungId: nlAug.id, gewicht: 1920, lademeter: 2.5 },
  ]});

  // Abfahrt 5: Tour 21 (abgeschlossen, BMW MUC)
  const af14 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-014", datum: heute, status: "abgeschlossen", kfzId: kfzHT1.id, transportUnternehmerId: tuHartmann.id, routeId: routeBmw1.id, tourId: tour21.id, niederlassungId: nlAug.id },
  });
  const b15 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-015", abfahrtId: af14.id, gewicht: 4500, lademeter: 7.0, status: "abgeschlossen" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-022", datum: heute, status: 1, richtungsArt: "WE", borderoId: b15.id, werkId: werkMuc.id, oemId: bmw.id, lieferantId: schaeffler.id, niederlassungId: nlAug.id, gewicht: 2700, lademeter: 4.0 },
    { sendungNummer: "S-2026-023", datum: heute, status: 1, richtungsArt: "WE", borderoId: b15.id, werkId: werkMuc.id, oemId: bmw.id, lieferantId: zf.id, niederlassungId: nlAug.id, gewicht: 1800, lademeter: 3.0 },
  ]});

  // Abfahrt 6: Tour 22 (abgeschlossen, Daimler SIN)
  const af15 = await prisma.abfahrt.create({
    data: { abfahrtNummer: "AF-2026-015", datum: heute, status: "abgeschlossen", kfzId: kfzHT3.id, transportUnternehmerId: tuHartmann.id, routeId: routeDai1.id, tourId: tour22.id, niederlassungId: nlAug.id },
  });
  const b16 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-016", abfahrtId: af15.id, gewicht: 5500, lademeter: 8.0, status: "abgeschlossen" } });
  const b17 = await prisma.bordero.create({ data: { borderoNummer: "B-2026-017", abfahrtId: af15.id, gewicht: 2100, lademeter: 3.5, status: "abgeschlossen" } });
  await prisma.sendung.createMany({ data: [
    { sendungNummer: "S-2026-024", datum: heute, status: 1, richtungsArt: "WE", borderoId: b16.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: zf.id, niederlassungId: nlAug.id, gewicht: 3200, lademeter: 4.5 },
    { sendungNummer: "S-2026-025", datum: heute, status: 1, richtungsArt: "WE", borderoId: b16.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: schaeffler.id, niederlassungId: nlAug.id, gewicht: 2300, lademeter: 3.5 },
    { sendungNummer: "S-2026-026", datum: heute, status: 1, richtungsArt: "WE", borderoId: b17.id, werkId: werkSind.id, oemId: daimler.id, lieferantId: mahle.id, niederlassungId: nlAug.id, gewicht: 2100, lademeter: 3.5 },
  ]});

  // ============================================================
  // SCHRITT 6: TU-Abrechnungen
  // ============================================================
  console.log("TU-Abrechnungen...");

  // Abrechnung 1: Hartmann (erzeugt, 3 Positionen)
  const abrHartmann = await prisma.tuAbrechnung.create({
    data: {
      belegnummer: "ABR-2026-010",
      buchungsjahr: 2026,
      zeitraumVon: new Date("2026-03-01"),
      zeitraumBis: new Date("2026-03-10"),
      transportUnternehmerId: tuHartmann.id,
      niederlassungId: nlAug.id,
      anzahlPositionen: 3,
      gesamtbetrag: 1376.95,
      status: "erzeugt",
    },
  });
  await prisma.tuAbrechnungsPosition.createMany({
    data: [
      {
        tuAbrechnungId: abrHartmann.id, tourId: tour21.id,
        tourNummer: "T-2026-021", tourDatum: heute,
        konditionId: kondHartmannBmw.id, konditionName: "Hartmann Standard BMW",
        tourKosten: 150.0, stoppKosten: 50.0, tagKosten: 0, lastKmKosten: 106.25, leerKmKosten: 72.25, mautKmKosten: 13.30,
        gesamtKosten: 391.80, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      },
      {
        tuAbrechnungId: abrHartmann.id, tourId: tour22.id,
        tourNummer: "T-2026-022", tourDatum: heute,
        konditionId: kondHartmannDai.id, konditionName: "Hartmann Daimler Standard",
        tourKosten: 180.0, stoppKosten: 30.0, tagKosten: 0, lastKmKosten: 214.50, leerKmKosten: 148.50, mautKmKosten: 26.60,
        gesamtKosten: 599.60, lastKilometer: 165, leerKilometer: 165, mautKilometer: 140,
      },
      {
        // Tour 3 aus dem Basis-Seed (T-2026-003)
        tuAbrechnungId: abrHartmann.id,
        tourId: (await prisma.tour.findFirstOrThrow({ where: { tourNummer: "T-2026-003" } })).id,
        tourNummer: "T-2026-003", tourDatum: heute,
        konditionId: kondHartmannBmw.id, konditionName: "Hartmann Standard BMW",
        tourKosten: 150.0, stoppKosten: 50.0, tagKosten: 0, lastKmKosten: 106.25, leerKmKosten: 72.25, mautKmKosten: 13.30,
        gesamtKosten: 385.55, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      },
    ],
  });

  // Abrechnung 2: Kraus (offen, 2 Positionen — nutzt die Basis-Tour T-2026-003 nochmal ist unrealistisch, nehmen wir T-2026-023 + T-2026-021 duplikat-frei)
  const abrKraus = await prisma.tuAbrechnung.create({
    data: {
      belegnummer: "ABR-2026-011",
      buchungsjahr: 2026,
      zeitraumVon: new Date("2026-03-01"),
      zeitraumBis: new Date("2026-03-10"),
      transportUnternehmerId: tuKraus.id,
      niederlassungId: nlNue.id,
      anzahlPositionen: 2,
      gesamtbetrag: 734.60,
      status: "offen",
    },
  });
  await prisma.tuAbrechnungsPosition.createMany({
    data: [
      {
        tuAbrechnungId: abrKraus.id, tourId: tour23.id,
        tourNummer: "T-2026-023", tourDatum: heute,
        konditionId: kondMuellerBmw.id, konditionName: "Müller BMW München",
        tourKosten: 140.0, stoppKosten: 44.0, tagKosten: 0, lastKmKosten: 102.0, leerKmKosten: 68.0, mautKmKosten: 13.30,
        gesamtKosten: 367.30, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      },
      {
        tuAbrechnungId: abrKraus.id, tourId: tour23.id,
        tourNummer: "T-2026-023", tourDatum: heute,
        konditionId: kondMuellerBmw.id, konditionName: "Müller BMW München",
        tourKosten: 140.0, stoppKosten: 44.0, tagKosten: 0, lastKmKosten: 102.0, leerKmKosten: 68.0, mautKmKosten: 13.30,
        gesamtKosten: 367.30, lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
        bemerkung: "Korrektur-Position",
      },
    ],
  });

  // ============================================================
  // SCHRITT 7: EDI-Imports
  // ============================================================
  console.log("EDI-Imports...");

  await prisma.ediImport.createMany({
    data: [
      {
        format: "VDA4913",
        dateiname: "BMW_MUC_20260310_001.vda",
        status: "success",
        ergebnis: { anzahlAvise: 3, anzahlPositionen: 9, bemerkung: "BMW München Tageslieferung" },
        benutzerId: admin.id,
        benutzerName: "admin",
        erstelltAm: new Date("2026-03-10T06:30:00"),
      },
      {
        format: "DESADV",
        dateiname: "DAIMLER_SIN_DESADV_20260310.edi",
        status: "success",
        ergebnis: { anzahlAvise: 2, anzahlPositionen: 7, bemerkung: "Daimler Sindelfingen Dispatch Advice" },
        benutzerId: admin.id,
        benutzerName: "admin",
        erstelltAm: new Date("2026-03-10T07:15:00"),
      },
      {
        format: "IFTSTA",
        dateiname: "STATUS_UPDATE_20260310.edi",
        status: "success",
        ergebnis: { anzahlUpdates: 4, bemerkung: "Status-Updates: 2× Zugestellt, 1× Unterwegs, 1× Angekommen" },
        benutzerId: admin.id,
        benutzerName: "admin",
        erstelltAm: new Date("2026-03-10T14:00:00"),
      },
    ],
  });

  // ============================================================
  // SCHRITT 8: Zusätzlicher Forecast
  // ============================================================
  console.log("Forecast...");

  await prisma.forecast.create({
    data: {
      bezeichnung: "Daimler Sindelfingen Q2 2026",
      oemId: daimler.id,
      werkId: werkSind.id,
      gueltigVon: new Date("2026-04-01"),
      gueltigBis: new Date("2026-06-30"),
      status: "aktiv",
      niederlassungId: nlAug.id,
      details: {
        create: [
          { kalenderwoche: 14, jahr: 2026, menge: 800, gewicht: 4800 },
          { kalenderwoche: 15, jahr: 2026, menge: 950, gewicht: 5700 },
          { kalenderwoche: 16, jahr: 2026, menge: 870, gewicht: 5220 },
          { kalenderwoche: 17, jahr: 2026, menge: 920, gewicht: 5520 },
        ],
      },
    },
  });

  // ============================================================
  // FERTIG
  // ============================================================
  console.log("\n========================================");
  console.log("Arbeitstag-Seed abgeschlossen!");
  console.log("========================================");
  console.log("\nStammdaten:");
  console.log("  Werke: 7 (4 Basis + 3 neu)");
  console.log("  Lieferanten: 6 (3 Basis + 3 neu)");
  console.log("  TUs: 4 (2 Basis + 2 neu)");
  console.log("  KFZ: 8 (3 Basis + 5 neu)");
  console.log("  Routen: 6 (2 Basis + 4 neu)");
  console.log("  Konditionen: 6 (1 Basis + 5 neu)");
  console.log("\nTages-Daten (2026-03-10):");
  console.log("  Avise: 18 (3 Basis + 15 neu)");
  console.log("  Artikelzeilen: ~62 (7 Basis + ~55 neu)");
  console.log("  Touren: 19 (4 Basis + 15 neu)");
  console.log("    - 3 offen, 4 disponiert, 4 abgefahren, 3 abgeschlossen, 1 gebrochen");
  console.log("  Abfahrten: 7 (1 Basis + 6 neu)");
  console.log("  Borderos: 9 (1 Basis + 8 neu)");
  console.log("  Sendungen: 21 (1 Basis + 20 neu)");
  console.log("  TU-Abrechnungen: 2 (1 erzeugt, 1 offen)");
  console.log("  EDI-Imports: 3 (VDA4913, DESADV, IFTSTA)");
  console.log("  Forecasts: 2 (BMW München + Daimler Sindelfingen)");
  console.log("  Umschlagpunkte: 2 (USP Augsburg + USP Nürnberg)");
  console.log("\nLogin: admin / admin | dispo / dispo");
}

seedArbeitstag()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
