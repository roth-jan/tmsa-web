import { useState, useCallback } from "react";
import {
  Title, Button, Group, Select, Modal, Stack,
  Alert, Text, Badge, TextInput, Grid, Paper,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, RowSelectedEvent } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

const offeneZeilenCols: ColDef[] = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 50 },
  { field: "artikelBeschreibung", headerName: "Beschreibung", flex: 1 },
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
  { field: "avis.avisNummer", headerName: "Avis", width: 130 },
  { field: "avis.lieferant.name", headerName: "Lieferant", width: 140 },
  { field: "avis.werk.name", headerName: "Werk", width: 140 },
  { field: "avis.werk.oem.kurzbezeichnung", headerName: "OEM", width: 70 },
];

const tourenCols: ColDef[] = [
  { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
  {
    field: "tourDatum", headerName: "Datum", width: 100,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 80 },
  { field: "_count.artikelzeilen", headerName: "#", width: 60 },
  { field: "status", headerName: "Status", width: 90 },
];

const tourZeilenCols: ColDef[] = [
  { headerCheckboxSelection: true, checkboxSelection: true, width: 50 },
  { field: "artikelBeschreibung", headerName: "Beschreibung", flex: 1 },
  {
    field: "menge", headerName: "Menge", width: 90, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "masseinheit", headerName: "ME", width: 60 },
  { field: "avis.avisNummer", headerName: "Avis", width: 120 },
  { field: "avis.lieferant.name", headerName: "Lieferant", width: 140 },
];

export function MengenplanPage() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("mengenplan", "bearbeiten");
  const darfErstellen = hatRecht("mengenplan", "erstellen");

  // Filter
  const [datumVon, setDatumVon] = useState(new Date().toISOString().split("T")[0]);
  const [datumBis, setDatumBis] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [filterLieferantId, setFilterLieferantId] = useState<string | null>(null);
  const [filterWerkId, setFilterWerkId] = useState<string | null>(null);

  // Data
  const [offeneZeilen, setOffeneZeilen] = useState<any[]>([]);
  const [touren, setTouren] = useState<any[]>([]);
  const [tourZeilen, setTourZeilen] = useState<any[]>([]);
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [selectedOffene, setSelectedOffene] = useState<any[]>([]);
  const [selectedTourZeilen, setSelectedTourZeilen] = useState<any[]>([]);
  const [error, setError] = useState("");

  // Dropdown data
  const [lieferantenOpts, setLieferantenOpts] = useState<any[]>([]);
  const [werkeOpts, setWerkeOpts] = useState<any[]>([]);
  const [nlOpts, setNlOpts] = useState<any[]>([]);
  const [routenOpts, setRoutenOpts] = useState<any[]>([]);

  // Neue Tour Modal
  const [tourModalOpen, { open: openTourModal, close: closeTourModal }] = useDisclosure(false);
  const [neueTourForm, setNeueTourForm] = useState<Record<string, any>>({});

  const ladeFilterOptionen = useCallback(async () => {
    const [lief, werk] = await Promise.all([
      api("/lieferanten?limit=500"),
      api("/werke?limit=500"),
    ]);
    setLieferantenOpts(lief.data.map((l: any) => ({ value: l.id, label: l.name })));
    setWerkeOpts(werk.data.map((w: any) => ({ value: w.id, label: w.name })));
  }, []);

  const aktualisieren = useCallback(async () => {
    setError("");
    try {
      await ladeFilterOptionen();
      const params = new URLSearchParams();
      if (datumVon) params.set("datumVon", datumVon);
      if (datumBis) params.set("datumBis", datumBis);
      if (filterLieferantId) params.set("lieferantId", filterLieferantId);
      if (filterWerkId) params.set("werkId", filterWerkId);

      const [offene, tour] = await Promise.all([
        api(`/mengenplan/offene-zeilen?${params}`),
        api(`/mengenplan/touren?datumVon=${datumVon}&datumBis=${datumBis}`),
      ]);
      setOffeneZeilen(offene.data);
      setTouren(tour.data);
      setSelectedTour(null);
      setTourZeilen([]);
      setSelectedOffene([]);
      setSelectedTourZeilen([]);
    } catch (err: any) {
      setError(err.message);
    }
  }, [datumVon, datumBis, filterLieferantId, filterWerkId, ladeFilterOptionen]);

  const zuweisen = async () => {
    if (!selectedTour || !selectedOffene.length) return;
    try {
      await api("/mengenplan/zuweisen", {
        method: "POST",
        body: JSON.stringify({
          zeilenIds: selectedOffene.map((z: any) => z.id),
          tourId: selectedTour.id,
        }),
      });
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const zuruecknehmen = async () => {
    if (!selectedTourZeilen.length) return;
    try {
      await api("/mengenplan/zuruecknehmen", {
        method: "POST",
        body: JSON.stringify({
          zeilenIds: selectedTourZeilen.map((z: any) => z.id),
        }),
      });
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const neueTourErstellen = async () => {
    setNeueTourForm({ tourDatum: datumVon });
    setError("");
    const [nl, rout] = await Promise.all([
      api("/niederlassungen?limit=500"),
      api("/routen?limit=500"),
    ]);
    setNlOpts(nl.data.map((n: any) => ({ value: n.id, label: `${n.name} (${n.kurzbezeichnung})` })));
    setRoutenOpts(rout.data.map((r: any) => ({ value: r.id, label: `${r.routennummer} — ${r.beschreibung || ""}` })));
    openTourModal();
  };

  const neueTourSpeichern = async () => {
    try {
      await api("/mengenplan/neue-tour", {
        method: "POST",
        body: JSON.stringify(neueTourForm),
      });
      closeTourModal();
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Stack>
      <Title order={2}>Mengenplan / Disposition</Title>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      {/* Filter */}
      <Paper p="sm" withBorder>
        <Group>
          <TextInput label="Datum von" type="date" value={datumVon}
            onChange={(e) => setDatumVon(e.target.value)} style={{ width: 160 }} />
          <TextInput label="Datum bis" type="date" value={datumBis}
            onChange={(e) => setDatumBis(e.target.value)} style={{ width: 160 }} />
          <Select label="Lieferant" searchable clearable placeholder="Alle"
            data={lieferantenOpts} value={filterLieferantId}
            onChange={setFilterLieferantId} style={{ width: 200 }} />
          <Select label="Werk" searchable clearable placeholder="Alle"
            data={werkeOpts} value={filterWerkId}
            onChange={setFilterWerkId} style={{ width: 200 }} />
          <Button mt="xl" onClick={aktualisieren}>Aktualisieren</Button>
        </Group>
      </Paper>

      <Grid>
        {/* Linke Seite: Offene Artikelzeilen */}
        <Grid.Col span={7}>
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Offene Artikelzeilen ({offeneZeilen.length})</Text>
            {darfBearbeiten && selectedTour && selectedOffene.length > 0 && (
              <Button size="sm" onClick={zuweisen}>
                {selectedOffene.length} Zeile(n) zuweisen &raquo;
              </Button>
            )}
          </Group>
          <div style={{ height: "55vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={offeneZeilen}
              columnDefs={offeneZeilenCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="multiple"
              onSelectionChanged={(e) => {
                setSelectedOffene(e.api.getSelectedRows());
              }}
            />
          </div>
        </Grid.Col>

        {/* Rechte Seite: Touren + Tour-Zeilen */}
        <Grid.Col span={5}>
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Touren ({touren.length})</Text>
            {darfErstellen && (
              <Button size="sm" variant="light" onClick={neueTourErstellen}>+ Neue Tour</Button>
            )}
          </Group>
          <div style={{ height: "25vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={touren}
              columnDefs={tourenCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="single"
              onRowSelected={(e: RowSelectedEvent) => {
                if (e.node.isSelected()) {
                  setSelectedTour(e.data);
                  setTourZeilen(e.data.artikelzeilen || []);
                }
              }}
            />
          </div>

          <Group justify="space-between" mt="sm" mb="xs">
            <Text fw={600} size="sm">
              {selectedTour
                ? <>Zeilen von {selectedTour.tourNummer} <Badge size="sm">{tourZeilen.length}</Badge></>
                : "Tour-Zeilen"
              }
            </Text>
            {darfBearbeiten && selectedTourZeilen.length > 0 && (
              <Button size="xs" variant="light" color="orange" onClick={zuruecknehmen}>
                &laquo; {selectedTourZeilen.length} zurücknehmen
              </Button>
            )}
          </Group>
          <div style={{ height: "25vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={tourZeilen}
              columnDefs={tourZeilenCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="multiple"
              onSelectionChanged={(e) => {
                setSelectedTourZeilen(e.api.getSelectedRows());
              }}
            />
          </div>
        </Grid.Col>
      </Grid>

      {/* Neue Tour Modal */}
      <Modal opened={tourModalOpen} onClose={closeTourModal} title="Schnell-Tour erstellen" size="md">
        <Stack>
          <TextInput label="Tour-Nummer" required
            value={neueTourForm.tourNummer || ""}
            onChange={(e) => setNeueTourForm({ ...neueTourForm, tourNummer: e.target.value })} />
          <TextInput label="Tour-Datum" type="date" required
            value={neueTourForm.tourDatum || ""}
            onChange={(e) => setNeueTourForm({ ...neueTourForm, tourDatum: e.target.value })} />
          <Select label="Route" searchable clearable data={routenOpts}
            value={neueTourForm.routeId || null}
            onChange={(val) => setNeueTourForm({ ...neueTourForm, routeId: val })} />
          <Select label="Niederlassung" required searchable data={nlOpts}
            value={neueTourForm.niederlassungId || null}
            onChange={(val) => setNeueTourForm({ ...neueTourForm, niederlassungId: val })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeTourModal}>Abbrechen</Button>
            <Button onClick={neueTourSpeichern}>Erstellen</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
