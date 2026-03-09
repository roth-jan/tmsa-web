import { useState, useCallback } from "react";
import {
  Title, Button, Group, TextInput, Select, Stack,
  Alert, Text, Badge, Paper, Checkbox, Grid,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

const statusFarben: Record<string, string> = {
  offen: "blue",
  disponiert: "orange",
  abgefahren: "teal",
  abgeschlossen: "green",
};

const abrStatusLabels: Record<number, string> = {
  0: "offen",
  1: "bewertet",
  2: "freigegeben",
  3: "erzeugt",
};

const tourColumns: ColDef[] = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 50 },
  { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
  {
    field: "tourDatum", headerName: "Datum", width: 110,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "kondition.name", headerName: "Kondition", width: 130 },
  { field: "_count.artikelzeilen", headerName: "#", width: 50 },
  {
    field: "quittung", headerName: "Q", width: 50,
    cellRenderer: (p: any) => p.value ? "✓" : "",
    cellStyle: (p: any) => p.value ? { color: "green", fontWeight: "bold" } : {},
  },
  {
    field: "istLeerfahrt", headerName: "LF", width: 50,
    cellRenderer: (p: any) => p.value ? "✓" : "",
    cellStyle: (p: any) => p.value ? { color: "gray" } : {},
  },
  {
    field: "abrechnungsStopp", headerName: "AS", width: 50,
    cellRenderer: (p: any) => p.value ? "✗" : "",
    cellStyle: (p: any) => p.value ? { color: "red", fontWeight: "bold" } : {},
  },
  { field: "status", headerName: "Status", width: 100 },
];

