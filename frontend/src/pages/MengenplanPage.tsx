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
  {
    field: "tourNummer", headerName: "Tour-Nr.", width: 130,
    cellRenderer: (p: any) => {
      if (!p.data) return p.value;
      const badge = p.data.istGebrochen
        ? ' <span style="background:#e64980;color:white;padding:1px 5px;border-radius:4px;font-size:10px;margin-left:4px">GV</span>'
        : "";
      return `${p.value}${badge}`;
    },
  },
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

const streckenabschnitteCols: ColDef[] = [
  {
    field: "typ", headerName: "Typ", width: 70,
    cellRenderer: (p: any) => {
      const colors: Record<string, string> = { VL: "#228be6", HL: "#fab005", NL: "#40c057" };
      const c = colors[p.value] || "#868e96";
      return `<span style="background:${c};color:white;padding:1px 6px;border-radius:4px;font-size:11px">${p.value}</span>`;
    },
  },
  { field: "vonBeschreibung", headerName: "Von", flex: 1 },
  { field: "nachBeschreibung", headerName: "Nach", flex: 1 },
  { field: "umschlagPunkt.name", headerName: "USP", width: 130 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 80 },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 110 },
  { field: "route.routennummer", headerName: "Route", width: 100 },
  { field: "status", headerName: "Status", width: 90 },
];

