import { StammdatenPage } from "../StammdatenPage";

export function DispoRegelnPage() {
  return (
    <StammdatenPage
      titel="Dispo-Regeln"
      apiEndpoint="/dispo-regeln"
      modul="disporegel"
      columns={[
        { field: "bezeichnung", headerName: "Bezeichnung", flex: 1 },
        { field: "regeltyp", headerName: "Regeltyp", width: 150 },
        { field: "prioritaet", headerName: "Priorität", width: 100 },
        { field: "bedingung", headerName: "Bedingung", width: 200 },
        { field: "aktion", headerName: "Aktion", width: 200 },
        { field: "istAktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "bezeichnung", label: "Bezeichnung", required: true },
        { name: "regeltyp", label: "Regeltyp", required: true },
        { name: "prioritaet", label: "Priorität", type: "number" },
        { name: "bedingung", label: "Bedingung" },
        { name: "aktion", label: "Aktion" },
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
