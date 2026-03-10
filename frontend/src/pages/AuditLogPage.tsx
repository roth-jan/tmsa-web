import { useState, useCallback } from "react";
import {
  Title, Button, Group, TextInput, Select, Stack, Alert, Text, Paper, Modal, Code,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";

ModuleRegistry.registerModules([AllCommunityModule]);

const datumFmt = (p: any) =>
  p.value ? new Date(p.value).toLocaleString("de-DE") : "";

const modellOptionen = [
  "Avis", "Artikelzeile", "Tour", "Abfahrt", "Bordero", "Sendung",
  "TuAbrechnung", "TuAbrechnungsPosition", "Benutzer", "Rolle",
  "Kondition", "DispoOrt", "DispoRegel", "UmschlagPunkt", "Streckenabschnitt",
  "Niederlassung", "Oem", "Werk", "Lieferant", "Abladestelle",
  "TransportUnternehmer", "Kfz", "Route",
].map((m) => ({ value: m, label: m }));

const columns: ColDef[] = [
  { field: "zeitpunkt", headerName: "Zeitpunkt", width: 170, valueFormatter: datumFmt },
  { field: "benutzerName", headerName: "Benutzer", width: 120 },
  { field: "modell", headerName: "Modell", width: 140 },
  { field: "aktion", headerName: "Aktion", width: 90 },
  { field: "entitaetId", headerName: "Entity-ID", width: 280 },
];

export function AuditLogPage() {
  const [modell, setModell] = useState<string | null>(null);
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [daten, setDaten] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Detail-Modal
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure();
  const [detail, setDetail] = useState<any>(null);

  const laden = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (modell) params.set("modell", modell);
      if (von) params.set("von", von);
      if (bis) params.set("bis", bis);
      const res = await api(`/audit-log?${params}`);
      setDaten(res.data);
      setTotal(res.total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [modell, von, bis]);

  const onRowClicked = (event: any) => {
    setDetail(event.data);
    openDetail();
  };

  return (
    <Stack>
      <Title order={2}>Audit-Log</Title>

      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}

      <Paper p="sm" withBorder>
        <Group>
          <Select
            label="Modell"
            placeholder="Alle"
            data={modellOptionen}
            value={modell}
            onChange={setModell}
            clearable
            style={{ width: 180 }}
          />
          <TextInput label="Von" type="date" value={von}
            onChange={(e) => setVon(e.target.value)} style={{ width: 150 }} />
          <TextInput label="Bis" type="date" value={bis}
            onChange={(e) => setBis(e.target.value)} style={{ width: 150 }} />
          <Button mt="xl" onClick={laden} loading={loading}>Laden</Button>
        </Group>
      </Paper>

      <div style={{ height: "55vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={daten}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          onRowClicked={onRowClicked}
        />
      </div>

      <Text size="sm" c="dimmed">{total} Einträge gesamt</Text>

      <Modal opened={detailOpened} onClose={closeDetail} title="Audit-Log Detail" size="xl">
        {detail && (
          <Stack>
            <Group>
              <Text size="sm"><b>Modell:</b> {detail.modell}</Text>
              <Text size="sm"><b>Aktion:</b> {detail.aktion}</Text>
              <Text size="sm"><b>Benutzer:</b> {detail.benutzerName || "System"}</Text>
            </Group>
            <Text size="sm"><b>Zeitpunkt:</b> {new Date(detail.zeitpunkt).toLocaleString("de-DE")}</Text>
            <Text size="sm"><b>Entity-ID:</b> {detail.entitaetId}</Text>

            {detail.alterWert && (
              <>
                <Text fw={600} mt="sm">Alter Wert:</Text>
                <Code block style={{ maxHeight: 200, overflow: "auto" }}>
                  {JSON.stringify(detail.alterWert, null, 2)}
                </Code>
              </>
            )}
            {detail.neuerWert && (
              <>
                <Text fw={600} mt="sm">Neuer Wert:</Text>
                <Code block style={{ maxHeight: 200, overflow: "auto" }}>
                  {JSON.stringify(detail.neuerWert, null, 2)}
                </Code>
              </>
            )}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
