import { useState, useCallback } from "react";
import {
  Title, Button, Group, TextInput, Textarea, Stack, Alert, Text,
  Badge, Paper, Tabs, Modal,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

const EUR = (v: any) => v != null ? `${Number(v).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : "";
const datumFmt = (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "";

// ============================================================
// Tab 1: Bewerten
// ============================================================
function BewertungsTab() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("tuabrechnung", "erstellen");

  const [datumVon, setDatumVon] = useState(
    new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]
  );
  const [datumBis, setDatumBis] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [touren, setTouren] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [summe, setSumme] = useState(0);
  const [bewertungErgebnis, setBewertungErgebnis] = useState<string>("");

  const columns: ColDef[] = [
    { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
    { field: "tourDatum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
    { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
    { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
    { field: "route.routennummer", headerName: "Route", width: 110 },
    { field: "berechnung.konditionName", headerName: "Kondition", width: 140 },
    { field: "lastKilometer", headerName: "Last-km", width: 90, type: "numericColumn" },
    { field: "leerKilometer", headerName: "Leer-km", width: 90, type: "numericColumn" },
    { field: "mautKilometer", headerName: "Maut-km", width: 90, type: "numericColumn" },
    { field: "berechnung.tourKosten", headerName: "Tour-K.", width: 95, valueFormatter: (p: any) => EUR(p.value) },
    { field: "berechnung.stoppKosten", headerName: "Stopp-K.", width: 95, valueFormatter: (p: any) => EUR(p.value) },
    { field: "berechnung.lastKmKosten", headerName: "Last-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    { field: "berechnung.leerKmKosten", headerName: "Leer-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    { field: "berechnung.mautKmKosten", headerName: "Maut-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    {
      field: "berechnung.gesamtKosten", headerName: "Gesamt", width: 110,
      valueFormatter: (p: any) => EUR(p.value),
      cellStyle: { fontWeight: "bold" },
    },
    { field: "fehler", headerName: "Fehler", width: 150, cellStyle: { color: "red" } },
  ];

  const vorschauLaden = useCallback(async () => {
    setError(""); setBewertungErgebnis(""); setLoading(true);
    try {
      const res = await api("/tu-abrechnung/vorschau", {
        method: "POST",
        body: JSON.stringify({ datumVon, datumBis }),
      });
      setTouren(res.touren);
      setSumme(res.gesamtKosten);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [datumVon, datumBis]);

  const jetzBewerten = useCallback(async () => {
    setError(""); setBewertungErgebnis(""); setLoading(true);
    try {
      const res = await api("/tu-abrechnung/bewerten", {
        method: "POST",
        body: JSON.stringify({ datumVon, datumBis }),
      });
      setBewertungErgebnis(
        `${res.bewerteteTouren} Tour(en) bewertet, Gesamtkosten: ${EUR(res.gesamtKosten)}`
      );
      setTouren([]);
      setSumme(0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [datumVon, datumBis]);

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      {bewertungErgebnis && <Alert color="green" withCloseButton onClose={() => setBewertungErgebnis("")}>{bewertungErgebnis}</Alert>}

      <Paper p="sm" withBorder>
        <Group>
          <TextInput label="Datum von" type="date" value={datumVon}
            onChange={(e) => setDatumVon(e.target.value)} style={{ width: 160 }} />
          <TextInput label="Datum bis" type="date" value={datumBis}
            onChange={(e) => setDatumBis(e.target.value)} style={{ width: 160 }} />
          <Button mt="xl" onClick={vorschauLaden} loading={loading}>Vorschau</Button>
          {darfErstellen && touren.length > 0 && (
            <Button mt="xl" color="green" onClick={jetzBewerten} loading={loading}>
              Jetzt bewerten ({touren.filter(t => t.berechnung).length} Touren)
            </Button>
          )}
        </Group>
      </Paper>

      {touren.length > 0 && (
        <>
          <Text fw={600}>Summe: {EUR(summe)}</Text>
          <div style={{ height: "50vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={touren}
              columnDefs={columns}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        </>
      )}
    </Stack>
  );
}

// ============================================================
// Tab 2: Freigeben & Erzeugen
// ============================================================
function FreigebenTab() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("tuabrechnung", "bearbeiten");
  const darfErstellen = hatRecht("tuabrechnung", "erstellen");

  const [bewerteteTouren, setBewerteteTouren] = useState<any[]>([]);
  const [freigegebeneTouren, setFreigegebeneTouren] = useState<any[]>([]);
  const [selectedBewertet, setSelectedBewertet] = useState<string[]>([]);
  const [selectedFreigegeben, setSelectedFreigegeben] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tourCols: ColDef[] = [
    { headerCheckboxSelection: true, checkboxSelection: true, width: 50 },
    { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
    { field: "tourDatum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
    { field: "transportUnternehmer.kurzbezeichnung", headerName: "TU", width: 90 },
    { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
    { field: "kondition.name", headerName: "Kondition", width: 140 },
    {
      field: "kostenKondition", headerName: "Kosten", width: 110,
      valueFormatter: (p: any) => EUR(p.value),
      cellStyle: { fontWeight: "bold" },
    },
  ];

  const aktualisieren = useCallback(async () => {
    setError(""); setSuccess("");
    try {
      const [bew, frei] = await Promise.all([
        api("/tu-abrechnung/touren/bewertet"),
        api("/tu-abrechnung/touren/freigegeben"),
      ]);
      setBewerteteTouren(bew.data);
      setFreigegebeneTouren(frei.data);
      setSelectedBewertet([]);
      setSelectedFreigegeben([]);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const freigeben = useCallback(async () => {
    if (!selectedBewertet.length) return;
    setError("");
    try {
      const res = await api("/tu-abrechnung/freigeben", {
        method: "POST",
        body: JSON.stringify({ tourIds: selectedBewertet }),
      });
      const msg = `${res.freigegebeneTouren} Tour(en) freigegeben`;
      await aktualisieren();
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedBewertet, aktualisieren]);

  const erzeugen = useCallback(async () => {
    if (!selectedFreigegeben.length) return;
    setError("");
    try {
      const res = await api("/tu-abrechnung/erzeugen", {
        method: "POST",
        body: JSON.stringify({ tourIds: selectedFreigegeben }),
      });
      const msg = `${res.abrechnungen.length} Abrechnung(en) erzeugt: ${res.abrechnungen.map((a: any) => a.belegnummer).join(", ")}`;
      await aktualisieren();
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedFreigegeben, aktualisieren]);

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert color="green" withCloseButton onClose={() => setSuccess("")}>{success}</Alert>}

      <Button onClick={aktualisieren}>Aktualisieren</Button>

      {/* Bewertete Touren → Freigeben */}
      <Paper p="sm" withBorder>
        <Group justify="space-between" mb="xs">
          <Text fw={600}>Bewertete Touren (Status: bewertet)</Text>
          {darfBearbeiten && selectedBewertet.length > 0 && (
            <Button size="sm" color="blue" onClick={freigeben}>
              {selectedBewertet.length} Tour(en) freigeben
            </Button>
          )}
        </Group>
        <div style={{ height: "30vh", width: "100%" }}>
          <AgGridReact
            theme={themeQuartz}
            rowData={bewerteteTouren}
            columnDefs={tourCols}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            rowSelection="multiple"
            onSelectionChanged={(e) => {
              setSelectedBewertet(e.api.getSelectedRows().map((r: any) => r.id));
            }}
          />
        </div>
      </Paper>

      {/* Freigegebene Touren → Erzeugen */}
      <Paper p="sm" withBorder>
        <Group justify="space-between" mb="xs">
          <Text fw={600}>Freigegebene Touren (Status: freigegeben)</Text>
          {darfErstellen && selectedFreigegeben.length > 0 && (
            <Button size="sm" color="green" onClick={erzeugen}>
              Abrechnung erzeugen ({selectedFreigegeben.length} Touren)
            </Button>
          )}
        </Group>
        <div style={{ height: "30vh", width: "100%" }}>
          <AgGridReact
            theme={themeQuartz}
            rowData={freigegebeneTouren}
            columnDefs={tourCols}
            defaultColDef={{ sortable: true, filter: true, resizable: true }}
            rowSelection="multiple"
            onSelectionChanged={(e) => {
              setSelectedFreigegeben(e.api.getSelectedRows().map((r: any) => r.id));
            }}
          />
        </div>
      </Paper>
    </Stack>
  );
}

// ============================================================
// Tab 3: Abrechnungen
// ============================================================
function AbrechnungenTab() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("tuabrechnung", "bearbeiten");

  const [abrechnungen, setAbrechnungen] = useState<any[]>([]);
  const [selectedAbr, setSelectedAbr] = useState<any>(null);
  const [positionen, setPositionen] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [stornoModalOpen, setStornoModalOpen] = useState(false);
  const [stornoGrund, setStornoGrund] = useState("");

  const statusFarben: Record<string, string> = {
    offen: "blue",
    erzeugt: "green",
    storniert: "red",
  };

  const abrCols: ColDef[] = [
    { field: "belegnummer", headerName: "Beleg-Nr.", width: 140 },
    { field: "buchungsjahr", headerName: "Jahr", width: 70 },
    { field: "transportUnternehmer.name", headerName: "TU", width: 160 },
    { field: "zeitraumVon", headerName: "Von", width: 110, valueFormatter: datumFmt },
    { field: "zeitraumBis", headerName: "Bis", width: 110, valueFormatter: datumFmt },
    { field: "anzahlPositionen", headerName: "#Pos", width: 70 },
    {
      field: "gesamtbetrag", headerName: "Betrag", width: 120,
      valueFormatter: (p: any) => EUR(p.value),
      cellStyle: { fontWeight: "bold" },
    },
    {
      field: "status", headerName: "Status", width: 100,
      cellRenderer: (p: any) => p.value,
      cellStyle: (p: any) => ({
        color: p.value === "storniert" ? "red" : p.value === "erzeugt" ? "green" : "blue",
        fontWeight: "bold",
      }),
    },
  ];

  const posCols: ColDef[] = [
    { field: "tourNummer", headerName: "Tour-Nr.", width: 130 },
    { field: "tourDatum", headerName: "Datum", width: 110, valueFormatter: datumFmt },
    { field: "konditionName", headerName: "Kondition", width: 140 },
    { field: "tourKosten", headerName: "Tour-K.", width: 90, valueFormatter: (p: any) => EUR(p.value) },
    { field: "stoppKosten", headerName: "Stopp-K.", width: 90, valueFormatter: (p: any) => EUR(p.value) },
    { field: "lastKmKosten", headerName: "Last-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    { field: "leerKmKosten", headerName: "Leer-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    { field: "mautKmKosten", headerName: "Maut-km-K.", width: 100, valueFormatter: (p: any) => EUR(p.value) },
    {
      field: "gesamtKosten", headerName: "Gesamt", width: 110,
      valueFormatter: (p: any) => EUR(p.value),
      cellStyle: { fontWeight: "bold" },
    },
    {
      field: "istManuell", headerName: "Manuell", width: 80,
      cellRenderer: (p: any) => p.value ? "Ja" : "",
    },
  ];

  const aktualisieren = useCallback(async () => {
    setError(""); setSuccess("");
    try {
      const res = await api("/tu-abrechnung");
      setAbrechnungen(res.data);
      setSelectedAbr(null);
      setPositionen([]);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const detailLaden = useCallback(async (abr: any) => {
    setSelectedAbr(abr);
    try {
      const detail = await api(`/tu-abrechnung/${abr.id}`);
      setPositionen(detail.positionen);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const stornieren = useCallback(async () => {
    if (!selectedAbr || !stornoGrund.trim()) return;
    setError("");
    try {
      const res = await api(`/tu-abrechnung/${selectedAbr.id}/storno`, {
        method: "POST",
        body: JSON.stringify({ stornoGrund: stornoGrund.trim() }),
      });
      const msg = `Abrechnung ${selectedAbr.belegnummer} storniert (${res.storniertePositionen} Position(en))`;
      setStornoModalOpen(false);
      setStornoGrund("");
      await aktualisieren();
      setSuccess(msg);
    } catch (err: any) {
      setError(err.message);
    }
  }, [selectedAbr, stornoGrund, aktualisieren]);

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      {success && <Alert color="green" withCloseButton onClose={() => setSuccess("")}>{success}</Alert>}

      <Group>
        <Button onClick={aktualisieren}>Aktualisieren</Button>
        {darfBearbeiten && selectedAbr && selectedAbr.status !== "storniert" && (
          <Button color="red" variant="outline" onClick={() => { setStornoGrund(""); setStornoModalOpen(true); }}>
            {selectedAbr.belegnummer} stornieren
          </Button>
        )}
        {selectedAbr && (
          <Button variant="outline"
            onClick={() => window.open(`${import.meta.env.VITE_API_URL || "/api"}/pdf/tu-abrechnung/${selectedAbr.id}`, "_blank")}>
            PDF
          </Button>
        )}
      </Group>

      {/* Abrechnungen-Grid */}
      <div style={{ height: "30vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={abrechnungen}
          columnDefs={abrCols}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          onRowClicked={(e) => { if (e.data) detailLaden(e.data); }}
        />
      </div>

      {/* Positionen der gewählten Abrechnung */}
      {selectedAbr && (
        <Paper p="sm" withBorder>
          <Group mb="xs">
            <Text fw={600}>
              Positionen: {selectedAbr.belegnummer}
            </Text>
            <Badge color={statusFarben[selectedAbr.status] || "gray"}>
              {selectedAbr.status}
            </Badge>
            <Text size="sm" c="dimmed">
              {selectedAbr.transportUnternehmer?.name} | {EUR(selectedAbr.gesamtbetrag)}
            </Text>
          </Group>
          <div style={{ height: "25vh", width: "100%" }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={positionen}
              columnDefs={posCols}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
            />
          </div>
        </Paper>
      )}

      {/* Storno-Modal mit Pflicht-Grund */}
      <Modal opened={stornoModalOpen} onClose={() => setStornoModalOpen(false)} title="Abrechnung stornieren">
        <Stack>
          <Text size="sm">
            Abrechnung <b>{selectedAbr?.belegnummer}</b> wirklich stornieren?
            Alle zugehörigen Touren werden auf &quot;nicht abgerechnet&quot; zurückgesetzt.
          </Text>
          <Textarea
            label="Storno-Grund (Pflicht)"
            placeholder="Grund für die Stornierung eingeben..."
            value={stornoGrund}
            onChange={(e) => setStornoGrund(e.currentTarget.value)}
            minRows={3}
            required
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setStornoModalOpen(false)}>Abbrechen</Button>
            <Button color="red" onClick={stornieren} disabled={!stornoGrund.trim()}>
              Stornieren
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// ============================================================
// Hauptseite mit Tabs
// ============================================================
export function TuAbrechnungPage() {
  return (
    <Stack>
      <Title order={2}>TU-Abrechnung</Title>
      <Tabs defaultValue="bewerten">
        <Tabs.List>
          <Tabs.Tab value="bewerten">Bewerten</Tabs.Tab>
          <Tabs.Tab value="freigeben">Freigeben & Erzeugen</Tabs.Tab>
          <Tabs.Tab value="abrechnungen">Abrechnungen</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="bewerten" pt="md">
          <BewertungsTab />
        </Tabs.Panel>
        <Tabs.Panel value="freigeben" pt="md">
          <FreigebenTab />
        </Tabs.Panel>
        <Tabs.Panel value="abrechnungen" pt="md">
          <AbrechnungenTab />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
