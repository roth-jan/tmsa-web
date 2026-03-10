import { useState, useCallback } from "react";
import {
  Title, Button, Group, TextInput, Stack, Alert, Text, Paper, Tabs,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";

ModuleRegistry.registerModules([AllCommunityModule]);

const EUR = (v: any) => v != null ? `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "";
const datumFmt = (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "";
const zeitFmt = (p: any) => p.value ? new Date(p.value).toLocaleString("de-DE") : "";
const API_BASE = "http://localhost:3001/api";

function csvUrl(endpoint: string, params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, format: "csv" }).toString();
  return `${API_BASE}/berichte/${endpoint}?${qs}`;
}

// ============================================================
// Generischer Bericht-Tab
// ============================================================
interface BerichtTabProps {
  endpoint: string;
  columns: ColDef[];
  extraFilters?: React.ReactNode;
  extraParams?: Record<string, string>;
  datumFeld?: "datum" | "buchungsjahr" | "none";
}

function BerichtTab({ endpoint, columns, extraParams = {}, datumFeld = "datum" }: BerichtTabProps) {
  const defaultVon = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const defaultBis = new Date().toISOString().split("T")[0];

  const [datumVon, setDatumVon] = useState(defaultVon);
  const [datumBis, setDatumBis] = useState(defaultBis);
  const [buchungsjahr, setBuchungsjahr] = useState(String(new Date().getFullYear()));
  const [daten, setDaten] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const buildParams = useCallback(() => {
    const params: Record<string, string> = { ...extraParams };
    if (datumFeld === "datum") {
      if (datumVon) params.datumVon = datumVon;
      if (datumBis) params.datumBis = datumBis;
    } else if (datumFeld === "buchungsjahr") {
      if (buchungsjahr) params.buchungsjahr = buchungsjahr;
    }
    // "none" = keine Datumsfilter
    return params;
  }, [datumVon, datumBis, buchungsjahr, extraParams, datumFeld]);

  const laden = useCallback(async () => {
    setError(""); setLoading(true);
    try {
      const params = buildParams();
      const qs = new URLSearchParams(params).toString();
      const res = await api(`/berichte/${endpoint}?${qs}`);
      setDaten(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildParams]);

  const herunterladen = useCallback(() => {
    const url = csvUrl(endpoint, buildParams());
    window.open(url, "_blank");
  }, [endpoint, buildParams]);

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}

      <Paper p="sm" withBorder>
        <Group>
          {datumFeld === "datum" ? (
            <>
              <TextInput label="Datum von" type="date" value={datumVon}
                onChange={(e) => setDatumVon(e.target.value)} style={{ width: 160 }} />
              <TextInput label="Datum bis" type="date" value={datumBis}
                onChange={(e) => setDatumBis(e.target.value)} style={{ width: 160 }} />
            </>
          ) : datumFeld === "buchungsjahr" ? (
            <TextInput label="Buchungsjahr" type="number" value={buchungsjahr}
              onChange={(e) => setBuchungsjahr(e.target.value)} style={{ width: 120 }} />
          ) : null}
          <Button mt={datumFeld === "none" ? undefined : "xl"} onClick={laden} loading={loading}>Laden</Button>
        </Group>
      </Paper>

      <div style={{ height: "55vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={daten}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">{daten.length} Einträge gefunden</Text>
        {daten.length > 0 && (
          <Button variant="outline" onClick={herunterladen}>CSV herunterladen</Button>
        )}
      </Group>
    </Stack>
  );
}

// ============================================================
// Spalten-Definitionen pro Bericht
// ============================================================
const tourenCols: ColDef[] = [
  { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
  { field: "tourDatum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 110 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "kondition.name", headerName: "Kondition", width: 140 },
  { field: "lastKilometer", headerName: "Last-km", width: 90, type: "numericColumn" },
  { field: "leerKilometer", headerName: "Leer-km", width: 90, type: "numericColumn" },
  { field: "mautKilometer", headerName: "Maut-km", width: 90, type: "numericColumn" },
  { field: "kostenKondition", headerName: "Kosten", width: 110, valueFormatter: (p: any) => EUR(p.value), cellStyle: { fontWeight: "bold" } },
];

const aviseCols: ColDef[] = [
  { field: "avisNummer", headerName: "Avis-Nr.", width: 130 },
  { field: "ladeDatum", headerName: "Ladedatum", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 110 },
  { field: "lieferant.name", headerName: "Lieferant", width: 160 },
  { field: "werk.name", headerName: "Werk", width: 160 },
  { field: "werk.werkscode", headerName: "Werkscode", width: 90 },
  { field: "_count.artikelzeilen", headerName: "Zeilen", width: 80, type: "numericColumn" },
];

const tuKostenCols: ColDef[] = [
  { field: "tuName", headerName: "Transport-Unternehmer", width: 200 },
  { field: "tuKurz", headerName: "Kürzel", width: 90 },
  { field: "anzahlTouren", headerName: "Anzahl Touren", width: 130, type: "numericColumn" },
  { field: "summeKosten", headerName: "Summe Kosten", width: 140, valueFormatter: (p: any) => EUR(p.value), cellStyle: { fontWeight: "bold" } },
  { field: "durchschnittKosten", headerName: "Ø Kosten/Tour", width: 140, valueFormatter: (p: any) => EUR(p.value) },
];

const abfahrtenCols: ColDef[] = [
  { field: "abfahrtNummer", headerName: "Abfahrt-Nr.", width: 130 },
  { field: "datum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 110 },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "tour.tourNummer", headerName: "Tour", width: 130 },
  { field: "_count.borderos", headerName: "Borderos", width: 90, type: "numericColumn" },
];

const sendungenCols: ColDef[] = [
  { field: "sendungNummer", headerName: "Sendung-Nr.", width: 130 },
  { field: "datum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 80, valueFormatter: (p: any) => {
    const m: Record<number, string> = { 0: "offen", 1: "borderiert", 2: "storniert" };
    return m[p.value] ?? String(p.value);
  }},
  { field: "richtungsArt", headerName: "Richtung", width: 90 },
  { field: "bordero.borderoNummer", headerName: "Bordero", width: 130 },
  { field: "lieferant.name", headerName: "Lieferant", width: 160 },
  { field: "werk.name", headerName: "Werk", width: 140 },
  { field: "oem.kurzbezeichnung", headerName: "OEM", width: 80 },
  { field: "gewicht", headerName: "Gewicht (kg)", width: 110, type: "numericColumn" },
  { field: "lademeter", headerName: "Lademeter", width: 100, type: "numericColumn" },
];

const abrechnungenCols: ColDef[] = [
  { field: "belegnummer", headerName: "Beleg-Nr.", width: 140 },
  { field: "buchungsjahr", headerName: "Jahr", width: 70 },
  { field: "transportUnternehmer.name", headerName: "TU", width: 160 },
  { field: "zeitraumVon", headerName: "Von", width: 110, valueFormatter: datumFmt },
  { field: "zeitraumBis", headerName: "Bis", width: 110, valueFormatter: datumFmt },
  { field: "anzahlPositionen", headerName: "#Pos", width: 70, type: "numericColumn" },
  { field: "gesamtbetrag", headerName: "Betrag", width: 120, valueFormatter: (p: any) => EUR(p.value), cellStyle: { fontWeight: "bold" } },
  { field: "status", headerName: "Status", width: 100, cellStyle: (p: any) => ({
    color: p.value === "storniert" ? "red" : p.value === "erzeugt" ? "green" : "blue",
    fontWeight: "bold",
  })},
];

// Neue Berichte
const ausfallfrachtCols: ColDef[] = [
  { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
  { field: "tourDatum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 110 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "istLeerfahrt", headerName: "Leerfahrt", width: 90, valueFormatter: (p: any) => p.value ? "Ja" : "Nein" },
  { field: "_count.artikelzeilen", headerName: "Zeilen", width: 80, type: "numericColumn" },
];

const dfueCols: ColDef[] = [
  { field: "zeitpunkt", headerName: "Zeitpunkt", width: 170, valueFormatter: zeitFmt },
  { field: "avisNummer", headerName: "Avis-Nr.", width: 200 },
  { field: "format", headerName: "Format", width: 110 },
  { field: "status", headerName: "Status", width: 90 },
  { field: "benutzerName", headerName: "Benutzer", width: 120 },
];

const fahrzeugCols: ColDef[] = [
  { field: "kennzeichen", headerName: "Kennzeichen", width: 130 },
  { field: "fabrikat", headerName: "Fabrikat", width: 140 },
  { field: "lkwTyp", headerName: "Typ", width: 110 },
  { field: "tu", headerName: "TU", width: 90 },
  { field: "anzahlTouren", headerName: "Touren", width: 80, type: "numericColumn" },
  { field: "summeKosten", headerName: "Kosten", width: 120, valueFormatter: (p: any) => EUR(p.value) },
  { field: "durchschnittKosten", headerName: "Ø Kosten", width: 120, valueFormatter: (p: any) => EUR(p.value) },
];

const oemMengenCols: ColDef[] = [
  { field: "oemName", headerName: "OEM", width: 180 },
  { field: "oemKurz", headerName: "Kürzel", width: 90 },
  { field: "anzahlAvise", headerName: "Avise", width: 90, type: "numericColumn" },
  { field: "anzahlZeilen", headerName: "Zeilen", width: 90, type: "numericColumn" },
  { field: "summeMenge", headerName: "Menge (ges.)", width: 120, type: "numericColumn" },
  { field: "summeGewicht", headerName: "Gewicht (kg)", width: 120, type: "numericColumn" },
];

const oemKostenCols: ColDef[] = [
  { field: "oemName", headerName: "OEM", width: 180 },
  { field: "oemKurz", headerName: "Kürzel", width: 90 },
  { field: "anzahlTouren", headerName: "Touren", width: 90, type: "numericColumn" },
  { field: "summeKosten", headerName: "Summe Kosten", width: 140, valueFormatter: (p: any) => EUR(p.value), cellStyle: { fontWeight: "bold" } },
  { field: "durchschnittKosten", headerName: "Ø Kosten", width: 140, valueFormatter: (p: any) => EUR(p.value) },
];

const oemTourenCols: ColDef[] = [
  { field: "oemName", headerName: "OEM", width: 180 },
  { field: "oemKurz", headerName: "Kürzel", width: 90 },
  { field: "gesamt", headerName: "Gesamt", width: 90, type: "numericColumn", cellStyle: { fontWeight: "bold" } },
  { field: "offen", headerName: "Offen", width: 90, type: "numericColumn" },
  { field: "disponiert", headerName: "Disponiert", width: 100, type: "numericColumn" },
  { field: "abgefahren", headerName: "Abgefahren", width: 110, type: "numericColumn" },
  { field: "abgeschlossen", headerName: "Abgeschlossen", width: 120, type: "numericColumn" },
];

const konditionCols: ColDef[] = [
  { field: "transportUnternehmer.name", headerName: "TU", width: 180 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "name", headerName: "Name", width: 180 },
  { field: "tourFaktor", headerName: "Tour-F.", width: 90, type: "numericColumn" },
  { field: "stoppFaktor", headerName: "Stopp-F.", width: 90, type: "numericColumn" },
  { field: "lastKmFaktor", headerName: "Last-km", width: 90, type: "numericColumn" },
  { field: "leerKmFaktor", headerName: "Leer-km", width: 90, type: "numericColumn" },
  { field: "mautKmFaktor", headerName: "Maut-km", width: 90, type: "numericColumn" },
  { field: "gueltigVon", headerName: "Gültig von", width: 110, valueFormatter: datumFmt },
  { field: "gueltigBis", headerName: "Gültig bis", width: 110, valueFormatter: datumFmt },
];

// ============================================================
// Hauptseite
// ============================================================
export function BerichtePage() {
  const [activeTab, setActiveTab] = useState<string | null>("touren");

  return (
    <Stack>
      <Title order={2}>Berichte</Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="touren">Touren</Tabs.Tab>
          <Tabs.Tab value="avise">Avise</Tabs.Tab>
          <Tabs.Tab value="tu-kosten">TU-Kosten</Tabs.Tab>
          <Tabs.Tab value="abfahrten">Abfahrten</Tabs.Tab>
          <Tabs.Tab value="sendungen">Sendungen</Tabs.Tab>
          <Tabs.Tab value="abrechnungen">Abrechnungen</Tabs.Tab>
          <Tabs.Tab value="ausfallfrachten">Ausfallfrachten</Tabs.Tab>
          <Tabs.Tab value="dfue">DFUE</Tabs.Tab>
          <Tabs.Tab value="fahrzeugliste">Fahrzeugliste</Tabs.Tab>
          <Tabs.Tab value="konditionen">Konditionen</Tabs.Tab>
          <Tabs.Tab value="oem-mengen">OEM Mengen</Tabs.Tab>
          <Tabs.Tab value="oem-kosten">OEM Kosten</Tabs.Tab>
          <Tabs.Tab value="oem-touren">OEM Touren</Tabs.Tab>
        </Tabs.List>

        <div style={{ paddingTop: "var(--mantine-spacing-md)" }}>
          {activeTab === "touren" && <BerichtTab endpoint="touren" columns={tourenCols} />}
          {activeTab === "avise" && <BerichtTab endpoint="avise" columns={aviseCols} />}
          {activeTab === "tu-kosten" && <BerichtTab endpoint="tu-kosten" columns={tuKostenCols} />}
          {activeTab === "abfahrten" && <BerichtTab endpoint="abfahrten" columns={abfahrtenCols} />}
          {activeTab === "sendungen" && <BerichtTab endpoint="sendungen" columns={sendungenCols} />}
          {activeTab === "abrechnungen" && <BerichtTab endpoint="abrechnungen" columns={abrechnungenCols} datumFeld="buchungsjahr" />}
          {activeTab === "ausfallfrachten" && <BerichtTab endpoint="ausfallfrachten" columns={ausfallfrachtCols} />}
          {activeTab === "dfue" && <BerichtTab endpoint="dfue" columns={dfueCols} />}
          {activeTab === "fahrzeugliste" && <BerichtTab endpoint="fahrzeugliste" columns={fahrzeugCols} />}
          {activeTab === "konditionen" && <BerichtTab endpoint="konditionsuebersicht" columns={konditionCols} datumFeld="none" />}
          {activeTab === "oem-mengen" && <BerichtTab endpoint="oem-mengen" columns={oemMengenCols} />}
          {activeTab === "oem-kosten" && <BerichtTab endpoint="oem-kosten" columns={oemKostenCols} />}
          {activeTab === "oem-touren" && <BerichtTab endpoint="oem-touren" columns={oemTourenCols} />}
        </div>
      </Tabs>
    </Stack>
  );
}
