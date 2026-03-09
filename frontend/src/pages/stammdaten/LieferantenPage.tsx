import { StammdatenPage } from "../StammdatenPage";

export function LieferantenPage() {
  return (
    <StammdatenPage
      titel="Lieferanten"
      apiEndpoint="/lieferanten"
      modul="lieferant"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "lieferantennummer", headerName: "LF-Nr.", width: 120 },
        { field: "plz", headerName: "PLZ", width: 80 },
        { field: "ort", headerName: "Ort", width: 150 },
        { field: "land", headerName: "Land", width: 80 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "lieferantennummer", label: "Lieferantennummer" },
        { name: "adresse", label: "Adresse" },
        { name: "plz", label: "PLZ" },
        { name: "ort", label: "Ort" },
        { name: "land", label: "Land" },
      ]}
    />
  );
}
