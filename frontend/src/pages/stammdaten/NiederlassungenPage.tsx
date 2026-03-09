import { StammdatenPage } from "../StammdatenPage";

export function NiederlassungenPage() {
  return (
    <StammdatenPage
      titel="Niederlassungen"
      apiEndpoint="/niederlassungen"
      modul="niederlassung"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "kurzbezeichnung", headerName: "Kürzel", width: 120 },
        { field: "plz", headerName: "PLZ", width: 80 },
        { field: "ort", headerName: "Ort", width: 150 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "kurzbezeichnung", label: "Kurzbezeichnung", required: true },
        { name: "adresse", label: "Adresse" },
        { name: "plz", label: "PLZ" },
        { name: "ort", label: "Ort" },
      ]}
    />
  );
}
