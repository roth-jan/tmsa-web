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

const abfahrtColumns: ColDef[] = [
  { field: "abfahrtNummer", headerName: "Abfahrt-Nr.", width: 140 },
  {
    field: "datum", headerName: "Datum", width: 110,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "tour.tourNummer", headerName: "Tour", width: 130 },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  { field: "transportUnternehmer.kurzbezeichnung", headerName: "Transport-Untern.", headerTooltip: "Transport-Unternehmer", width: 130 },
  { field: "route.routennummer", headerName: "Route", width: 110 },
  { field: "_count.borderos", headerName: "#Borderos", width: 100 },
  { field: "status", headerName: "Status", width: 110 },
];

const borderoColumns: ColDef[] = [
  { field: "borderoNummer", headerName: "Bordero-Nr.", width: 140 },
  {
    field: "gewicht", headerName: "Gewicht (kg)", width: 120, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  {
    field: "lademeter", headerName: "LDM", width: 100, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE", { minimumFractionDigits: 1 }) : "",
  },
  { field: "_count.sendungen", headerName: "#Sendungen", width: 110 },
  { field: "status", headerName: "Status", width: 110 },
];

export function AbfahrtPage() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("abfahrt", "erstellen");
  const darfBearbeiten = hatRecht("abfahrt", "bearbeiten");
  const darfLoeschen = hatRecht("abfahrt", "loeschen");

  const [abfahrten, setAbfahrten] = useState<any[]>([]);
  const [borderos, setBorderos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAbfahrt, setSelectedAbfahrt] = useState<any>(null);
  const [selectedBordero, setSelectedBordero] = useState<any>(null);
  const [error, setError] = useState("");
  const { modalProps, openConfirm } = useConfirm();

  // Abfahrt aus Tour Modal
  const [ausTourModalOpen, { open: openAusTourModal, close: closeAusTourModal }] = useDisclosure(false);
  const [tourenListe, setTourenListe] = useState<any[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);

  // Bordero Modal
  const [borderoModalOpen, { open: openBorderoModal, close: closeBorderoModal }] = useDisclosure(false);
  const [borderoForm, setBorderoForm] = useState<Record<string, any>>({});
  const [editBorderoId, setEditBorderoId] = useState<string | null>(null);

  // Manuelle Abfahrt Modal
  const [abfahrtModalOpen, { open: openAbfahrtModal, close: closeAbfahrtModal }] = useDisclosure(false);
  const [abfahrtForm, setAbfahrtForm] = useState<Record<string, any>>({});
  const [kfzListe, setKfzListe] = useState<any[]>([]);
  const [tuListe, setTuListe] = useState<any[]>([]);
  const [routenListe, setRoutenListe] = useState<any[]>([]);
  const [nlListe, setNlListe] = useState<any[]>([]);

  const ladeAbfahrten = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/abfahrten?limit=200");
      setAbfahrten(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const ladeBorderos = useCallback(async (abfahrtId: string) => {
    try {
      const res = await api(`/abfahrten/${abfahrtId}`);
      setBorderos(res.data.borderos || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { ladeAbfahrten(); }, [ladeAbfahrten]);

  // Abfahrt aus Tour
  const abfahrtAusTour = async () => {
    setError("");
    try {
      const res = await api("/abfahrten/touren-fuer-abfahrt");
      setTourenListe(res.data.map((t: any) => ({
        value: t.id,
        label: `${t.tourNummer} — ${new Date(t.tourDatum).toLocaleDateString("de-DE")} ${t.kfz?.kennzeichen || ""} ${t.route?.routennummer || ""}`,
      })));
      setSelectedTourId(null);
      openAusTourModal();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const abfahrtAusTourErstellen = async () => {
    if (!selectedTourId) return;
    try {
      await api(`/abfahrten/aus-tour/${selectedTourId}`, { method: "POST" });
      closeAusTourModal();
      ladeAbfahrten();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Manuelle Abfahrt
  const neueAbfahrt = async () => {
    setAbfahrtForm({});
    setError("");
    const [kfz, tu, rout, nl] = await Promise.all([
      api("/kfz?limit=500"),
      api("/transport-unternehmer?limit=500"),
      api("/routen?limit=500"),
      api("/niederlassungen?limit=500"),
    ]);
    setKfzListe(kfz.data.map((k: any) => ({ value: k.id, label: `${k.kennzeichen} (${k.transportUnternehmer?.kurzbezeichnung || ""})` })));
    setTuListe(tu.data.map((t: any) => ({ value: t.id, label: `${t.name} (${t.kurzbezeichnung})` })));
    setRoutenListe(rout.data.map((r: any) => ({ value: r.id, label: `${r.routennummer} — ${r.beschreibung || ""}` })));
    setNlListe(nl.data.map((n: any) => ({ value: n.id, label: `${n.name} (${n.kurzbezeichnung})` })));
    openAbfahrtModal();
  };

  const abfahrtSpeichern = async () => {
    try {
      await api("/abfahrten", {
        method: "POST",
        body: JSON.stringify(abfahrtForm),
      });
      closeAbfahrtModal();
      ladeAbfahrten();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Abfahrt löschen
  const abfahrtLoeschen = (id: string) => {
    openConfirm({
      title: "Abfahrt löschen",
      message: "Soll diese Abfahrt wirklich gelöscht werden?",
      onConfirm: async () => {
        try {
          await api(`/abfahrten/${id}`, { method: "DELETE" });
          if (selectedAbfahrt?.id === id) {
            setSelectedAbfahrt(null);
            setBorderos([]);
          }
          ladeAbfahrten();
        } catch (err: any) {
          setError(err.message);
        }
      },
    });
  };

  // Bordero CRUD
  const neuesBordero = () => {
    setBorderoForm({});
    setEditBorderoId(null);
    setError("");
    openBorderoModal();
  };

  const borderoBearbeiten = (row: any) => {
    setBorderoForm({
      gewicht: row.gewicht || "",
      lademeter: row.lademeter || "",
      bemerkung: row.bemerkung || "",
      status: row.status,
    });
    setEditBorderoId(row.id);
    setError("");
    openBorderoModal();
  };

  const borderoSpeichern = async () => {
    if (!selectedAbfahrt) return;
    try {
      if (editBorderoId) {
        await api(`/abfahrten/${selectedAbfahrt.id}/borderos/${editBorderoId}`, {
          method: "PUT",
          body: JSON.stringify(borderoForm),
        });
      } else {
        await api(`/abfahrten/${selectedAbfahrt.id}/borderos`, {
          method: "POST",
          body: JSON.stringify(borderoForm),
        });
      }
      closeBorderoModal();
      ladeBorderos(selectedAbfahrt.id);
      ladeAbfahrten(); // Count aktualisieren
    } catch (err: any) {
      setError(err.message);
    }
  };

  const borderoLoeschen = (borderoId: string) => {
    if (!selectedAbfahrt) return;
    const abfahrtId = selectedAbfahrt.id;
    openConfirm({
      title: "Bordero löschen",
      message: "Soll dieses Bordero wirklich gelöscht werden?",
      onConfirm: async () => {
        try {
          await api(`/abfahrten/${abfahrtId}/borderos/${borderoId}`, { method: "DELETE" });
          ladeBorderos(abfahrtId);
          ladeAbfahrten();
        } catch (err: any) {
          setError(err.message);
        }
      },
    });
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Abfahrten</Title>
        <Group>
          {darfErstellen && (
            <>
              <Button onClick={abfahrtAusTour}>Abfahrt aus Tour</Button>
              <Button variant="light" onClick={neueAbfahrt}>Neue Abfahrt</Button>
            </>
          )}
          {selectedAbfahrt && darfLoeschen && (
            <Button variant="light" color="red" onClick={() => abfahrtLoeschen(selectedAbfahrt.id)}>Löschen</Button>
          )}
        </Group>
      </Group>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      {/* Abfahrten-Grid */}
      <div style={{ height: "40vh", width: "100%" }}>
        <LoadingOverlay visible={loading} />
        <AgGridReact
          theme={themeQuartz}
          rowData={abfahrten}
          columnDefs={abfahrtColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) => {
            if (e.node.isSelected()) {
              setSelectedAbfahrt(e.data);
              ladeBorderos(e.data.id);
            } else {
              setSelectedAbfahrt(null);
              setBorderos([]);
            }
          }}
          pagination paginationPageSize={50}
        />
      </div>

      {/* Borderos */}
      <Group justify="space-between">
        <Text fw={600} size="lg">
          {selectedAbfahrt
            ? <>Borderos von {selectedAbfahrt.abfahrtNummer} <Badge ml="sm">{borderos.length}</Badge></>
            : "Borderos (Abfahrt auswählen)"}
        </Text>
        <Group>
          {selectedAbfahrt && darfBearbeiten && (
            <Button size="sm" variant="light" onClick={neuesBordero}>+ Neues Bordero</Button>
          )}
          {selectedBordero && darfBearbeiten && (
            <Button size="sm" variant="light" onClick={() => borderoBearbeiten(selectedBordero)}>Bearbeiten</Button>
          )}
          {selectedBordero && darfBearbeiten && (
            <Button size="sm" variant="light" color="red" onClick={() => borderoLoeschen(selectedBordero.id)}>Löschen</Button>
          )}
          {selectedBordero && (
            <Button size="sm" variant="outline"
              onClick={() => window.open(`${import.meta.env.VITE_API_URL || "/api"}/pdf/bordero/${selectedBordero.id}`, "_blank")}>
              PDF
            </Button>
          )}
        </Group>
      </Group>

      <div style={{ height: "25vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={borderos}
          columnDefs={borderoColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) => setSelectedBordero(e.node.isSelected() ? e.data : null)}
          onRowDoubleClicked={(e) => darfBearbeiten && borderoBearbeiten(e.data)}
        />
      </div>

      {/* Abfahrt aus Tour Modal */}
      <Modal opened={ausTourModalOpen} onClose={closeAusTourModal} title="Abfahrt aus Tour erstellen" size="md">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Stack>
          <Select label="Tour auswählen" searchable placeholder="Disponierte Tour wählen..."
            data={tourenListe} value={selectedTourId}
            onChange={setSelectedTourId} />
          <Text size="sm" c="dimmed">
            KFZ, TU und Route werden aus der Tour übernommen. Der Tour-Status wird auf "abgefahren" gesetzt.
          </Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAusTourModal}>Abbrechen</Button>
            <Button onClick={abfahrtAusTourErstellen} disabled={!selectedTourId}>Erstellen</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Manuelle Abfahrt Modal */}
      <Modal opened={abfahrtModalOpen} onClose={closeAbfahrtModal} title="Neue Abfahrt" size="lg">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Stack>
          <TextInput label="Abfahrt-Nummer" required
            value={abfahrtForm.abfahrtNummer || ""}
            onChange={(e) => setAbfahrtForm({ ...abfahrtForm, abfahrtNummer: e.target.value })} />
          <TextInput label="Datum" type="date" required
            value={abfahrtForm.datum || ""}
            onChange={(e) => setAbfahrtForm({ ...abfahrtForm, datum: e.target.value })} />
          <Select label="KFZ" searchable clearable data={kfzListe}
            value={abfahrtForm.kfzId || null}
            onChange={(val) => setAbfahrtForm({ ...abfahrtForm, kfzId: val })} />
          <Select label="Transport-Unternehmer" searchable clearable data={tuListe}
            value={abfahrtForm.transportUnternehmerId || null}
            onChange={(val) => setAbfahrtForm({ ...abfahrtForm, transportUnternehmerId: val })} />
          <Select label="Route" searchable clearable data={routenListe}
            value={abfahrtForm.routeId || null}
            onChange={(val) => setAbfahrtForm({ ...abfahrtForm, routeId: val })} />
          <Select label="Niederlassung" required searchable data={nlListe}
            value={abfahrtForm.niederlassungId || null}
            onChange={(val) => setAbfahrtForm({ ...abfahrtForm, niederlassungId: val })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAbfahrtModal}>Abbrechen</Button>
            <Button onClick={abfahrtSpeichern}>Erstellen</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bordero Modal */}
      <Modal opened={borderoModalOpen} onClose={closeBorderoModal}
        title={editBorderoId ? "Bordero bearbeiten" : "Neues Bordero"} size="md">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Stack>
          <TextInput label="Gewicht (kg)" type="number"
            value={borderoForm.gewicht || ""}
            onChange={(e) => setBorderoForm({ ...borderoForm, gewicht: e.target.value })} />
          <TextInput label="Lademeter" type="number"
            value={borderoForm.lademeter || ""}
            onChange={(e) => setBorderoForm({ ...borderoForm, lademeter: e.target.value })} />
          {editBorderoId && (
            <Select label="Status" data={["offen", "borderiert", "abgeschlossen"]}
              value={borderoForm.status || "offen"}
              onChange={(val) => setBorderoForm({ ...borderoForm, status: val })} />
          )}
          <TextInput label="Bemerkung"
            value={borderoForm.bemerkung || ""}
            onChange={(e) => setBorderoForm({ ...borderoForm, bemerkung: e.target.value })} />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeBorderoModal}>Abbrechen</Button>
            <Button onClick={borderoSpeichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal {...modalProps} />
    </Stack>
  );
}
