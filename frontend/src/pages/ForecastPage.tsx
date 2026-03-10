import { useState, useEffect, useCallback } from "react";
import {
  Title, Button, Group, Select, Stack, Alert, Text, Paper, Tabs, Modal,
  TextInput, NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";

ModuleRegistry.registerModules([AllCommunityModule]);

const datumFmt = (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "";

// ── Forecasts Tab ────────────────────────────────────────────────
const forecastCols: ColDef[] = [
  { field: "bezeichnung", headerName: "Bezeichnung", width: 220 },
  { field: "oem.name", headerName: "OEM", width: 130 },
  { field: "werk.name", headerName: "Werk", width: 180 },
  { field: "gueltigVon", headerName: "Gültig von", width: 110, valueFormatter: datumFmt },
  { field: "gueltigBis", headerName: "Gültig bis", width: 110, valueFormatter: datumFmt },
  { field: "status", headerName: "Status", width: 100 },
  { field: "_count.details", headerName: "KW", width: 70, type: "numericColumn" },
];

interface DetailRow {
  kalenderwoche: number;
  jahr: number;
  menge: number;
  gewicht: number;
}

function ForecastsTab() {
  const [daten, setDaten] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure();
  const [editId, setEditId] = useState<string | null>(null);

  // Stammdaten für Select
  const [oems, setOems] = useState<any[]>([]);
  const [werke, setWerke] = useState<any[]>([]);

  // Form
  const [form, setForm] = useState({
    bezeichnung: "", oemId: "", werkId: "", gueltigVon: "", gueltigBis: "", status: "entwurf",
  });
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [saving, setSaving] = useState(false);

  const laden = useCallback(async () => {
    try {
      const res = await api("/forecast");
      setDaten(res.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  const ladeStammdaten = useCallback(async () => {
    try {
      const [o, w] = await Promise.all([api("/oems?limit=500"), api("/werke?limit=500")]);
      setOems(o.data.map((x: any) => ({ value: x.id, label: x.name })));
      setWerke(w.data.map((x: any) => ({ value: x.id, label: x.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { laden(); ladeStammdaten(); }, [laden, ladeStammdaten]);

  const neuAnlegen = () => {
    setEditId(null);
    setForm({ bezeichnung: "", oemId: "", werkId: "", gueltigVon: "", gueltigBis: "", status: "entwurf" });
    setDetails([{ kalenderwoche: 1, jahr: 2026, menge: 0, gewicht: 0 }]);
    openModal();
  };

  const bearbeiten = async (id: string) => {
    try {
      const res = await api(`/forecast/${id}`);
      const f = res.data;
      setEditId(id);
      setForm({
        bezeichnung: f.bezeichnung,
        oemId: f.oemId,
        werkId: f.werkId,
        gueltigVon: f.gueltigVon?.split("T")[0] || "",
        gueltigBis: f.gueltigBis?.split("T")[0] || "",
        status: f.status,
      });
      setDetails(f.details.map((d: any) => ({
        kalenderwoche: d.kalenderwoche, jahr: d.jahr, menge: d.menge, gewicht: d.gewicht,
      })));
      openModal();
    } catch (err: any) { setError(err.message); }
  };

  const speichern = async () => {
    setSaving(true); setError("");
    try {
      const body = { ...form, details };
      if (editId) {
        await api(`/forecast/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/forecast", { method: "POST", body: JSON.stringify(body) });
      }
      closeModal();
      await laden();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const loeschen = async (id: string) => {
    try {
      await api(`/forecast/${id}`, { method: "DELETE" });
      await laden();
    } catch (err: any) { setError(err.message); }
  };

  const detailAendern = (idx: number, field: keyof DetailRow, value: number) => {
    setDetails((prev) => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const detailHinzufuegen = () => {
    const lastKw = details.length > 0 ? details[details.length - 1].kalenderwoche : 0;
    const lastJahr = details.length > 0 ? details[details.length - 1].jahr : 2026;
    setDetails([...details, { kalenderwoche: lastKw + 1, jahr: lastJahr, menge: 0, gewicht: 0 }]);
  };

  const detailEntfernen = (idx: number) => {
    setDetails((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      <Group>
        <Button onClick={neuAnlegen}>Neuer Forecast</Button>
      </Group>

      <div style={{ height: "55vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={daten}
          columnDefs={forecastCols}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          onRowClicked={(e) => e.data?.id && bearbeiten(e.data.id)}
        />
      </div>

      <Modal opened={modalOpen} onClose={closeModal} title={editId ? "Forecast bearbeiten" : "Neuer Forecast"} size="lg">
        <Stack>
          <TextInput label="Bezeichnung" required value={form.bezeichnung}
            onChange={(e) => setForm({ ...form, bezeichnung: e.target.value })} />
          <Group grow>
            <Select label="OEM" data={oems} value={form.oemId || null}
              onChange={(v) => setForm({ ...form, oemId: v || "" })} />
            <Select label="Werk" data={werke} value={form.werkId || null}
              onChange={(v) => setForm({ ...form, werkId: v || "" })} />
          </Group>
          <Group grow>
            <TextInput label="Gültig von" type="date" value={form.gueltigVon}
              onChange={(e) => setForm({ ...form, gueltigVon: e.target.value })} />
            <TextInput label="Gültig bis" type="date" value={form.gueltigBis}
              onChange={(e) => setForm({ ...form, gueltigBis: e.target.value })} />
          </Group>
          <Select label="Status" data={["entwurf", "aktiv", "abgeschlossen"]} value={form.status}
            onChange={(v) => setForm({ ...form, status: v || "entwurf" })} />

          <Text fw={600} mt="md">KW-Details</Text>
          {details.map((d, i) => (
            <Group key={i} align="flex-end">
              <NumberInput label="KW" value={d.kalenderwoche} min={1} max={53} style={{ width: 80 }}
                onChange={(v) => detailAendern(i, "kalenderwoche", Number(v) || 0)} />
              <NumberInput label="Jahr" value={d.jahr} min={2020} max={2030} style={{ width: 90 }}
                onChange={(v) => detailAendern(i, "jahr", Number(v) || 2026)} />
              <NumberInput label="Menge" value={d.menge} min={0} style={{ width: 100 }}
                onChange={(v) => detailAendern(i, "menge", Number(v) || 0)} />
              <NumberInput label="Gewicht" value={d.gewicht} min={0} style={{ width: 100 }}
                onChange={(v) => detailAendern(i, "gewicht", Number(v) || 0)} />
              <Button variant="subtle" color="red" size="xs" onClick={() => detailEntfernen(i)}>X</Button>
            </Group>
          ))}
          <Button variant="light" size="xs" onClick={detailHinzufuegen}>KW hinzufügen</Button>

          <Group justify="space-between" mt="md">
            <Group>
              {editId && (
                <Button color="red" variant="outline" onClick={() => { loeschen(editId); closeModal(); }}>
                  Löschen
                </Button>
              )}
            </Group>
            <Group>
              <Button variant="default" onClick={closeModal}>Abbrechen</Button>
              <Button onClick={speichern} loading={saving}>Speichern</Button>
            </Group>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ── Ist vs Soll Tab ──────────────────────────────────────────────
const vergleichCols: ColDef[] = [
  { field: "kalenderwoche", headerName: "KW", width: 70, type: "numericColumn" },
  { field: "jahr", headerName: "Jahr", width: 70, type: "numericColumn" },
  { field: "sollMenge", headerName: "Soll-Menge", width: 110, type: "numericColumn" },
  { field: "istMenge", headerName: "Ist-Menge", width: 110, type: "numericColumn" },
  { field: "differenz", headerName: "Differenz", width: 100, type: "numericColumn",
    cellStyle: (p: any) => ({ color: p.value >= 0 ? "green" : "red", fontWeight: "bold" }) },
  { field: "prozent", headerName: "% Abweichung", width: 120,
    valueFormatter: (p: any) => p.value != null ? `${p.value} %` : "",
    cellStyle: (p: any) => ({ color: p.value >= 100 ? "green" : p.value >= 80 ? "orange" : "red", fontWeight: "bold" }) },
];

function IstVsSollTab() {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [daten, setDaten] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api("/forecast").then((res) => {
      setForecasts(res.data.map((f: any) => ({ value: f.id, label: f.bezeichnung })));
    }).catch(() => {});
  }, []);

  const laden = async () => {
    if (!selectedId) return;
    setLoading(true); setError("");
    try {
      const res = await api(`/forecast/${selectedId}/vergleich`);
      setDaten(res.data);
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      <Paper p="sm" withBorder>
        <Group>
          <Select label="Forecast" placeholder="Forecast auswählen..." data={forecasts}
            value={selectedId} onChange={setSelectedId} style={{ width: 350 }} />
          <Button mt="xl" onClick={laden} loading={loading} disabled={!selectedId}>Laden</Button>
        </Group>
      </Paper>

      <div style={{ height: "55vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={daten}
          columnDefs={vergleichCols}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>
    </Stack>
  );
}

// ── Hauptseite ───────────────────────────────────────────────────
export function ForecastPage() {
  const [activeTab, setActiveTab] = useState<string | null>("forecasts");

  return (
    <Stack>
      <Title order={2}>Forecast</Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="forecasts">Forecasts</Tabs.Tab>
          <Tabs.Tab value="ist-vs-soll">Ist vs Soll</Tabs.Tab>
        </Tabs.List>

        <div style={{ paddingTop: "var(--mantine-spacing-md)" }}>
          {activeTab === "forecasts" && <ForecastsTab />}
          {activeTab === "ist-vs-soll" && <IstVsSollTab />}
        </div>
      </Tabs>
    </Stack>
  );
}
