import { StammdatenPage } from "../StammdatenPage";

export function DispoOrtePage() {
  return (
    <StammdatenPage
      titel="Dispo-Orte"
      apiEndpoint="/dispo-orte"
      modul="dispoort"
      columns={[
        { field: "bezeichnung", headerName: "Bezeichnung", flex: 1 },
        { field: "plz", headerName: "PLZ", width: 80 },
        { field: "ort", headerName: "Ort", width: 150 },
        { field: "land", headerName: "Land", width: 80 },
        { field: "sortierung", headerName: "Sort.", width: 80 },
        { field: "werk.name", headerName: "Werk", width: 150 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "bezeichnung", label: "Bezeichnung", required: true },
        { name: "plz", label: "PLZ" },
        { name: "ort", label: "Ort" },
        { name: "land", label: "Land" },
        { name: "sortierung", label: "Sortierung", type: "number" },
        {
          name: "werkId",
          label: "Werk",
          type: "select",
          optionsEndpoint: "/werke",
          optionsLabel: "name",
        },
        {
          name: "niederlassungId",
          label: "Niederlassung",
          type: "select",
          required: true,
          optionsEndpoint: "/niederlassungen",
          optionsLabel: (nl: any) => `${nl.name} (${nl.kurzbezeichnung})`,
        },
      ]}
    />
  );
}
