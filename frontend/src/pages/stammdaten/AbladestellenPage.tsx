import { StammdatenPage } from "../StammdatenPage";

export function AbladestellenPage() {
  return (
    <StammdatenPage
      titel="Abladestellen"
      apiEndpoint="/abladestellen"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "werk.name", headerName: "Werk", width: 200 },
        { field: "werk.oem.name", headerName: "OEM", width: 120 },
        { field: "entladeZone", headerName: "Entladezone", width: 120 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "werkId", label: "Werk-ID", required: true },
        { name: "entladeZone", label: "Entladezone" },
      ]}
    />
  );
}
