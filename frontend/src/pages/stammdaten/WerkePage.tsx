import { StammdatenPage } from "../StammdatenPage";

export function WerkePage() {
  return (
    <StammdatenPage
      titel="Werke"
      apiEndpoint="/werke"
      modul="werk"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "werkscode", headerName: "Werkscode", width: 120 },
        { field: "oem.name", headerName: "OEM", width: 120 },
        { field: "plz", headerName: "PLZ", width: 80 },
        { field: "ort", headerName: "Ort", width: 150 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "werkscode", label: "Werkscode" },
        {
          name: "oemId",
          label: "OEM",
          type: "select",
          required: true,
          optionsEndpoint: "/oems",
          optionsLabel: "name",
        },
        { name: "adresse", label: "Adresse" },
        { name: "plz", label: "PLZ" },
        { name: "ort", label: "Ort" },
      ]}
    />
  );
}
