import prisma from "./db";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Erstelle Testdaten...");

  // 1. Niederlassungen
  const nlGersthofen = await prisma.niederlassung.create({
    data: { name: "Gersthofen", kurzbezeichnung: "GER" },
  });
  const nlMuenchen = await prisma.niederlassung.create({
    data: { name: "München", kurzbezeichnung: "MUC" },
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
    data: { name: "Spedition Meyer", kurzbezeichnung: "MEY", ort: "Augsburg", niederlassungId: nlGersthofen.id },
  });
  const tuSchmidt = await prisma.transportUnternehmer.create({
    data: { name: "Schmidt Transport", kurzbezeichnung: "SCH", ort: "München", niederlassungId: nlMuenchen.id },
  });

  // 7. KFZ
  await prisma.kfz.create({
    data: { kennzeichen: "A-ME-1234", transportUnternehmerId: tuMeyer.id, fabrikat: "MAN TGX", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "A-ME-5678", transportUnternehmerId: tuMeyer.id, fabrikat: "Mercedes Actros", lkwTyp: "Gliederzug", maxLdm: 7.7, maxGewicht: 12000 },
  });
  await prisma.kfz.create({
    data: { kennzeichen: "M-SC-9999", transportUnternehmerId: tuSchmidt.id, fabrikat: "Scania R450", lkwTyp: "Sattelzug", maxLdm: 13.6, maxGewicht: 24000 },
  });

  // 8. Routen
  const routeBmw1 = await prisma.route.create({
    data: { routennummer: "BMW-R001", oemId: bmw.id, beschreibung: "Gersthofen → München", kilometerLast: 85, kilometerLeer: 85, kilometerMaut: 70 },
  });
  await prisma.route.create({
    data: { routennummer: "BMW-R002", oemId: bmw.id, beschreibung: "Gersthofen → Dingolfing", kilometerLast: 165, kilometerLeer: 165, kilometerMaut: 140 },
  });

  // 9. Konditionen
  await prisma.kondition.create({
    data: {
      name: "Meyer Standard BMW",
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

  // 10. Rechte
  const module = [
    "niederlassung", "oem", "werk", "lieferant", "abladestelle",
    "tu", "kfz", "route", "kondition",
    "avis", "mengenplan", "abfahrt", "nacharbeit", "tuabrechnung",
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

  // 12. Rolle Disponent (Lesen + Kern-Module)
  const dispoRolle = await prisma.rolle.create({
    data: { name: "Disponent", beschreibung: "Disposition und operative Module" },
  });

  // 13. Admin-Benutzer
  const passwortHash = await bcrypt.hash("admin", 10);
  const admin = await prisma.benutzer.create({
    data: {
      benutzername: "admin",
      passwortHash,
      vorname: "System",
      nachname: "Administrator",
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
      vorname: "Max",
      nachname: "Mustermann",
      niederlassungId: nlGersthofen.id,
    },
  });
  await prisma.benutzerRolle.create({
    data: { benutzerId: dispo.id, rolleId: dispoRolle.id },
  });

  console.log("Testdaten erstellt!");
  console.log("Login: admin / admin (Administrator)");
  console.log("Login: dispo / dispo (Disponent)");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