export function NacharbeitPage() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("nacharbeit", "bearbeiten");

  // Filter
  const [datumVon, setDatumVon] = useState(
    new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]
  );
  const [datumBis, setDatumBis] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // Data
  const [touren, setTouren] = useState<any[]>([]);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [selectedTourIds, setSelectedTourIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  // Detail-Form
  const [detailForm, setDetailForm] = useState<Record<string, any>>({});

  // Dropdown-Daten
  const [kfzListe, setKfzListe] = useState<any[]>([]);
  const [tuListe, setTuListe] = useState<any[]>([]);
  const [konditionenListe, setKonditionenListe] = useState<any[]>([]);

  const ladeOptionen = useCallback(async () => {
    const [kfz, tu, kond] = await Promise.all([
      api("/kfz?limit=500"),
      api("/transport-unternehmer?limit=500"),
      api("/konditionen?limit=500"),
    ]);
    setKfzListe(kfz.data.map((k: any) => ({ value: k.id, label: `${k.kennzeichen} (${k.transportUnternehmer?.kurzbezeichnung || ""})` })));
    setTuListe(tu.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.kurzbezeichnung})` })));
    setKonditionenListe(kond.data.map((k: any) => ({ value: k.id, label: k.name })));
  }, []);

  const aktualisieren = useCallback(async () => {
    setError("");
    try {
      await ladeOptionen();
      const params = new URLSearchParams();
      if (datumVon) params.set("datumVon", datumVon);
      if (datumBis) params.set("datumBis", datumBis);
      if (statusFilter) params.set("status", statusFilter);

      const res = await api(`/nacharbeit/touren?${params}`);
      setTouren(res.data);
      setSelectedTour(null);
      setSelectedTourIds([]);
      setDetailForm({});
    } catch (err: any) {
      setError(err.message);
    }
  }, [datumVon, datumBis, statusFilter, ladeOptionen]);

  const tourAuswaehlen = (tour: any) => {
    setSelectedTour(tour);
    setDetailForm({
      quittung: tour.quittung || false,
      quittungDatum: tour.quittungDatum ? new Date(tour.quittungDatum).toISOString().split("T")[0] : "",
      istLeerfahrt: tour.istLeerfahrt || false,
      abrechnungsStopp: tour.abrechnungsStopp || false,
      leerKilometer: tour.leerKilometer || "",
      lastKilometer: tour.lastKilometer || "",
      mautKilometer: tour.mautKilometer || "",
      kfzId: tour.kfzId || null,
      transportUnternehmerId: tour.transportUnternehmerId || null,
      konditionId: tour.konditionId || null,
      bemerkungAbrechnung: tour.bemerkungAbrechnung || "",
    });
  };

  const detailSpeichern = async () => {
    if (!selectedTour) return;
    try {
      const body: any = { ...detailForm };
      if (body.leerKilometer === "") delete body.leerKilometer;
      if (body.lastKilometer === "") delete body.lastKilometer;
      if (body.mautKilometer === "") delete body.mautKilometer;
      if (body.quittungDatum === "") body.quittungDatum = null;

      await api(`/nacharbeit/tour/${selectedTour.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const bulkQuittung = async () => {
    if (!selectedTourIds.length) return;
    try {
      await api("/nacharbeit/quittung-setzen", {
        method: "POST",
        body: JSON.stringify({
          tourIds: selectedTourIds,
          quittungDatum: new Date().toISOString().split("T")[0],
        }),
      });
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Stack>
      <Title order={2}>Nacharbeit</Title>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      {/* Filter */}
      <Paper p="sm" withBorder>
        <Group>
          <TextInput label="Datum von" type="date" value={datumVon}
            onChange={(e) => setDatumVon(e.target.value)} style={{ width: 160 }} />
          <TextInput label="Datum bis" type="date" value={datumBis}
            onChange={(e) => setDatumBis(e.target.value)} style={{ width: 160 }} />
          <Select label="Status" clearable placeholder="Alle"
            data={["offen", "disponiert", "abgefahren", "abgeschlossen"]}
            value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }} />
          <Button mt="xl" onClick={aktualisieren}>Aktualisieren</Button>
          {darfBearbeiten && selectedTourIds.length > 0 && (
            <Button mt="xl" variant="light" color="green" onClick={bulkQuittung}>
              Quittung für {selectedTourIds.length} Tour(en)
            </Button>
          )}
        </Group>
      </Paper>

      {/* Touren-Grid */}
      <div style={{ height: "40vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={touren}
          columnDefs={tourColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="multiple"
          onSelectionChanged={(e) => {
            const rows = e.api.getSelectedRows();
            setSelectedTourIds(rows.map((r: any) => r.id));
          }}
          onRowClicked={(e) => {
            if (e.data) tourAuswaehlen(e.data);
          }}
        />
      </div>

      {/* Detail-Panel */}
      {selectedTour && (
        <Paper p="md" withBorder>
          <Group justify="space-between" mb="sm">
            <Text fw={600} size="lg">
              Detail: {selectedTour.tourNummer}
              <Badge ml="sm" color={statusFarben[selectedTour.status] || "gray"}>
                {selectedTour.status}
              </Badge>
              <Badge ml="xs" variant="outline">
                Abr: {abrStatusLabels[selectedTour.abrechnungsStatus] || "?"}
              </Badge>
            </Text>
          </Group>

          <Grid>
            <Grid.Col span={3}>
              <Checkbox label="Quittung" checked={detailForm.quittung || false}
                onChange={(e) => setDetailForm({ ...detailForm, quittung: e.target.checked })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={3}>
              <TextInput label="Quittungsdatum" type="date"
                value={detailForm.quittungDatum || ""}
                onChange={(e) => setDetailForm({ ...detailForm, quittungDatum: e.target.value })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={3}>
              <Checkbox label="Leerfahrt" checked={detailForm.istLeerfahrt || false}
                onChange={(e) => setDetailForm({ ...detailForm, istLeerfahrt: e.target.checked })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={3}>
              <Checkbox label="Abrechnungsstopp" checked={detailForm.abrechnungsStopp || false}
                onChange={(e) => setDetailForm({ ...detailForm, abrechnungsStopp: e.target.checked })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
          </Grid>

          <Grid mt="sm">
            <Grid.Col span={4}>
              <TextInput label="Leer-km" type="number"
                value={detailForm.leerKilometer || ""}
                onChange={(e) => setDetailForm({ ...detailForm, leerKilometer: e.target.value })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Last-km" type="number"
                value={detailForm.lastKilometer || ""}
                onChange={(e) => setDetailForm({ ...detailForm, lastKilometer: e.target.value })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={4}>
              <TextInput label="Maut-km" type="number"
                value={detailForm.mautKilometer || ""}
                onChange={(e) => setDetailForm({ ...detailForm, mautKilometer: e.target.value })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
          </Grid>

          <Grid mt="sm">
            <Grid.Col span={4}>
              <Select label="KFZ" searchable clearable data={kfzListe}
                value={detailForm.kfzId || null}
                onChange={(val) => setDetailForm({ ...detailForm, kfzId: val })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="TU" searchable clearable data={tuListe}
                value={detailForm.transportUnternehmerId || null}
                onChange={(val) => setDetailForm({ ...detailForm, transportUnternehmerId: val })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={4}>
              <Select label="Kondition" searchable clearable data={konditionenListe}
                value={detailForm.konditionId || null}
                onChange={(val) => setDetailForm({ ...detailForm, konditionId: val })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
          </Grid>

          <Grid mt="sm">
            <Grid.Col span={9}>
              <TextInput label="Bemerkung (Abrechnung)"
                value={detailForm.bemerkungAbrechnung || ""}
                onChange={(e) => setDetailForm({ ...detailForm, bemerkungAbrechnung: e.target.value })}
                disabled={!darfBearbeiten} />
            </Grid.Col>
            <Grid.Col span={3}>
              {darfBearbeiten && (
                <Button mt="xl" fullWidth onClick={detailSpeichern}>Speichern</Button>
              )}
            </Grid.Col>
          </Grid>
        </Paper>
      )}
    </Stack>
  );
}
