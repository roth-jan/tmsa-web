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

const statusFarben: Record<string, string> = {
  offen: "blue",
  disponiert: "orange",
  abgeschlossen: "green",
  storniert: "red",
};

const avisColumns: ColDef[] = [
  { field: "avisNummer", headerName: "Avis-Nr.", width: 140 },
  {
    field: "ladeDatum", headerName: "Ladedatum", width: 120,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "lieferant.name", headerName: "Lieferant", flex: 1 },
  { field: "werk.name", headerName: "Werk", width: 180 },
  { field: "_count.artikelzeilen", headerName: "Zeilen", width: 80 },
  { field: "status", headerName: "Status", width: 110 },
  { field: "route.routennummer", headerName: "Route", width: 120 },
];

const zeilenColumns: ColDef[] = [
  { field: "artikelBeschreibung", headerName: "Beschreibung", flex: 1 },
  {
    field: "menge", headerName: "Menge", width: 100, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "masseinheit", headerName: "ME", width: 70 },
  {
    field: "gewicht", headerName: "Gewicht (kg)", width: 120, type: "numericColumn",
    valueFormatter: (p: any) => p.value ? Number(p.value).toLocaleString("de-DE") : "",
  },
  { field: "gutArt", headerName: "Gutart", width: 100 },
  {
    field: "status", headerName: "Status", width: 110,
    valueFormatter: (p: any) => {
      const map: Record<number, string> = { 0: "offen", 1: "disponiert", 2: "split", 3: "storniert" };
      return map[p.value] || String(p.value);
    },
  },
  { field: "tour.tourNummer", headerName: "Tour", width: 120 },
];

