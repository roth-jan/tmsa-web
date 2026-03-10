import { StammdatenPage } from "../StammdatenPage";

export function UmschlagPunktePage() {
  return (
    <StammdatenPage
      titel="Umschlagpunkte"
      apiEndpoint="/umschlag-punkte"
      modul="umschlagpunkt"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "kurzbezeichnung", headerName: "Kürzel", width: 120 },
        { field: "niederlassung.name", headerName: "Niederlassung", width: 150 },
        { field: "plz", headerName: "PLZ", width: 80 },
        { field: "ort", headerName: "Ort", width: 150 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "kurzbezeichnung", label: "Kurzbezeichnung", required: true },
        {
          name: "niederlassungId",
          label: "Niederlassung",
          type: "select",
          required: true,
          optionsEndpoint: "/niederlassungen",
          optionsLabel: (nl: any) => `${nl.name} (${nl.kurzbezeichnung})`,
        },
        { name: "adresse", label: "Adresse" },
        { name: "plz", label: "PLZ" },
        { name: "ort", label: "Ort" },
      ]}
    />
  );
}
