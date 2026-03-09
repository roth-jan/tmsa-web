import { StammdatenPage } from "../StammdatenPage";

export function OemsPage() {
  return (
    <StammdatenPage
      titel="OEMs"
      apiEndpoint="/oems"
      modul="oem"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "kurzbezeichnung", headerName: "Kürzel", width: 120 },
        { field: "ediKennung", headerName: "EDI-Kennung", width: 120 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "kurzbezeichnung", label: "Kurzbezeichnung", required: true },
        { name: "ediKennung", label: "EDI-Kennung" },
      ]}
    />
  );
}