export function AvisPage() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("avis", "erstellen");
  const darfBearbeiten = hatRecht("avis", "bearbeiten");
  const darfLoeschen = hatRecht("avis", "loeschen");

  const [avise, setAvise] = useState<any[]>([]);
  const [zeilen, setZeilen] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suche, setSuche] = useState("");
  const [selectedAvis, setSelectedAvis] = useState<any>(null);
  const [error, setError] = useState("");
  const { modalProps, openConfirm } = useConfirm();

  // Avis Modal
  const [avisModalOpen, { open: openAvisModal, close: closeAvisModal }] = useDisclosure(false);
  const [avisForm, setAvisForm] = useState<Record<string, any>>({});
  const [editAvisId, setEditAvisId] = useState<string | null>(null);

  // Zeile Modal
  const [zeileModalOpen, { open: openZeileModal, close: closeZeileModal }] = useDisclosure(false);
  const [zeileForm, setZeileForm] = useState<Record<string, any>>({});
  const [editZeileId, setEditZeileId] = useState<string | null>(null);

  // Select options
  const [lieferanten, setLieferanten] = useState<any[]>([]);
  const [werke, setWerke] = useState<any[]>([]);
  const [abladestellen, setAbladestellen] = useState<any[]>([]);
  const [routen, setRouten] = useState<any[]>([]);
  const [niederlassungen, setNiederlassungen] = useState<any[]>([]);

  const ladeAvise = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`/avise?limit=200&suche=${suche}`);
      setAvise(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [suche]);

  const ladeZeilen = useCallback(async (avisId: string) => {
    try {
      const res = await api(`/avise/${avisId}`);
      setZeilen(res.data.artikelzeilen || []);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  const ladeOptionen = useCallback(async () => {
    const [lief, werk, abl, rout, nl] = await Promise.all([
      api("/lieferanten?limit=500"),
      api("/werke?limit=500"),
      api("/abladestellen?limit=500"),
      api("/routen?limit=500"),
      api("/niederlassungen?limit=500"),
    ]);
    setLieferanten(lief.data.map((l: any) => ({ value: l.id, label: l.name })));
    setWerke(werk.data.map((w: any) => ({ value: w.id, label: `${w.name} (${w.oem?.name || ""})` })));
    setAbladestellen(abl.data.map((a: any) => ({ value: a.id, label: `${a.name} (${a.werk?.name || ""})` })));
    setRouten(rout.data.map((r: any) => ({ value: r.id, label: `${r.routennummer} — ${r.beschreibung || ""}` })));
    setNiederlassungen(nl.data.map((n: any) => ({ value: n.id, label: `${n.name} (${n.kurzbezeichnung})` })));
  }, []);

  useEffect(() => { ladeAvise(); }, [ladeAvise]);

  // Avis CRUD
  const neuesAvis = async () => {
    setAvisForm({});
    setEditAvisId(null);
    setError("");
    await ladeOptionen();
    openAvisModal();
  };

  const avisBearbeiten = async (row: any) => {
    setAvisForm({
      avisNummer: row.avisNummer,
      ladeDatum: row.ladeDatum ? new Date(row.ladeDatum).toISOString().split("T")[0] : "",
      status: row.status,
      bemerkung: row.bemerkung || "",
      lieferantId: row.lieferantId,
      werkId: row.werkId,
      abladestelleId: row.abladestelleId || null,
      routeId: row.routeId || null,
      niederlassungId: row.niederlassungId,
    });
    setEditAvisId(row.id);
    setError("");
    await ladeOptionen();
    openAvisModal();
  };

  const avisSpeichern = async () => {
    try {
      const body = { ...avisForm };
      if (editAvisId) {
        await api(`/avise/${editAvisId}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await api("/avise", { method: "POST", body: JSON.stringify(body) });
      }
      closeAvisModal();
      ladeAvise();
      if (selectedAvis && editAvisId === selectedAvis.id) {
        ladeZeilen(selectedAvis.id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const avisLoeschen = (id: string) => {
    openConfirm({
      title: "Avis löschen",
      message: "Soll dieses Avis wirklich gelöscht werden?",
      onConfirm: async () => {
        try {
          await api(`/avise/${id}`, { method: "DELETE" });
          if (selectedAvis?.id === id) {
            setSelectedAvis(null);
            setZeilen([]);
          }
          ladeAvise();
        } catch (err: any) {
          setError(err.message);
        }
      },
    });
  };

  // Zeile CRUD
  const neueZeile = () => {
    setZeileForm({ masseinheit: "ST", gutArt: "VOLLGUT" });
    setEditZeileId(null);
    setError("");
    openZeileModal();
  };

  const zeileBearbeiten = (row: any) => {
    setZeileForm({
      artikelBeschreibung: row.artikelBeschreibung,
      menge: row.menge,
      masseinheit: row.masseinheit,
      gewicht: row.gewicht || "",
      volumen: row.volumen || "",
      gutArt: row.gutArt,
    });
    setEditZeileId(row.id);
    setError("");
    openZeileModal();
  };

  const zeileSpeichern = async () => {
    if (!selectedAvis) return;
    try {
      const body: any = {
        artikelBeschreibung: zeileForm.artikelBeschreibung,
        menge: Number(zeileForm.menge),
        masseinheit: zeileForm.masseinheit,
        gutArt: zeileForm.gutArt,
      };
      if (zeileForm.gewicht) body.gewicht = Number(zeileForm.gewicht);
      if (zeileForm.volumen) body.volumen = Number(zeileForm.volumen);

      if (editZeileId) {
        await api(`/avise/${selectedAvis.id}/zeilen/${editZeileId}`, {
          method: "PUT", body: JSON.stringify(body),
        });
      } else {
        await api(`/avise/${selectedAvis.id}/zeilen`, {
          method: "POST", body: JSON.stringify(body),
        });
      }
      closeZeileModal();
      ladeZeilen(selectedAvis.id);
      ladeAvise(); // Count aktualisieren
    } catch (err: any) {
      setError(err.message);
    }
  };

  const zeileLoeschen = (zeilenId: string) => {
    if (!selectedAvis) return;
    const avisId = selectedAvis.id;
    openConfirm({
      title: "Artikelzeile löschen",
      message: "Soll diese Zeile wirklich gelöscht werden?",
      onConfirm: async () => {
        try {
          await api(`/avise/${avisId}/zeilen/${zeilenId}`, { method: "DELETE" });
          ladeZeilen(avisId);
          ladeAvise();
        } catch (err: any) {
          setError(err.message);
        }
      },
    });
  };

  const [selectedZeile, setSelectedZeile] = useState<any>(null);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Avise</Title>
        <Group>
          <TextInput
            placeholder="Suchen..."
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            style={{ width: 250 }}
          />
          {darfErstellen && <Button onClick={neuesAvis}>Neues Avis</Button>}
          {selectedAvis && darfBearbeiten && (
            <Button variant="light" onClick={() => avisBearbeiten(selectedAvis)}>Bearbeiten</Button>
          )}
          {selectedAvis && darfLoeschen && (
            <Button variant="light" color="red" onClick={() => avisLoeschen(selectedAvis.id)}>Löschen</Button>
          )}
        </Group>
      </Group>

      {error && <Alert color="red" onClose={() => setError("")} withCloseButton>{error}</Alert>}

      {/* Avise-Grid */}
      <div style={{ height: "40vh", width: "100%" }}>
        <LoadingOverlay visible={loading} />
        <AgGridReact
          theme={themeQuartz}
          rowData={avise}
          columnDefs={avisColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) => {
            if (e.node.isSelected()) {
              setSelectedAvis(e.data);
              ladeZeilen(e.data.id);
            } else {
              setSelectedAvis(null);
              setZeilen([]);
            }
          }}
          onRowDoubleClicked={(e) => darfBearbeiten && avisBearbeiten(e.data)}
          pagination paginationPageSize={50}
        />
      </div>

      {/* Artikelzeilen */}
      <Group justify="space-between">
        <Text fw={600} size="lg">
          {selectedAvis
            ? `Artikelzeilen von ${selectedAvis.avisNummer}`
            : "Artikelzeilen (Avis auswählen)"}
          {selectedAvis && (
            <Badge ml="sm" color={statusFarben[selectedAvis.status] || "gray"}>
              {selectedAvis.status}
            </Badge>
          )}
        </Text>
        <Group>
          {selectedAvis && darfBearbeiten && (
            <Button size="sm" variant="light" onClick={neueZeile}>+ Neue Zeile</Button>
          )}
          {selectedZeile && darfBearbeiten && (
            <Button size="sm" variant="light" onClick={() => zeileBearbeiten(selectedZeile)}>Bearbeiten</Button>
          )}
          {selectedZeile && darfLoeschen && (
            <Button size="sm" variant="light" color="red" onClick={() => zeileLoeschen(selectedZeile.id)}>Löschen</Button>
          )}
        </Group>
      </Group>

      <div style={{ height: "30vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={zeilen}
          columnDefs={zeilenColumns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) => setSelectedZeile(e.node.isSelected() ? e.data : null)}
          onRowDoubleClicked={(e) => darfBearbeiten && zeileBearbeiten(e.data)}
        />
      </div>

      {/* Avis Modal */}
      <Modal opened={avisModalOpen} onClose={closeAvisModal}
        title={editAvisId ? "Avis bearbeiten" : "Neues Avis"} size="lg">
        {error && <Alert color="red" mb="md">{error}</Alert>}
        <Stack>
          <TextInput label="Avis-Nummer" required
            value={avisForm.avisNummer || ""}
            onChange={(e) => setAvisForm({ ...avisForm, avisNummer: e.target.value })}
          />
          <TextInput label="Ladedatum" type="date" required
            value={avisForm.ladeDatum || ""}
            onChange={(e) => setAvisForm({ ...avisForm, ladeDatum: e.target.value })}
          />
          <Select label="Lieferant" required searchable data={lieferanten}
            value={avisForm.lieferantId || null}
            onChange={(val) => setAvisForm({ ...avisForm, lieferantId: val })}
          />
          <Select label="Werk" required searchable data={werke}
            value={avisForm.werkId || null}
            onChange={(val) => setAvisForm({ ...avisForm, werkId: val })}
          />
          <Select label="Abladestelle" searchable clearable data={abladestellen}
            value={avisForm.abladestelleId || null}
            onChange={(val) => setAvisForm({ ...avisForm, abladestelleId: val })}
          />
          <Select label="Route" searchable clearable data={routen}
            value={avisForm.routeId || null}
            onChange={(val) => setAvisForm({ ...avisForm, routeId: val })}
          />
          <Select label="Niederlassung" required searchable data={niederlassungen}
            value={avisForm.niederlassungId || null}
            onChange={(val) => setAvisForm({ ...avisForm, niederlassungId: val })}
          />
          {editAvisId && (
            <Select label="Status" data={["offen", "disponiert", "abgeschlossen", "storniert"]}
              value={avisForm.status || "offen"}
              onChange={(val) => setAvisForm({ ...avisForm, status: val })}
            />
          )}
          <TextInput label="Bemerkung"
            value={avisForm.bemerkung || ""}
            onChange={(e) => setAvisForm({ ...avisForm, bemerkung: e.target.value })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeAvisModal}>Abbrechen</Button>
            <Button onClick={avisSpeichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Zeile Modal */}
      <Modal opened={zeileModalOpen} onClose={closeZeileModal}
        title={editZeileId ? "Artikelzeile bearbeiten" : "Neue Artikelzeile"} size="md">
        <Stack>
          <TextInput label="Beschreibung" required
            value={zeileForm.artikelBeschreibung || ""}
            onChange={(e) => setZeileForm({ ...zeileForm, artikelBeschreibung: e.target.value })}
          />
          <TextInput label="Menge" type="number" required
            value={zeileForm.menge || ""}
            onChange={(e) => setZeileForm({ ...zeileForm, menge: e.target.value })}
          />
          <Select label="Maßeinheit" data={["ST", "KG", "PAL"]}
            value={zeileForm.masseinheit || "ST"}
            onChange={(val) => setZeileForm({ ...zeileForm, masseinheit: val })}
          />
          <TextInput label="Gewicht (kg)" type="number"
            value={zeileForm.gewicht || ""}
            onChange={(e) => setZeileForm({ ...zeileForm, gewicht: e.target.value })}
          />
          <TextInput label="Volumen (m³)" type="number"
            value={zeileForm.volumen || ""}
            onChange={(e) => setZeileForm({ ...zeileForm, volumen: e.target.value })}
          />
          <Select label="Gutart" data={["VOLLGUT", "LEERGUT"]}
            value={zeileForm.gutArt || "VOLLGUT"}
            onChange={(val) => setZeileForm({ ...zeileForm, gutArt: val })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={closeZeileModal}>Abbrechen</Button>
            <Button onClick={zeileSpeichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>

      <ConfirmModal {...modalProps} />
    </Stack>
  );
}
