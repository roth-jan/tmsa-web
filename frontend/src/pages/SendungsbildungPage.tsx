import { useState, useCallback } from "react";
import {
  Title, Button, Group, Select, Stack,
  Alert, Text, Badge, Paper, Grid,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

const statusLabels: Record<number, string> = { 0: "offen", 1: "borderiert", 2: "storniert" };

const zeilenColumns: ColDef[] = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 50 },
  { field: "artikelBeschreibung", headerName: "Beschreibung", flex: 1 },
  { field: "avis.avisNummer", headerName: "Avis", width: 130 },
  { field: "avis.lieferant.name", headerName: "Lieferant", width: 150 },
  { field: "avis.werk.name", headerName: "Werk", width: 140 },
  {
    field: "menge", headerName: "Menge", width: 90, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "masseinheit", headerName: "ME", width: 60 },
  {
    field: "gewicht", headerName: "Gew.", width: 90, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "gutArt", headerName: "Gutart", width: 90 },
];

const sendungColumns: ColDef[] = [
  { field: "sendungNummer", headerName: "Sendung-Nr.", width: 140 },
  { field: "lieferant.name", headerName: "Lieferant", flex: 1 },
  { field: "werk.name", headerName: "Werk", width: 140 },
  {
    field: "gewicht", headerName: "Gewicht", width: 100, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "richtungsArt", headerName: "Richtung", width: 90 },
  {
    field: "status", headerName: "Status", width: 100,
    valueFormatter: (p: any) => statusLabels[p.value] || String(p.value),
  },
  { field: "bordero.borderoNummer", headerName: "Bordero", width: 130 },
];

export function SendungsbildungPage() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("sendung", "erstellen");

  // Filter
  const [selectedBorderoId, setSelectedBorderoId] = useState<string | null>(null);
  const [richtungsArt, setRichtungsArt] = useState<string>("WE");

  // Data
  const [offeneZeilen, setOffeneZeilen] = useState<any[]>([]);
  const [sendungen, setSendungen] = useState<any[]>([]);
  const [selectedZeilen, setSelectedZeilen] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Dropdown-Daten
  const [borderoOpts, setBorderoOpts] = useState<any[]>([]);

  const aktualisieren = useCallback(async () => {
    setError("");
    try {
      // Borderos laden (aus allen Abfahrten)
      const abfahrtRes = await api("/abfahrten?limit=200");
      const alleBorderos: any[] = [];
      for (const af of abfahrtRes.data) {
        const detail = await api(`/abfahrten/${af.id}`);
        for (const b of detail.data.borderos || []) {
          alleBorderos.push({
            value: b.id,
            label: `${b.borderoNummer} (${af.abfahrtNummer})`,
            data: b,
          });
        }
      }
      setBorderoOpts(alleBorderos);

      // Offene Artikelzeilen laden (status=1 = disponiert, haben Tour)
      const zeilenRes = await api("/mengenplan/offene-zeilen?datumVon=2020-01-01&datumBis=2030-12-31");
      setOffeneZeilen(zeilenRes.data);

      // Sendungen laden
      const params = new URLSearchParams({ limit: "200" });
      if (selectedBorderoId) params.set("borderoId", selectedBorderoId);
      const sendRes = await api(`/sendungen?${params}`);
      setSendungen(sendRes.data);

      setSelectedZeilen([]);
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedBorderoId]);

  const sendungBilden = async () => {
    if (!selectedZeilen.length) return;
    try {
      const body: any = {
        artikelzeilenIds: selectedZeilen.map((z: any) => z.id),
        richtungsArt,
      };
      if (selectedBorderoId) body.borderoId = selectedBorderoId;

      await api("/sendungen/aus-artikelzeilen", {
        method: "POST",
        body: JSON.stringify(body),
      });

      setError("");
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Stack>
      <Title order={2}>Sendungsbildung</Title>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      {/* Filter */}
      <Paper p="sm" withBorder>
        <Group>
          <Select label="Bordero" searchable clearable placeholder="Optional: Bordero wählen"
            data={borderoOpts} value={selectedBorderoId}
            onChange={setSelectedBorderoId} style={{ width: 300 }} />
          <Select label="Richtung" data={["WE", "WA", "3G"]}
            value={richtungsArt}
            onChange={(val) => setRichtungsArt(val || "WE")} style={{ width: 120 }} />
          <Button mt="xl" onClick={aktualisieren}>Aktualisieren</Button>
        </Group>
      </Paper>

      <Grid>
        {/* Linke Seite: Verfügbare Artikelzeilen */}
        <Grid.Col span={7}>
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Verfügbare Artikelzeilen ({offeneZeilen.length})</Text>
            {darfErstellen && selectedZeilen.length > 0 && (
              <Button size="sm" onClick={sendungBilden}>
                {selectedZeilen.length} Zeile(n) → Sendung bilden &raquo;
              </Button>
            )}
          </Group>
          <div style={{ height: "55vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={offeneZeilen}
              columnDefs={zeilenColumns}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="multiple"
              onSelectionChanged={(e) => {
                setSelectedZeilen(e.api.getSelectedRows());
              }}
            />
          </div>
        </Grid.Col>

        {/* Rechte Seite: Sendungen */}
        <Grid.Col span={5}>
          <Group justify="space-between" mb="xs">
            <Text fw={600}>
              Sendungen ({sendungen.length})
              {selectedBorderoId && <Badge ml="sm" size="sm">gefiltert</Badge>}
            </Text>
          </Group>
          <div style={{ height: "55vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={sendungen}
              columnDefs={sendungColumns}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="single"
            />
          </div>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
