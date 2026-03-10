import prisma from "./db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Erstelle Testdaten...");

  // 1. Niederlassungen
  const nlGersthofen = await prisma.niederlassung.create({
    data: { name: "Augsburg", kurzbezeichnung: "AUG" },
  });
  const nlMuenchen = await prisma.niederlassung.create({
    data: { name: "Nürnberg", kurzbezeichnung: "NUE" },
  });

  // 2. OEMs
  const bmw = await prisma.oem.create({
    data: { name: "BMW", kurzbezeichnung: "BMW", ediKennung: "BMW" },
  });
  const daimler = await prisma.oem.create({
    data: { name: "Daimler", kurzbezeichnung: "DAI", ediKennung: "DAI" },
  });
  const vw = await prisma.oem.create({
    data: { name: "Volkswagen", kurzbezeichnung: "VW", ediKennung: "VWT" },
  });
  const porsche = await prisma.oem.create({
    data: { name: "Porsche", kurzbezeichnung: "POR", ediKennung: "POR" },
  });
  const man = await prisma.oem.create({
    data: { name: "MAN", kurzbezeichnung: "MAN", ediKennung: "MAN" },
  });

  // 3. Werke
  const werkMuc = await prisma.werk.create({
    data: { name: "BMW Werk München", werkscode: "MUC", ort: "München", plz: "80788", oemId: bmw.id },
  });
  const werkDin = await prisma.werk.create({
    data: { name: "BMW Werk Dingolfing", werkscode: "DIN", ort: "Dingolfing", plz: "84130", oemId: bmw.id },
  });
  const werkSind = await prisma.werk.create({
    data: { name: "Daimler Sindelfingen", werkscode: "SIN", ort: "Sindelfingen", plz: "71063", oemId: daimler.id },
  });
  const werkWob = await prisma.werk.create({
    data: { name: "VW Wolfsburg", werkscode: "WOB", ort: "Wolfsburg", plz: "38440", oemId: vw.id },
  });

  // 4. Abladestellen
  await prisma.abladestelle.create({
    data: { name: "Tor 1 Nord", werkId: werkMuc.id, entladeZone: "Nord" },
  });
  await prisma.abladestelle.create({
    data: { name: "Tor 5 Süd", werkId: werkMuc.id, entladeZone: "Süd" },
  });
  await prisma.abladestelle.create({
    data: { name: "Halle 3", werkId: werkDin.id, entladeZone: "Ost" },
  });

  // 5. Lieferanten
  await prisma.lieferant.create({
    data: { name: "Bosch GmbH", lieferantennummer: "LF001", ort: "Stuttgart", plz: "70469", land: "DE" },
  });
  await prisma.lieferant.create({
    data: { name: "Continental AG", lieferantennummer: "LF002", ort: "Hannover", plz: "30165", land: "DE" },
  });
  await prisma.lieferant.create({
    data: { name: "ZF Friedrichshafen", lieferantennummer: "LF003", ort: "Friedrichshafen", plz: "88046", land: "DE" },
  });

  // 6. Transport-Unternehmer
  const tuMeyer = await prisma.transportUnternehmer.create({
    data: { name: "Hartmann Transport GmbH", kurzbezeichnung: "HAR", ort: "Augsburg", niederlassungId: nlGersthofen.id },
  });
  const tuSchmidt = await prisma.transportUnternehmer.create({
    data: { name: "Kraus Spedition", kurzbezeichnung: "KRA", ort: "Nürnberg", niederlassungId: nlMuenchen.id },
  });

  // 7. KFZ
  await prisma.kfz.create({
    data: { kennzeichen: "A-HT-1234", transportUnternehmerId: tuMeyer.id, fabrikat: "MAN TGX", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "A-HT-5678", transportUnternehmerId: tuMeyer.id, fabrikat: "Mercedes Actros", lkwTyp: "Gliederzug", maxLdm: 7.7, maxGewicht: 12000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "N-KS-9012", transportUnternehmerId: tuSchmidt.id, fabrikat: "Scania R450", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });

  // 8. Routen
  const routeBmw1 = await prisma.route.create({
    data: { routennummer: "BMW-R001", oemId: bmw.id, beschreibung: "Augsburg → München", kilometerLast: 85, kilometerLeer: 85, kilometerMaut: 70 },
  });
  await prisma.route.create({
    data: { routennummer: "BMW-R002", oemId: bmw.id, beschreibung: "Augsburg → Dingolfing", kilometerLast: 165, kilometerLeer: 165, kilometerMaut: 140 },
  });

  // 9. Konditionen
  await prisma.kondition.create({
    data: {
      name: "Hartmann Standard BMW",
      transportUnternehmerId: tuMeyer.id,
      routeId: routeBmw1.id,
      tourFaktor: 150.0,
      stoppFaktor: 25.0,
      lastKmFaktor: 1.25,
      leerKmFaktor: 0.85,
      mautKmFaktor: 0.19,
      maximalFrachtProTour: 450.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });

  // 10. Dispo-Orte
  await prisma.dispoOrt.create({
    data: { bezeichnung: "Umschlag Augsburg", plz: "86150", ort: "Augsburg", sortierung: 1, niederlassungId: nlGersthofen.id },
  });
  await prisma.dispoOrt.create({
    data: { bezeichnung: "Werk München Tor Nord", plz: "80788", ort: "München", werkId: werkMuc.id, sortierung: 2, niederlassungId: nlGersthofen.id },
  });

  // 11. Dispo-Regeln
  await prisma.dispoRegel.create({
    data: { bezeichnung: "BMW Standard", regeltyp: "OEM-Zuordnung", prioritaet: 1, bedingung: "OEM = BMW", aktion: "Route BMW-R001", niederlassungId: nlGersthofen.id },
  });
  await prisma.dispoRegel.create({
    data: { bezeichnung: "Gewichtslimit 24t", regeltyp: "Gewicht", prioritaet: 2, bedingung: "Gewicht > 24000", aktion: "Tour splitten", niederlassungId: nlGersthofen.id },
  });

  // 12. Avise + Artikelzeilen
  const avis1 = await prisma.avis.create({
    data: {
      avisNummer: "AV-2026-001",
      ladeDatum: new Date("2026-03-10"),
      status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "Bosch GmbH" } }))!.id,
      werkId: werkMuc.id,
      niederlassungId: nlGersthofen.id,
      routeId: routeBmw1.id,
    },
  });
  await prisma.artikelzeile.createMany({
    data: [
      { artikelBeschreibung: "Stoßdämpfer vorne", menge: 500, masseinheit: "ST", gewicht: 2500, gutArt: "VOLLGUT", avisId: avis1.id },
      { artikelBeschreibung: "Stoßdämpfer hinten", menge: 300, masseinheit: "ST", gewicht: 1800, gutArt: "VOLLGUT", avisId: avis1.id },
      { artikelBeschreibung: "Leergut-Behälter", menge: 50, masseinheit: "PAL", gewicht: 500, gutArt: "LEERGUT", avisId: avis1.id },
    ],
  });

  const avis2 = await prisma.avis.create({
    data: {
      avisNummer: "AV-2026-002",
      ladeDatum: new Date("2026-03-10"),
      status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "Continental AG" } }))!.id,
      werkId: werkDin.id,
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.artikelzeile.createMany({
    data: [
      { artikelBeschreibung: "Bremsscheiben 340mm", menge: 200, masseinheit: "ST", gewicht: 1600, gutArt: "VOLLGUT", avisId: avis2.id },
      { artikelBeschreibung: "Bremsbeläge Set", menge: 400, masseinheit: "ST", gewicht: 800, gutArt: "VOLLGUT", avisId: avis2.id },
    ],
  });

  const avis3 = await prisma.avis.create({
    data: {
      avisNummer: "AV-2026-003",
      ladeDatum: new Date("2026-03-11"),
      status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "ZF Friedrichshafen" } }))!.id,
      werkId: werkMuc.id,
      niederlassungId: nlGersthofen.id,
      routeId: routeBmw1.id,
    },
  });
  await prisma.artikelzeile.createMany({
    data: [
      { artikelBeschreibung: "Getriebe 8-Gang", menge: 50, masseinheit: "ST", gewicht: 4500, gutArt: "VOLLGUT", avisId: avis3.id },
      { artikelBeschreibung: "Antriebswelle links", menge: 120, masseinheit: "ST", gewicht: 960, gutArt: "VOLLGUT", avisId: avis3.id },
    ],
  });

  // 13. Touren
  const tour1 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-001",
      tourDatum: new Date("2026-03-10"),
      status: "disponiert",
      niederlassungId: nlGersthofen.id,
      routeId: routeBmw1.id,
    },
  });

  const kfzMeyer1 = await prisma.kfz.findFirst({ where: { kennzeichen: "A-HT-1234" } });

  const tour2 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-002",
      tourDatum: new Date("2026-03-10"),
      status: "abgefahren",
      kfzId: kfzMeyer1!.id,
      transportUnternehmerId: tuMeyer.id,
      routeId: routeBmw1.id,
      niederlassungId: nlGersthofen.id,
      quittung: true,
      quittungDatum: new Date("2026-03-10"),
      lastKilometer: 120,
    },
  });

  // Tour 3: Bewertete Tour (abrechnungsStatus=1) für Phase 4 Tests
  const kondMeyer = await prisma.kondition.findFirst({ where: { name: "Hartmann Standard BMW" } });
  await prisma.tour.create({
    data: {
      tourNummer: "T-2026-003",
      tourDatum: new Date("2026-03-10"),
      status: "abgeschlossen",
      kfzId: kfzMeyer1!.id,
      transportUnternehmerId: tuMeyer.id,
      konditionId: kondMeyer!.id,
      routeId: routeBmw1.id,
      niederlassungId: nlGersthofen.id,
      quittung: true,
      quittungDatum: new Date("2026-03-10"),
      lastKilometer: 85,
      leerKilometer: 85,
      mautKilometer: 70,
      kostenKondition: 385.55,
      abrechnungsStatus: 1,
    },
  });

  // 13b. Abfahrt + Bordero + Sendung
  const abfahrt1 = await prisma.abfahrt.create({
    data: {
      abfahrtNummer: "AF-2026-001",
      datum: new Date("2026-03-10"),
      status: "abgefahren",
      kfzId: kfzMeyer1!.id,
      transportUnternehmerId: tuMeyer.id,
      routeId: routeBmw1.id,
      tourId: tour2.id,
      niederlassungId: nlGersthofen.id,
    },
  });

  const bordero1 = await prisma.bordero.create({
    data: {
      borderoNummer: "B-2026-001",
      abfahrtId: abfahrt1.id,
      gewicht: 2500,
      lademeter: 6.5,
      status: "offen",
    },
  });

  const bosch = await prisma.lieferant.findFirst({ where: { name: "Bosch GmbH" } });
  await prisma.sendung.create({
    data: {
      sendungNummer: "S-2026-001",
      datum: new Date("2026-03-10"),
      status: 1,
      richtungsArt: "WE",
      borderoId: bordero1.id,
      werkId: werkMuc.id,
      oemId: bmw.id,
      lieferantId: bosch!.id,
      niederlassungId: nlGersthofen.id,
      gewicht: 2500,
      lademeter: 6.5,
    },
  });

  // 14a. Umschlagpunkt + Gebrochene Tour
  const uspGersthofen = await prisma.umschlagPunkt.create({
    data: { name: "USP Augsburg", kurzbezeichnung: "USP-AUG", plz: "86150", ort: "Augsburg", niederlassungId: nlGersthofen.id },
  });

  const tourGV = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-004",
      tourDatum: new Date("2026-03-12"),
      status: "disponiert",
      istGebrochen: true,
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.streckenabschnitt.createMany({
    data: [
      { tourId: tourGV.id, reihenfolge: 1, typ: "VL", vonBeschreibung: "Bosch Stuttgart", nachBeschreibung: "USP Augsburg", umschlagPunktId: uspGersthofen.id },
      { tourId: tourGV.id, reihenfolge: 2, typ: "NL", vonBeschreibung: "USP Augsburg", nachBeschreibung: "BMW München", umschlagPunktId: uspGersthofen.id, routeId: routeBmw1.id, transportUnternehmerId: tuMeyer.id },
    ],
  });

  // 14. Rechte
  const module = [
    "niederlassung", "oem", "werk", "lieferant", "abladestelle",
    "tu", "kfz", "route", "kondition",
    "dispoort", "disporegel",
    "avis", "mengenplan", "tour", "abfahrt", "nacharbeit", "sendung", "tuabrechnung",
    "berichte",
    "benutzer",
    "umschlagpunkt", "gebrocheneverkehre",
    "auditlog", "edi",
  ];
  const aktionen = ["lesen", "erstellen", "bearbeiten", "loeschen"];

  const rechteIds: string[] = [];
  for (const modul of module) {
    for (const aktion of aktionen) {
      const recht = await prisma.recht.create({
        data: { modul, aktion },
      });
      rechteIds.push(recht.id);
    }
  }

  // 11. Rolle Admin (alle Rechte)
  const adminRolle = await prisma.rolle.create({
    data: { name: "Administrator", beschreibung: "Vollzugriff auf alle Module" },
  });
  for (const rechtId of rechteIds) {
    await prisma.rolleRecht.create({
      data: { rolleId: adminRolle.id, rechtId },
    });
  }

  // 12. Rolle Disponent (Lesen auf Stammdaten + Vollzugriff auf Kern-Module)
  const dispoRolle = await prisma.rolle.create({
    data: { name: "Disponent", beschreibung: "Disposition und operative Module" },
  });

  // Disponent: Leserecht auf alle Stammdaten
  const stammdatenModule = ["niederlassung", "oem", "werk", "lieferant", "abladestelle", "tu", "kfz", "route", "kondition", "dispoort", "disporegel", "berichte", "umschlagpunkt"];
  const kernModule = ["avis", "mengenplan", "tour", "abfahrt", "nacharbeit", "sendung", "gebrocheneverkehre"];
  const alleDispoRechte = await prisma.recht.findMany({
    where: {
      OR: [
        { modul: { in: stammdatenModule }, aktion: "lesen" },
        { modul: { in: kernModule } },
      ],
    },
  });
  for (const recht of alleDispoRechte) {
    await prisma.rolleRecht.create({
      data: { rolleId: dispoRolle.id, rechtId: recht.id },
    });
  }

  // 13. Admin-Benutzer
  const passwortHash = await bcrypt.hash("admin", 10);
  const admin = await prisma.benutzer.create({
    data: {
      benutzername: "admin",
      passwortHash,
      vorname: "Thomas",
      nachname: "Berger",
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.benutzerRolle.create({
    data: { benutzerId: admin.id, rolleId: adminRolle.id },
  });

  // Disponent-Benutzer
  const dispoHash = await bcrypt.hash("dispo", 10);
  const dispo = await prisma.benutzer.create({
    data: {
      benutzername: "dispo",
      passwortHash: dispoHash,
      vorname: "Lisa",
      nachname: "Maier",
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.benutzerRolle.create({
    data: { benutzerId: dispo.id, rolleId: dispoRolle.id },
  });

  console.log("Testdaten erstellt!");
  console.log("Login: admin / admin (Thomas Berger, Administrator)");
  console.log("Login: dispo / dispo (Lisa Maier, Disponent)");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
