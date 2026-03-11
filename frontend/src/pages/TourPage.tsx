import { useState, useEffect, useCallback } from "react";
import {
  Title, Button, Group, TextInput, Select, Modal, Stack,
  LoadingOverlay, Alert, Text, Badge,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { ConfirmModal, useConfirm } from "../components/ConfirmModal";

ModuleRegistry.registerModules([AllCommunityModule]);

const tourColumns: ColDef[] = [
  { field: "tourNummer", headerName: "Tour-Nr.", width: 140 },
  {
    field: "tourDatum", headerName: "Datum", width: 120,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 130 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "Transport-Untern.", headerTooltip: "Transport-Unternehmer", width: 130 },
  { field: "route.routennummer", headerName: "Route", width: 120 },
  { field: "_count.artikelzeilen", headerName: "Zeilen", width: 80 },
  { field: "status", headerName: "Status", width: 110 },
];

const zeilenColumns: ColDef[] = [
  { field: "artikelBeschreibung", headerName: "Beschreibung", flex: 1 },
  { field: "avis.avisNummer", headerName: "Avis", width: 130 },
  { field: "avis.lieferant.name", headerName: "Lieferant", width: 160 },
  {
    field: "menge", headerName: "Menge", width: 100, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "masseinheit", headerName: "ME", width: 70 },
  {
    field: "gewicht", headerName: "Gewicht", width: 100, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "gutArt", headerName: "Gutart", width: 100 },
];

export function TourPage() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("tour", "erstellen");
  const darfBearbeiten = hatRecht("tour", "bearbeiten");
  const darfLoeschen = hatRecht("tour", "loeschen");

  const [touren, setTouren] = useState<any[]>([]);
  const [zeilen, setZeilen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suche, setSuche] = useState("");
  const [selectedTour, setSelectedTour] = useState<any>(null);
  const [error, setError] = useState("");
  const { modalProps, openConfirm } = useConfirm();

  const [modalOpen, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [tourForm, setTourForm] = useState<Record<string, any>>({});
  const [editId, setEditId] = useState<string | null>(null);

  const [kfzListe, setKfzListe] = useState<any[]>([]);
  const [tuListe, setTuListe] = useState<any[]>([]);
  const [routenListe, setRoutenListe] = useState<any[]>([]);
  const [konditionenListe, setKonditionenListe] = useState<any[]>([]);
  const [nlListe, setNlListe] = useState<any[]>([]);

  const ladeTouren = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/touren?limit=200&suche=${suche}`);
      setTouren(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [suche]);

  const ladeZeilen = useCallback(async (tourId: string) => {
    try {
      const res = await api(`/touren/${tourId}`);
      setZeilen(res.data.artikelzeilen || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const ladeOptionen = useCallback(async () => {
    const [kfz, tu, rout, kond, nl] = await Promise.all([
      api("/kfz?limit=500"),
      api("/transport-unternehmer?limit=500"),
      api("/routen?limit=500"),
      api("/konditionen?limit=500"),
      api("/niederlassungen?limit=500"),
    ]);
    setKfzListe(kfz.data.map((k: any) => ({ value: k.id, label: `${k.kennzeichen} (${k.transportUnternehmer?.kurzbezeichnung || ""})` })));
    setTuListe(tu.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.kurzbezeichnung})` })));
    setRoutenListe(rout.data.map((r: any) => ({ value: r.id, label: `${r.routennummer} — ${r.beschreibung || ""}` })));
    setKonditionenListe(kond.data.map((k: any) => ({ value: k.id, label: k.name })));
    setNlListe(nl.data.map((n: any) => ({ value: n.id, label: `${n.name} (${n.kurzbezeichnung})` })));
  }, []);

  useEffect(() => { ladeTouren(); }, [ladeTouren]);

  const neueTour = async () => {
    setTourForm({});
    setEditId(null);
    setError("");
    await ladeOptionen();
    openModal();
  };

  const tourBearbeiten = async (row: any) => {
    setTourForm({
      tourNummer: row.tourNummer,
      tourDatum: row.tourDatum ? new Date(row.tourDatum).toISOString().split("T")[0] : "",
      status: row.status,
      kfzId: row.kfzId || null,
      transportUnternehmerId: row.transportUnternehmerId || null,
      routeId: row.routeId || null,
      konditionId: row.konditionId || null,
      niederlassungId: row.niederlassungId,
      bemerkungIntern: row.bemerkungIntern || "",
      bemerkungExtern: row.bemerkungExtern || "",
    });
    setEditId(row.id);
    setError("");
    await ladeOptionen();
    openModal();
  };

  const tourSpeichern = async () => {
    try {
      const body = { ...tourForm };
      if (editId) {
        await api(`/touren/${editId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/touren", { method: "POST", body: JSON.stringify(body) });
      }
      closeModal();
      ladeTouren();
      if (selectedTour && editId === selectedTour.id) ladeZeilen(selectedTour.id);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tourLoeschen = (id: string) => {
    openConfirm({
      title: "Tour löschen",
      message: "Soll diese Tour wirklich gelöscht werden? Zugewiesene Zeilen werden freigegeben.",
      onConfirm: async () => {
        try {
          await api(`/touren/${id}`, { method: "DELETE" });
          if (selectedTour?.id === id) { setSelectedTour(null); setZeilen([]); }
          ladeTouren();
        } catch (err: any) {
          setError(err.message);
        }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Touren</Title>
        <Group>
          <TextInput placeholder="Suchen..." value={suche}
            onChange={(e) => setSuche(e.target.value)} style={{ width: 250 }} />
          {darfErstellen && <Button onClick={neueTour}>Neue Tour</Button>}
          {selectedTour && darfBearbeiten && (
            <Button variant="light" onClick={() => tourBearbeiten(selectedTour)}>Bearbeiten</Button>
          )}
          {selectedTour && darfLoeschen && (
            <Button variant="light" color="red" onClick={() => tourLoeschen(selectedTour.id)}>Löschen</Button>
          )}
          {selectedTour && (
            <>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`${import.meta.env.VITE_API_URL || "/api"}/pdf/cmr/${selectedTour.id}`, "_blank")}>
                CMR
              </Button>
              <Button size="sm" variant="outline"
                onClick={() => window.open(`${import.meta.env.VITE_API_URL || "/api"}/pdf/tourbegleitschein/${selectedTour.id}`, "_blank")}>
                Tourbegleitschein
              </Button>
            </>
          )}
        </Group>
      </Group>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      <div style={{ height: "40vh", width: "100%" }}>
        <LoadingOverlay visible={loading} />
        <AgGridReact
          theme={themeQuartz}
          rowData={touren}
          columnDefs={tourColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) => {
            if (e.node.isSelected()) {
              setSelectedTour(e.data);
              ladeZeilen(e.data.id);
            } else {
              setSelectedTour(null);
              setZeilen([]);
            }
          }}
          onRowDoubleClicked={(e) => darfBearbeiten && tourBearbeiten(e.data)}
          pagination paginationPageSize={50}
        />
      </div>

      <Group justify="space-between">
        <Text fw={600} size="lg">
          {selectedTour
            ? `Zugewiesene Zeilen — ${selectedTour.tourNummer}`
            : "Zugewiesene Zeilen (Tour auswählen)"}
          {selectedTour && (
            <Badge ml="sm" color={selectedTour.status === "offen" ? "blue" : "green"}>
              {selectedTour.status}
            </Badge>
          )}
        </Text>
      </Group>

      <div style={{ height: "30vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={zeilen}
          columnDefs={zeilenColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>

      <Modal opened={modalOpen} onClose={closeModal}
        title={editId ? "Tour bearbeiten" : "Neue Tour"} size="lg">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Stack>
          <TextInput label="Tour-Nummer" required
            value={tourForm.tourNummer || ""}
            onChange={(e) => setTourForm({ ...tourForm, tourNummer: e.target.value })} />
          <TextInput label="Tour-Datum" type="date" required
            value={tourForm.tourDatum || ""}
            onChange={(e) => setTourForm({ ...tourForm, tourDatum: e.target.value })} />
          <Select label="KFZ" searchable clearable data={kfzListe}
            value={tourForm.kfzId || null}
            onChange={(val) => setTourForm({ ...tourForm, kfzId: val })} />
          <Select label="Transport-Unternehmer" searchable clearable data={tuListe}
            value={tourForm.transportUnternehmerId || null}
            onChange={(val) => setTourForm({ ...tourForm, transportUnternehmerId: val })} />
          <Select label="Route" searchable clearable data={routenListe}
            value={tourForm.routeId || null}
            onChange={(val) => setTourForm({ ...tourForm, routeId: val })} />
          <Select label="Kondition" searchable clearable data={konditionenListe}
            value={tourForm.konditionId || null}
            onChange={(val) => setTourForm({ ...tourForm, konditionId: val })} />
          <Select label="Niederlassung" required searchable data={nlListe}
            value={tourForm.niederlassungId || null}
            onChange={(val) => setTourForm({ ...tourForm, niederlassungId: val })} />
          {editId && (
            <Select label="Status" data={["offen", "disponiert", "abgefahren", "abgeschlossen"]}
              value={tourForm.status || "offen"}
              onChange={(val) => setTourForm({ ...tourForm, status: val })} />
          )}
          <TextInput label="Bemerkung intern"
            value={tourForm.bemerkungIntern || ""}
            onChange={(e) => setTourForm({ ...tourForm, bemerkungIntern: e.target.value })} />
          <TextInput label="Bemerkung extern"
            value={tourForm.bemerkungExtern || ""}
            onChange={(e) => setTourForm({ ...tourForm, bemerkungExtern: e.target.value })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>Abbrechen</Button>
            <Button onClick={tourSpeichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal {...modalProps} />
    </Stack>
  );
}
