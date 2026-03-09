import { StammdatenPage } from "../StammdatenPage";

export function RoutenPage() {
  return (
    <StammdatenPage
      titel="Routen"
      apiEndpoint="/routen"
      columns={[
        { field: "routennummer", headerName: "Routennr.", width: 140 },
        { field: "oem.name", headerName: "OEM", width: 120 },
        { field: "beschreibung", headerName: "Beschreibung", flex: 1 },
        { field: "kilometerLast", headerName: "km Last", width: 100 },
        { field: "kilometerLeer", headerName: "km Leer", width: 100 },
        { field: "kilometerMaut", headerName: "km Maut", width: 100 },
        { field: "aktiv", headerName: "Aktiv", width: 80 },
      ]}
      formFields={[
        { name: "routennummer", label: "Routennummer", required: true },
        { name: "oemId", label: "OEM-ID", required: true },
        { name: "beschreibung", label: "Beschreibung" },
        { name: "kilometerLast", label: "Kilometer Last", type: "number" },
        { name: "kilometerLeer", label: "Kilometer Leer", type: "number" },
        { name: "kilometerMaut", label: "Kilometer Maut", type: "number" },
      ]}
    />
  );
}
