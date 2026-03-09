import { StammdatenPage } from "../StammdatenPage";

export function KonditionenPage() {
  return (
    <StammdatenPage
      titel="Konditionen"
      apiEndpoint="/konditionen"
      columns={[
        { field: "name", headerName: "Name", flex: 1 },
        { field: "transportUnternehmer.name", headerName: "TU", width: 180 },
        { field: "route.routennummer", headerName: "Route", width: 120 },
        { field: "tourFaktor", headerName: "Tour-F.", width: 90 },
        { field: "stoppFaktor", headerName: "Stopp-F.", width: 90 },
        { field: "lastKmFaktor", headerName: "Last-km", width: 90 },
        { field: "leerKmFaktor", headerName: "Leer-km", width: 90 },
        { field: "maximalFrachtProTour", headerName: "Max/Tour", width: 100 },
      ]}
      formFields={[
        { name: "name", label: "Name", required: true },
        { name: "transportUnternehmerId", label: "TU-ID", required: true },
        { name: "routeId", label: "Route-ID" },
        { name: "tourFaktor", label: "Tour-Faktor", type: "number" },
        { name: "stoppFaktor", label: "Stopp-Faktor", type: "number" },
        { name: "tagFaktor", label: "Tag-Faktor", type: "number" },
        { name: "lastKmFaktor", label: "Last-km-Faktor", type: "number" },
        { name: "leerKmFaktor", label: "Leer-km-Faktor", type: "number" },
        { name: "mautKmFaktor", label: "Maut-km-Faktor", type: "number" },
        { name: "maximalFrachtProTour", label: "Max. Fracht pro Tour", type: "number" },
        { name: "maximalFrachtProTag", label: "Max. Fracht pro Tag", type: "number" },
        { name: "gueltigVon", label: "Gültig von (YYYY-MM-DD)", required: true },
        { name: "gueltigBis", label: "Gültig bis (YYYY-MM-DD)" },
      ]}
    />
  );
}
