import { StammdatenPage } from "../StammdatenPage";

export function KfzPage() {
  return (
    <StammdatenPage
      titel="Fahrzeuge (KFZ)"
      apiEndpoint="/kfz"
      columns={[
        { field: "kennzeichen", headerName: "Kennzeichen", width: 140 },
        { field: "transportUnternehmer.name", headerName: "TU", flex: 1 },
        { field: "fabrikat", headerName: "Fabrikat", width: 150 },
        { field: "lkwTyp", headerName: "LKW-Typ", width: 120 },
        { field: "maxLdm", headerName: "Max LDM", width: 100 },
        { field: "maxGewicht", headerName: "Max kg", width: 100 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "kennzeichen", label: "Kennzeichen", required: true },
        { name: "transportUnternehmerId", label: "TU-ID", required: true },
        { name: "fabrikat", label: "Fabrikat" },
        { name: "lkwTyp", label: "LKW-Typ" },
        { name: "maxLdm", label: "Max. Lademeter", type: "number" },
        { name: "maxGewicht", label: "Max. Gewicht (kg)", type: "number" },
        { name: "schadstoffklasse", label: "Schadstoffklasse" },
      ]}
    />
  );
}