export function MengenplanPage() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("mengenplan", "bearbeiten");
  const darfErstellen = hatRecht("mengenplan", "erstellen");
  const darfGvBearbeiten = hatRecht("gebrocheneverkehre", "bearbeiten");

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

  // Streckenabschnitte (gebrochene Verkehre)
  const [abschnitte, setAbschnitte] = useState<any[]>([]);

  // Dropdown data
  const [lieferantenOpts, setLieferantenOpts] = useState<any[]>([]);
  const [werkeOpts, setWerkeOpts] = useState<any[]>([]);
  const [nlOpts, setNlOpts] = useState<any[]>([]);
  const [routenOpts, setRoutenOpts] = useState<any[]>([]);
  const [uspOpts, setUspOpts] = useState<any[]>([]);
  const [_tuOpts, setTuOpts] = useState<any[]>([]);
  const [_kfzOpts, setKfzOpts] = useState<any[]>([]);

  // Neue Tour Modal
  const [tourModalOpen, { open: openTourModal, close: closeTourModal }] = useDisclosure(false);
  const [neueTourForm, setNeueTourForm] = useState<Record<string, any>>({});

  // Tour Brechen Modal
  const [brechenModalOpen, { open: openBrechenModal, close: closeBrechenModal }] = useDisclosure(false);
  const [brechenUspId, setBrechenUspId] = useState<string | null>(null);
  const [brechenVon, setBrechenVon] = useState("");
  const [brechenNach, setBrechenNach] = useState("");

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
      setAbschnitte([]);
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

  // ---- Gebrochene Verkehre ----

  const tourBrechenOeffnen = async () => {
    if (!selectedTour) return;
    setError("");
    setBrechenUspId(null);
    setBrechenVon("");
    setBrechenNach("");
    try {
      const [usps, tus, kfzs, routs] = await Promise.all([
        api("/gebrochene-verkehre/umschlag-punkte"),
        api("/transport-unternehmer?limit=500"),
        api("/kfz?limit=500"),
        api("/routen?limit=500"),
      ]);
      setUspOpts(usps.data.map((u: any) => ({ value: u.id, label: `${u.name} (${u.kurzbezeichnung})` })));
      setTuOpts(tus.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.kurzbezeichnung})` })));
      setKfzOpts(kfzs.data.map((k: any) => ({ value: k.id, label: k.kennzeichen })));
      setRoutenOpts(routs.data.map((r: any) => ({ value: r.id, label: `${r.routennummer} — ${r.beschreibung || ""}` })));
      openBrechenModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tourBrechenAusfuehren = async () => {
    if (!selectedTour || !brechenUspId) return;
    const usp = uspOpts.find((u) => u.value === brechenUspId);
    const uspName = usp?.label || "USP";
    const von = brechenVon || "Lieferant";
    const nach = brechenNach || "Werk";

    try {
      await api(`/gebrochene-verkehre/touren/${selectedTour.id}/brechen`, {
        method: "POST",
        body: JSON.stringify({
          abschnitte: [
            { reihenfolge: 1, typ: "VL", vonBeschreibung: von, nachBeschreibung: uspName, umschlagPunktId: brechenUspId },
            { reihenfolge: 2, typ: "NL", vonBeschreibung: uspName, nachBeschreibung: nach, umschlagPunktId: brechenUspId },
          ],
        }),
      });
      closeBrechenModal();
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tourZusammenfuehren = async () => {
    if (!selectedTour) return;
    if (!confirm("Brechung wirklich aufheben? Alle Streckenabschnitte werden gelöscht.")) return;
    try {
      await api(`/gebrochene-verkehre/touren/${selectedTour.id}/zusammenfuehren`, {
        method: "DELETE",
      });
      aktualisieren();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ladeAbschnitte = async (tourId: string) => {
    try {
      const res = await api(`/gebrochene-verkehre/touren/${tourId}/abschnitte`);
      setAbschnitte(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const onTourSelected = (e: RowSelectedEvent) => {
    if (e.node.isSelected()) {
      const tour = e.data;
      setSelectedTour(tour);
      setTourZeilen(tour.artikelzeilen || []);
      if (tour.istGebrochen) {
        // Abschnitte direkt aus den mitgeladenen Daten oder via API
        if (tour.streckenabschnitte?.length) {
          setAbschnitte(tour.streckenabschnitte);
        } else {
          ladeAbschnitte(tour.id);
        }
      } else {
        setAbschnitte([]);
      }
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

        {/* Rechte Seite: Touren + Tour-Zeilen / Abschnitte */}
        <Grid.Col span={5}>
          <Group justify="space-between" mb="xs">
            <Text fw={600}>Touren ({touren.length})</Text>
            <Group gap="xs">
              {darfGvBearbeiten && selectedTour && !selectedTour.istGebrochen &&
                ["offen", "disponiert"].includes(selectedTour.status) && (
                <Button size="sm" variant="light" color="pink" onClick={tourBrechenOeffnen}>
                  Tour brechen
                </Button>
              )}
              {darfGvBearbeiten && selectedTour?.istGebrochen && (
                <Button size="sm" variant="light" color="orange" onClick={tourZusammenfuehren}>
                  Zusammenführen
                </Button>
              )}
              {darfErstellen && (
                <Button size="sm" variant="light" onClick={neueTourErstellen}>+ Neue Tour</Button>
              )}
            </Group>
          </Group>
          <div style={{ height: "25vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={touren}
              columnDefs={tourenCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              rowSelection="single"
              onRowSelected={onTourSelected}
            />
          </div>

          {/* Streckenabschnitte (nur bei gebrochener Tour) */}
          {selectedTour?.istGebrochen && abschnitte.length > 0 ? (
            <>
              <Group justify="space-between" mt="sm" mb="xs">
                <Text fw={600} size="sm">
                  Streckenabschnitte von {selectedTour.tourNummer}{" "}
                  <Badge size="sm" color="pink">GV</Badge>{" "}
                  <Badge size="sm">{abschnitte.length}</Badge>
                </Text>
              </Group>
              <div style={{ height: "25vh", width: "100%" }}>
                <AgGridReact
                  theme={themeQuartz}
                  rowData={abschnitte}
                  columnDefs={streckenabschnitteCols}
                  defaultColDef={{ sortable: true, filter: true, resizable: true }}
                />
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
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

      {/* Tour Brechen Modal */}
      <Modal opened={brechenModalOpen} onClose={closeBrechenModal} title="Tour brechen" size="md">
        <Stack>
          <Alert color="blue" variant="light">
            Die Tour wird in Vorlauf (VL) und Nachlauf (NL) aufgeteilt.
            Wählen Sie den Umschlagpunkt als Zwischenstopp.
          </Alert>
          <Select label="Umschlagpunkt" required searchable data={uspOpts}
            value={brechenUspId}
            onChange={setBrechenUspId}
            placeholder="USP auswählen..." />
          <TextInput label="Von (Startpunkt)" placeholder="z.B. Bosch Stuttgart"
            value={brechenVon}
            onChange={(e) => setBrechenVon(e.target.value)} />
          <TextInput label="Nach (Zielpunkt)" placeholder="z.B. BMW München"
            value={brechenNach}
            onChange={(e) => setBrechenNach(e.target.value)} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeBrechenModal}>Abbrechen</Button>
            <Button color="pink" onClick={tourBrechenAusfuehren} disabled={!brechenUspId}>
              Tour brechen
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
