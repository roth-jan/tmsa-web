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

  // 1b. Weitere Niederlassungen
  const nlMuc = await prisma.niederlassung.create({
    data: { name: "München", kurzbezeichnung: "MUC" },
  });
  const nlFra = await prisma.niederlassung.create({
    data: { name: "Frankfurt", kurzbezeichnung: "FRA" },
  });
  const nlBer = await prisma.niederlassung.create({
    data: { name: "Berlin", kurzbezeichnung: "BER" },
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
  // 3b. Weitere Werke
  const werkLei = await prisma.werk.create({
    data: { name: "Porsche Werk Leipzig", werkscode: "LEI", ort: "Leipzig", plz: "04158", oemId: porsche.id },
  });
  await prisma.werk.create({
    data: { name: "MAN Werk München", werkscode: "MAM", ort: "München", plz: "80995", oemId: man.id },
  });
  await prisma.werk.create({
    data: { name: "Audi Werk Ingolstadt", werkscode: "ING", ort: "Ingolstadt", plz: "85045", oemId: vw.id },
  });
  await prisma.werk.create({
    data: { name: "BMW Werk Regensburg", werkscode: "REG", ort: "Regensburg", plz: "93055", oemId: bmw.id },
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
  // 5b. Weitere Lieferanten
  await prisma.lieferant.create({
    data: { name: "Magna International", lieferantennummer: "LF004", ort: "Oberwaltersdorf", plz: "2522", land: "AT" },
  });
  await prisma.lieferant.create({
    data: { name: "Schaeffler AG", lieferantennummer: "LF005", ort: "Herzogenaurach", plz: "91074", land: "DE" },
  });
  await prisma.lieferant.create({
    data: { name: "Mahle GmbH", lieferantennummer: "LF006", ort: "Stuttgart", plz: "70376", land: "DE" },
  });
  await prisma.lieferant.create({
    data: { name: "BASF Coatings", lieferantennummer: "LF007", ort: "Münster", plz: "48165", land: "DE" },
  });
  await prisma.lieferant.create({
    data: { name: "Brose Fahrzeugteile", lieferantennummer: "LF008", ort: "Coburg", plz: "96450", land: "DE" },
  });

  // 6. Transport-Unternehmer
  const tuMeyer = await prisma.transportUnternehmer.create({
    data: { name: "Hartmann Transport GmbH", kurzbezeichnung: "HAR", ort: "Augsburg", niederlassungId: nlGersthofen.id },
  });
  const tuSchmidt = await prisma.transportUnternehmer.create({
    data: { name: "Kraus Spedition", kurzbezeichnung: "KRA", ort: "Nürnberg", niederlassungId: nlMuenchen.id },
  });

  // 6b. Weitere TUs
  const tuMueller = await prisma.transportUnternehmer.create({
    data: { name: "Müller Logistik GmbH", kurzbezeichnung: "MUE", ort: "München", niederlassungId: nlMuc.id },
  });
  const tuBauer = await prisma.transportUnternehmer.create({
    data: { name: "Bauer Transport OHG", kurzbezeichnung: "BAU", ort: "Frankfurt", niederlassungId: nlFra.id },
  });
  const tuWeber = await prisma.transportUnternehmer.create({
    data: { name: "Weber Spedition KG", kurzbezeichnung: "WEB", ort: "Berlin", niederlassungId: nlBer.id },
  });

  // 7. KFZ
  await prisma.kfz.create({
    data: { kennzeichen: "A-HA-2847", transportUnternehmerId: tuMeyer.id, fabrikat: "MAN TGX", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "A-HA-6193", transportUnternehmerId: tuMeyer.id, fabrikat: "Mercedes Actros", lkwTyp: "Gliederzug", maxLdm: 7.7, maxGewicht: 12000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "N-KR-5934", transportUnternehmerId: tuSchmidt.id, fabrikat: "Scania R450", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  // 7b. Weitere KFZ
  await prisma.kfz.create({
    data: { kennzeichen: "M-LS-4721", transportUnternehmerId: tuMueller.id, fabrikat: "DAF XF", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "M-LS-8305", transportUnternehmerId: tuMueller.id, fabrikat: "Volvo FH", lkwTyp: "Gliederzug", maxLdm: 7.7, maxGewicht: 12000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "F-BT-1456", transportUnternehmerId: tuBauer.id, fabrikat: "Iveco S-Way", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "F-BT-3782", transportUnternehmerId: tuBauer.id, fabrikat: "MAN TGS", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "B-WS-2091", transportUnternehmerId: tuWeber.id, fabrikat: "Mercedes Actros L", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "B-WS-7614", transportUnternehmerId: tuWeber.id, fabrikat: "Scania S520", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });

  // 8. Routen
  const routeBmw1 = await prisma.route.create({
    data: { routennummer: "BMW-R001", oemId: bmw.id, beschreibung: "Augsburg → München", kilometerLast: 85, kilometerLeer: 85, kilometerMaut: 70 },
  });
  const routeBmw2 = await prisma.route.create({
    data: { routennummer: "BMW-R002", oemId: bmw.id, beschreibung: "Augsburg → Dingolfing", kilometerLast: 165, kilometerLeer: 165, kilometerMaut: 140 },
  });
  // 8b. Weitere Routen
  const routeDai1 = await prisma.route.create({
    data: { routennummer: "DAI-R001", oemId: daimler.id, beschreibung: "Augsburg → Sindelfingen", kilometerLast: 165, kilometerLeer: 165, kilometerMaut: 140 },
  });
  const routeVw1 = await prisma.route.create({
    data: { routennummer: "VW-R001", oemId: vw.id, beschreibung: "Nürnberg → Wolfsburg", kilometerLast: 420, kilometerLeer: 420, kilometerMaut: 380 },
  });
  const routePor1 = await prisma.route.create({
    data: { routennummer: "POR-R001", oemId: porsche.id, beschreibung: "Nürnberg → Leipzig", kilometerLast: 280, kilometerLeer: 280, kilometerMaut: 250 },
  });
  await prisma.route.create({
    data: { routennummer: "MAN-R001", oemId: man.id, beschreibung: "Augsburg → München MAN", kilometerLast: 75, kilometerLeer: 75, kilometerMaut: 60 },
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
  // 9b. Weitere Konditionen
  await prisma.kondition.create({
    data: {
      name: "Hartmann Daimler Standard",
      transportUnternehmerId: tuMeyer.id,
      routeId: routeDai1.id,
      tourFaktor: 180.0, stoppFaktor: 30.0, lastKmFaktor: 1.30, leerKmFaktor: 0.90, mautKmFaktor: 0.19,
      maximalFrachtProTour: 550.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  await prisma.kondition.create({
    data: {
      name: "Müller BMW München",
      transportUnternehmerId: tuMueller.id,
      routeId: routeBmw1.id,
      tourFaktor: 140.0, stoppFaktor: 22.0, lastKmFaktor: 1.20, leerKmFaktor: 0.80, mautKmFaktor: 0.19,
      maximalFrachtProTour: 420.0,
      gueltigVon: new Date("2026-01-01"),
    },
  });
  await prisma.kondition.create({
    data: {
      name: "Kraus VW Wolfsburg",
      transportUnternehmerId: tuSchmidt.id,
      routeId: routeVw1.id,
      tourFaktor: 250.0, stoppFaktor: 35.0, lastKmFaktor: 1.35, leerKmFaktor: 0.95, mautKmFaktor: 0.19,
      maximalFrachtProTour: 850.0,
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

  const kfzMeyer1 = await prisma.kfz.findFirst({ where: { kennzeichen: "A-HA-2847" } });

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

  // 14b. Dedicated test tours (retry-safe — not shared with read-only tests)
  // T-2026-005: Brechbare Tour für "Tour brechen" E2E-Test
  await prisma.tour.create({
    data: {
      tourNummer: "T-2026-005",
      tourDatum: new Date("2026-03-11"),
      status: "disponiert",
      istGebrochen: false,
      niederlassungId: nlGersthofen.id,
      routeId: routeBmw1.id,
    },
  });

  // T-2026-006: Gebrochene Tour für "Zusammenführen" E2E-Test
  const tourGV2 = await prisma.tour.create({
    data: {
      tourNummer: "T-2026-006",
      tourDatum: new Date("2026-03-13"),
      status: "disponiert",
      istGebrochen: true,
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.streckenabschnitt.createMany({
    data: [
      { tourId: tourGV2.id, reihenfolge: 1, typ: "VL", vonBeschreibung: "Continental Hannover", nachBeschreibung: "USP Augsburg", umschlagPunktId: uspGersthofen.id },
      { tourId: tourGV2.id, reihenfolge: 2, typ: "NL", vonBeschreibung: "USP Augsburg", nachBeschreibung: "BMW Dingolfing", umschlagPunktId: uspGersthofen.id, routeId: routeBmw1.id, transportUnternehmerId: tuMeyer.id },
    ],
  });

  // 14c. Weitere Avise (mehr Volumen)
  const magna = await prisma.lieferant.findFirst({ where: { lieferantennummer: "LF004" } });
  const schaeffler = await prisma.lieferant.findFirst({ where: { lieferantennummer: "LF005" } });
  const mahle = await prisma.lieferant.findFirst({ where: { lieferantennummer: "LF006" } });
  const brose = await prisma.lieferant.findFirst({ where: { lieferantennummer: "LF008" } });

  const avis4 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-004", ladeDatum: new Date("2026-03-11"), status: "offen",
      lieferantId: magna!.id, werkId: werkMuc.id, niederlassungId: nlGersthofen.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Cockpit-Modul Typ A", menge: 80, masseinheit: "ST", gewicht: 2400, gutArt: "VOLLGUT", avisId: avis4.id },
    { artikelBeschreibung: "Türverkleidung links", menge: 200, masseinheit: "ST", gewicht: 1400, gutArt: "VOLLGUT", avisId: avis4.id },
    { artikelBeschreibung: "Türverkleidung rechts", menge: 200, masseinheit: "ST", gewicht: 1400, gutArt: "VOLLGUT", avisId: avis4.id },
  ]});

  const avis5 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-005", ladeDatum: new Date("2026-03-11"), status: "offen",
      lieferantId: schaeffler!.id, werkId: werkDin.id, niederlassungId: nlGersthofen.id, routeId: routeBmw2.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Radlager vorne", menge: 400, masseinheit: "ST", gewicht: 1200, gutArt: "VOLLGUT", avisId: avis5.id },
    { artikelBeschreibung: "Kupplungssatz Dual-Mass", menge: 100, masseinheit: "ST", gewicht: 1500, gutArt: "VOLLGUT", avisId: avis5.id },
  ]});

  const avis6 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-006", ladeDatum: new Date("2026-03-11"), status: "offen",
      lieferantId: mahle!.id, werkId: werkSind.id, niederlassungId: nlGersthofen.id, routeId: routeDai1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Kolben M3 Performance", menge: 500, masseinheit: "ST", gewicht: 750, gutArt: "VOLLGUT", avisId: avis6.id },
    { artikelBeschreibung: "Ölfilter-Modul", menge: 300, masseinheit: "ST", gewicht: 420, gutArt: "VOLLGUT", avisId: avis6.id },
    { artikelBeschreibung: "Turbolader K04", menge: 60, masseinheit: "ST", gewicht: 540, gutArt: "VOLLGUT", avisId: avis6.id },
  ]});

  const avis7 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-007", ladeDatum: new Date("2026-03-12"), status: "offen",
      lieferantId: brose!.id, werkId: werkWob.id, niederlassungId: nlMuenchen.id, routeId: routeVw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Fensterheber elektrisch", menge: 300, masseinheit: "ST", gewicht: 900, gutArt: "VOLLGUT", avisId: avis7.id },
    { artikelBeschreibung: "Sitzverstellung 12-Wege", menge: 150, masseinheit: "ST", gewicht: 1050, gutArt: "VOLLGUT", avisId: avis7.id },
    { artikelBeschreibung: "Leergut-Gitterboxen", menge: 20, masseinheit: "PAL", gewicht: 300, gutArt: "LEERGUT", avisId: avis7.id },
  ]});

  const avis8 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-008", ladeDatum: new Date("2026-03-12"), status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "Bosch GmbH" } }))!.id,
      werkId: werkLei.id, niederlassungId: nlMuenchen.id, routeId: routePor1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Scheinwerfer LED Matrix", menge: 100, masseinheit: "ST", gewicht: 700, gutArt: "VOLLGUT", avisId: avis8.id },
    { artikelBeschreibung: "Kabelbaum Hauptstrang", menge: 60, masseinheit: "ST", gewicht: 420, gutArt: "VOLLGUT", avisId: avis8.id },
  ]});

  const avis9 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-009", ladeDatum: new Date("2026-03-12"), status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "Continental AG" } }))!.id,
      werkId: werkSind.id, niederlassungId: nlGersthofen.id, routeId: routeDai1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Bremsscheiben 370mm", menge: 250, masseinheit: "ST", gewicht: 2250, gutArt: "VOLLGUT", avisId: avis9.id },
    { artikelBeschreibung: "ABS-Sensor Set", menge: 400, masseinheit: "ST", gewicht: 280, gutArt: "VOLLGUT", avisId: avis9.id },
  ]});

  const avis10 = await prisma.avis.create({
    data: { avisNummer: "AV-2026-010", ladeDatum: new Date("2026-03-13"), status: "offen",
      lieferantId: (await prisma.lieferant.findFirst({ where: { name: "ZF Friedrichshafen" } }))!.id,
      werkId: werkMuc.id, niederlassungId: nlGersthofen.id, routeId: routeBmw1.id },
  });
  await prisma.artikelzeile.createMany({ data: [
    { artikelBeschreibung: "Getriebe 8HP76", menge: 40, masseinheit: "ST", gewicht: 3600, gutArt: "VOLLGUT", avisId: avis10.id },
    { artikelBeschreibung: "Lenkgetriebe elektr.", menge: 80, masseinheit: "ST", gewicht: 960, gutArt: "VOLLGUT", avisId: avis10.id },
    { artikelBeschreibung: "Stoßdämpfer CDC", menge: 200, masseinheit: "ST", gewicht: 1000, gutArt: "VOLLGUT", avisId: avis10.id },
  ]});

  // 14d. Weitere Touren (verschiedene Status)
  const kfzMueller1 = await prisma.kfz.findFirst({ where: { kennzeichen: "M-LS-4721" } });
  const kfzBauer1 = await prisma.kfz.findFirst({ where: { kennzeichen: "F-BT-1456" } });
  const kfzWeber1 = await prisma.kfz.findFirst({ where: { kennzeichen: "B-WS-2091" } });

  // Offene Touren
  await prisma.tour.create({
    data: { tourNummer: "T-2026-007", tourDatum: new Date("2026-03-11"), status: "offen",
      niederlassungId: nlGersthofen.id, routeId: routeBmw1.id },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-008", tourDatum: new Date("2026-03-11"), status: "offen",
      niederlassungId: nlGersthofen.id, routeId: routeDai1.id },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-009", tourDatum: new Date("2026-03-12"), status: "offen",
      niederlassungId: nlMuenchen.id, routeId: routeVw1.id },
  });

  // Disponierte Touren
  await prisma.tour.create({
    data: { tourNummer: "T-2026-010", tourDatum: new Date("2026-03-11"), status: "disponiert",
      kfzId: kfzMueller1!.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw1.id, niederlassungId: nlGersthofen.id },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-011", tourDatum: new Date("2026-03-11"), status: "disponiert",
      kfzId: kfzBauer1!.id, transportUnternehmerId: tuBauer.id, routeId: routePor1.id, niederlassungId: nlMuenchen.id },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-012", tourDatum: new Date("2026-03-12"), status: "disponiert",
      kfzId: kfzWeber1!.id, transportUnternehmerId: tuWeber.id, routeId: routeVw1.id, niederlassungId: nlMuenchen.id },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-013", tourDatum: new Date("2026-03-12"), status: "disponiert",
      kfzId: kfzMeyer1!.id, transportUnternehmerId: tuMeyer.id, routeId: routeDai1.id, niederlassungId: nlGersthofen.id },
  });

  // Abgefahrene Touren
  await prisma.tour.create({
    data: { tourNummer: "T-2026-014", tourDatum: new Date("2026-03-10"), status: "abgefahren",
      kfzId: kfzMueller1!.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw2.id, niederlassungId: nlGersthofen.id,
      quittung: true, quittungDatum: new Date("2026-03-10"), lastKilometer: 170 },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-015", tourDatum: new Date("2026-03-10"), status: "abgefahren",
      kfzId: kfzBauer1!.id, transportUnternehmerId: tuBauer.id, routeId: routePor1.id, niederlassungId: nlMuenchen.id,
      quittung: true, quittungDatum: new Date("2026-03-10"), lastKilometer: 285 },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-016", tourDatum: new Date("2026-03-09"), status: "abgefahren",
      kfzId: kfzWeber1!.id, transportUnternehmerId: tuWeber.id, routeId: routeVw1.id, niederlassungId: nlMuenchen.id,
      quittung: true, quittungDatum: new Date("2026-03-09"), lastKilometer: 425 },
  });

  // Abgeschlossene Touren
  await prisma.tour.create({
    data: { tourNummer: "T-2026-017", tourDatum: new Date("2026-03-08"), status: "abgeschlossen",
      kfzId: kfzMeyer1!.id, transportUnternehmerId: tuMeyer.id, routeId: routeBmw1.id, niederlassungId: nlGersthofen.id,
      quittung: true, quittungDatum: new Date("2026-03-08"), lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      kostenKondition: 391.80, abrechnungsStatus: 1 },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-018", tourDatum: new Date("2026-03-08"), status: "abgeschlossen",
      kfzId: kfzMueller1!.id, transportUnternehmerId: tuMueller.id, routeId: routeBmw1.id, niederlassungId: nlGersthofen.id,
      quittung: true, quittungDatum: new Date("2026-03-08"), lastKilometer: 85, leerKilometer: 85, mautKilometer: 70,
      kostenKondition: 367.30, abrechnungsStatus: 0 },
  });
  await prisma.tour.create({
    data: { tourNummer: "T-2026-019", tourDatum: new Date("2026-03-07"), status: "abgeschlossen",
      kfzId: kfzBauer1!.id, transportUnternehmerId: tuBauer.id, routeId: routeDai1.id, niederlassungId: nlGersthofen.id,
      quittung: true, quittungDatum: new Date("2026-03-07"), lastKilometer: 165, leerKilometer: 165, mautKilometer: 140,
      kostenKondition: 599.60, abrechnungsStatus: 1 },
  });

  // 14e. Forecast Seed
  await prisma.forecast.create({
    data: {
      bezeichnung: "BMW München Q2 2026",
      oemId: bmw.id,
      werkId: werkMuc.id,
      gueltigVon: new Date("2026-04-01"),
      gueltigBis: new Date("2026-06-30"),
      status: "aktiv",
      niederlassungId: nlGersthofen.id,
      details: {
        create: [
          { kalenderwoche: 14, jahr: 2026, menge: 1200, gewicht: 6000 },
          { kalenderwoche: 15, jahr: 2026, menge: 1500, gewicht: 7500 },
          { kalenderwoche: 16, jahr: 2026, menge: 1100, gewicht: 5500 },
        ],
      },
    },
  });

  await prisma.forecast.create({
    data: {
      bezeichnung: "Daimler Sindelfingen Q2 2026",
      oemId: daimler.id,
      werkId: werkSind.id,
      gueltigVon: new Date("2026-04-01"),
      gueltigBis: new Date("2026-06-30"),
      status: "aktiv",
      niederlassungId: nlGersthofen.id,
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

  // 14. Rechte
  const module = [
    "niederlassung", "oem", "werk", "lieferant", "abladestelle",
    "tu", "kfz", "route", "kondition",
    "dispoort", "disporegel",
    "avis", "mengenplan", "tour", "abfahrt", "nacharbeit", "sendung", "tuabrechnung",
    "berichte",
    "benutzer",
    "umschlagpunkt", "gebrocheneverkehre",
    "auditlog", "edi", "forecast",
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
  const kernModule = ["avis", "mengenplan", "tour", "abfahrt", "nacharbeit", "sendung", "gebrocheneverkehre", "forecast"];
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
  const passwortHash = await bcrypt.hash("Admin1!", 10);
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
  const dispoHash = await bcrypt.hash("Dispo1!", 10);
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
  console.log("Login: admin / Admin1! (Thomas Berger, Administrator)");
  console.log("Login: dispo / Dispo1! (Lisa Maier, Disponent)");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
