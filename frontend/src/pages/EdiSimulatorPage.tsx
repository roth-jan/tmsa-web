import { useState, useEffect, useCallback } from "react";
import {
  Title, Button, Group, Select, Stack, Alert, Text, Code,
  Paper, Table, Badge, Tabs, Textarea,
} from "@mantine/core";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

ModuleRegistry.registerModules([AllCommunityModule]);

// ── OEM-Templates mit Beispielteilen ────────────────────────────
interface EdiTemplate {
  oem: string;
  werkName: string;
  werkscode: string;
  lieferantName: string;
  lieferantNr: string;
  teile: { beschreibung: string; menge: number; me: string; gewicht: number }[];
}

const EDI_TEMPLATES: EdiTemplate[] = [
  {
    oem: "BMW", werkName: "BMW Werk München", werkscode: "MUC",
    lieferantName: "Bosch GmbH", lieferantNr: "LF001",
    teile: [
      { beschreibung: "Stossdaempfer vorn links", menge: 500, me: "ST", gewicht: 1250 },
      { beschreibung: "Stossdaempfer vorn rechts", menge: 500, me: "ST", gewicht: 1250 },
      { beschreibung: "Querlenker-Satz", menge: 200, me: "ST", gewicht: 800 },
    ],
  },
  {
    oem: "BMW", werkName: "BMW Werk Dingolfing", werkscode: "DIN",
    lieferantName: "Continental AG", lieferantNr: "LF002",
    teile: [
      { beschreibung: "ABS-Sensor vorn", menge: 1000, me: "ST", gewicht: 300 },
      { beschreibung: "Steuergeraet ESP", menge: 400, me: "ST", gewicht: 480 },
      { beschreibung: "Drehzahlsensor", menge: 600, me: "ST", gewicht: 180 },
    ],
  },
  {
    oem: "Daimler", werkName: "Daimler Sindelfingen", werkscode: "SIN",
    lieferantName: "ZF Friedrichshafen", lieferantNr: "LF003",
    teile: [
      { beschreibung: "Getriebe 9-Gang AT", menge: 80, me: "ST", gewicht: 7200 },
      { beschreibung: "Antriebswelle links", menge: 150, me: "ST", gewicht: 1200 },
      { beschreibung: "Antriebswelle rechts", menge: 150, me: "ST", gewicht: 1200 },
    ],
  },
  {
    oem: "Volkswagen", werkName: "VW Wolfsburg", werkscode: "WOB",
    lieferantName: "Bosch GmbH", lieferantNr: "LF001",
    teile: [
      { beschreibung: "Einspritzduese CR", menge: 2000, me: "ST", gewicht: 600 },
      { beschreibung: "Turbolader VTG", menge: 300, me: "ST", gewicht: 2100 },
    ],
  },
];

// ── VDA 4913 Nachricht generieren ───────────────────────────────
function pad(s: string, len: number): string {
  return s.substring(0, len).padEnd(len, " ");
}
function padNum(n: number, len: number): string {
  return String(n).padStart(len, "0");
}

function generateVdaMessage(tpl: EdiTemplate, laufnr: number, datum: string): string {
  const lines: string[] = [];
  lines.push(`511${pad(tpl.oem, 10)}${datum}${padNum(laufnr, 4)}`);
  lines.push(`512${pad(tpl.lieferantNr, 7)}${pad(tpl.lieferantName.toUpperCase(), 35)}`);
  lines.push(`513${pad(tpl.werkscode, 7)}${pad(tpl.werkName.toUpperCase(), 35)}`);
  tpl.teile.forEach((t, i) => {
    lines.push(
      `514${padNum(i + 1, 3)}${pad(t.beschreibung.toUpperCase(), 30)}${padNum(t.menge, 6)}${pad(t.me, 4)}${padNum(t.gewicht, 6)}`
    );
  });
  lines.push("519ENDE");
  return lines.join("\n");
}

interface ParsedAvis {
  avisNummer: string;
  ladeDatum: string;
  oem: string;
  werkName: string;
  lieferantName: string;
  zeilen: { pos: number; beschreibung: string; menge: number; me: string; gewicht: number }[];
}

function parseTemplate(tpl: EdiTemplate, laufnr: number, ladeDatum: string): ParsedAvis {
  return {
    avisNummer: `AV-EDI-${new Date().getFullYear()}-${padNum(laufnr, 4)}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
    ladeDatum,
    oem: tpl.oem,
    werkName: tpl.werkName,
    lieferantName: tpl.lieferantName,
    zeilen: tpl.teile.map((t, i) => ({
      pos: i + 1, beschreibung: t.beschreibung, menge: t.menge, me: t.me, gewicht: t.gewicht,
    })),
  };
}

// ── Simulator-Tab ───────────────────────────────────────────────
function SimulatorTab() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const oemOptions = [...new Set(EDI_TEMPLATES.map((t) => t.oem))];
  const [selectedOem, setSelectedOem] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<number | null>(null);
  const [vdaText, setVdaText] = useState("");
  const [parsed, setParsed] = useState<ParsedAvis | null>(null);
  const [laufnr, setLaufnr] = useState(1);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ id: string; avisNummer: string } | null>(null);
  const [error, setError] = useState("");
  const [lieferanten, setLieferanten] = useState<any[]>([]);
  const [werke, setWerke] = useState<any[]>([]);
  const [niederlassungen, setNiederlassungen] = useState<any[]>([]);

  const ladeStammdaten = useCallback(async () => {
    try {
      const [lief, werk, nl] = await Promise.all([
        api("/lieferanten?limit=500"), api("/werke?limit=500"), api("/niederlassungen?limit=500"),
      ]);
      setLieferanten(lief.data); setWerke(werk.data); setNiederlassungen(nl.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  useEffect(() => { ladeStammdaten(); }, [ladeStammdaten]);

  const filteredTemplates = selectedOem ? EDI_TEMPLATES.filter((t) => t.oem === selectedOem) : [];
  const templateOptions = filteredTemplates.map((t, i) => ({ value: String(i), label: `${t.werkName} ← ${t.lieferantName}` }));

  const generieren = () => {
    if (selectedTemplateIdx === null) return;
    const tpl = filteredTemplates[selectedTemplateIdx];
    const datumStr = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0].replace(/-/g, "");
    const ladeDatum = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
    setVdaText(generateVdaMessage(tpl, laufnr, datumStr));
    setParsed(parseTemplate(tpl, laufnr, ladeDatum));
    setImportResult(null); setError(""); setLaufnr((prev) => prev + 1);
  };

  const importieren = async () => {
    if (!parsed) return;
    setImporting(true); setError("");
    try {
      const werk = werke.find((w: any) => w.name === parsed.werkName);
      const lieferant = lieferanten.find((l: any) => l.name === parsed.lieferantName);
      const niederlassung = niederlassungen.find((n: any) => n.name === user?.niederlassung) || niederlassungen[0];
      if (!werk) throw new Error(`Werk "${parsed.werkName}" nicht in Stammdaten gefunden`);
      if (!lieferant) throw new Error(`Lieferant "${parsed.lieferantName}" nicht in Stammdaten gefunden`);
      if (!niederlassung) throw new Error("Keine Niederlassung verfügbar");

      const body = {
        avisNummer: parsed.avisNummer, ladeDatum: parsed.ladeDatum, status: "offen",
        werkId: werk.id, lieferantId: lieferant.id, niederlassungId: niederlassung.id,
        bemerkung: `EDI-Import VDA 4913 (${parsed.oem})`,
        artikelzeilen: parsed.zeilen.map((z) => ({
          artikelBeschreibung: z.beschreibung, menge: z.menge, masseinheit: z.me, gewicht: z.gewicht, gutArt: "VOLLGUT",
        })),
      };
      const res = await api("/avise", { method: "POST", body: JSON.stringify(body) });
      setImportResult({ id: res.data.id, avisNummer: res.data.avisNummer });
    } catch (err: any) { setError(err.message); } finally { setImporting(false); }
  };

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}
      <Paper p="md" withBorder>
        <Group align="flex-end">
          <Select label="OEM" placeholder="OEM wählen..." data={oemOptions} value={selectedOem}
            onChange={(val) => { setSelectedOem(val); setSelectedTemplateIdx(null); setVdaText(""); setParsed(null); setImportResult(null); }}
            style={{ width: 200 }} />
          <Select label="Werk / Lieferant" placeholder="Kombination wählen..." data={templateOptions}
            value={selectedTemplateIdx !== null ? String(selectedTemplateIdx) : null}
            onChange={(val) => setSelectedTemplateIdx(val !== null ? Number(val) : null)}
            disabled={!selectedOem} style={{ width: 350 }} />
          <Button onClick={generieren} disabled={selectedTemplateIdx === null}>Nachricht generieren</Button>
        </Group>
      </Paper>

      {vdaText && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="xs">VDA 4913 Nachricht:</Text>
          <Code block style={{ fontSize: 13, whiteSpace: "pre" }}>{vdaText}</Code>
        </Paper>
      )}

      {parsed && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="xs">Erkannte Daten:</Text>
          <Stack gap="xs">
            <Group>
              <Text size="sm"><b>Avis-Nr:</b> {parsed.avisNummer}</Text>
              <Text size="sm"><b>Ladedatum:</b> {new Date(parsed.ladeDatum).toLocaleDateString("de-DE")}</Text>
            </Group>
            <Group>
              <Text size="sm"><b>OEM:</b> {parsed.oem}</Text>
              <Text size="sm"><b>Werk:</b> {parsed.werkName}</Text>
              <Text size="sm"><b>Lieferant:</b> {parsed.lieferantName}</Text>
            </Group>
            <Text fw={600} mt="xs">Artikelzeilen:</Text>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w={50}>#</Table.Th>
                  <Table.Th>Beschreibung</Table.Th>
                  <Table.Th w={100}>Menge</Table.Th>
                  <Table.Th w={60}>ME</Table.Th>
                  <Table.Th w={120}>Gewicht (kg)</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {parsed.zeilen.map((z) => (
                  <Table.Tr key={z.pos}>
                    <Table.Td>{z.pos}</Table.Td>
                    <Table.Td>{z.beschreibung}</Table.Td>
                    <Table.Td>{z.menge.toLocaleString("de-DE")}</Table.Td>
                    <Table.Td>{z.me}</Table.Td>
                    <Table.Td>{z.gewicht.toLocaleString("de-DE")}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
          <Group mt="md">
            {!importResult && <Button onClick={importieren} loading={importing}>Importieren</Button>}
            {importResult && <Button variant="light" onClick={() => navigate("/avise")}>Zum Avis</Button>}
          </Group>
          {importResult && (
            <Alert color="green" mt="md">
              Avis <b>{importResult.avisNummer}</b> mit {parsed.zeilen.length} Zeilen erfolgreich importiert!
            </Alert>
          )}
        </Paper>
      )}

      {!vdaText && (
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed">
            Der Simulator erzeugt eine VDA 4913 Nachricht und importiert diese als Avis.
          </Text>
          <Group mt="sm" gap="xs">
            <Badge size="sm" variant="light">511 = Header</Badge>
            <Badge size="sm" variant="light">512 = Lieferant</Badge>
            <Badge size="sm" variant="light">513 = Werk</Badge>
            <Badge size="sm" variant="light">514 = Artikelzeile</Badge>
            <Badge size="sm" variant="light">519 = Ende</Badge>
          </Group>
        </Paper>
      )}
    </Stack>
  );
}

// ── Import-Tab ──────────────────────────────────────────────────
function ImportTab() {
  const [text, setText] = useState("");
  const [format, setFormat] = useState<string | null>(null);
  const [vorschau, setVorschau] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [parsing, setParsing] = useState(false);

  const vorschauLaden = async () => {
    if (!text.trim()) return;
    setParsing(true); setError(""); setVorschau(null); setImportResult(null);
    try {
      const res = await api("/edi/parse", { method: "POST", body: JSON.stringify({ text }) });
      setVorschau(res.data);
      setFormat(res.data.format);
    } catch (err: any) { setError(err.message); } finally { setParsing(false); }
  };

  const importieren = async () => {
    if (!text.trim()) return;
    setImporting(true); setError("");
    try {
      const res = await api("/edi/import", { method: "POST", body: JSON.stringify({ text }) });
      setImportResult(res.data);
    } catch (err: any) { setError(err.message); } finally { setImporting(false); }
  };

  return (
    <Stack>
      {error && <Alert color="red" withCloseButton onClose={() => setError("")}>{error}</Alert>}

      <Paper p="md" withBorder>
        <Textarea
          label="EDI-Nachricht einfügen"
          placeholder="VDA 4913, VDA 4927, DESADV oder IFCSUM Text hier einfügen..."
          minRows={8}
          maxRows={15}
          autosize
          value={text}
          onChange={(e) => { setText(e.target.value); setFormat(null); setVorschau(null); setImportResult(null); }}
        />
        <Group mt="md">
          {format && <Badge size="lg" variant="light" color="blue">{format}</Badge>}
          <Button onClick={vorschauLaden} loading={parsing} disabled={!text.trim()}>Vorschau</Button>
          <Button onClick={importieren} loading={importing} disabled={!text.trim()} color="green">Importieren</Button>
        </Group>
      </Paper>

      {vorschau && vorschau.format === "IFTSTA" && vorschau.statusUpdates?.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="xs">Erkannte Status-Updates ({vorschau.statusUpdates.length}):</Text>
          {vorschau.warnings?.length > 0 && (
            <Alert color="yellow" mb="sm">{vorschau.warnings.join(", ")}</Alert>
          )}
          {vorschau.statusUpdates.map((u: any, i: number) => (
            <Paper key={i} p="sm" withBorder mb="xs">
              <Group>
                <Text size="sm"><b>Referenz:</b> {u.referenz}</Text>
                <Badge color={
                  u.statusCode === "5" ? "green" : u.statusCode === "7" ? "red" :
                  u.statusCode === "3" ? "teal" : u.statusCode === "2" ? "blue" : "orange"
                }>{u.statusText}</Badge>
                {u.zeitpunkt && <Text size="sm"><b>Zeit:</b> {new Date(u.zeitpunkt).toLocaleString("de-DE")}</Text>}
                {u.ort && <Text size="sm"><b>Ort:</b> {u.ort}</Text>}
              </Group>
            </Paper>
          ))}
        </Paper>
      )}

      {vorschau && vorschau.format !== "IFTSTA" && vorschau.avise?.length > 0 && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="xs">Erkannte Avise ({vorschau.avise.length}):</Text>
          {vorschau.warnings?.length > 0 && (
            <Alert color="yellow" mb="sm">{vorschau.warnings.join(", ")}</Alert>
          )}
          {vorschau.avise.map((a: any, i: number) => (
            <Paper key={i} p="sm" withBorder mb="xs">
              <Group>
                <Text size="sm"><b>Avis-Nr:</b> {a.avisNummer}</Text>
                <Text size="sm"><b>Werk:</b> {a.werkscode}</Text>
                <Text size="sm"><b>Lieferant:</b> {a.lieferantNr}</Text>
                <Text size="sm"><b>Zeilen:</b> {a.zeilen?.length || 0}</Text>
              </Group>
            </Paper>
          ))}
        </Paper>
      )}

      {importResult && (
        <Alert color={importResult.status === "success" ? "green" : importResult.status === "partial" ? "yellow" : "red"}>
          <Text fw={600}>Import {importResult.status === "success" ? "erfolgreich" : importResult.status === "partial" ? "teilweise erfolgreich" : "fehlgeschlagen"}</Text>
          {importResult.format === "IFTSTA" && importResult.updatedCount != null && (
            <Text size="sm">{importResult.updatedCount} Tour(en) aktualisiert</Text>
          )}
          {importResult.createdAvisIds?.length > 0 && (
            <Text size="sm">{importResult.createdAvisIds.length} Avis(e) erstellt</Text>
          )}
          {importResult.errors?.length > 0 && (
            <Text size="sm" c="red">{importResult.errors.join(", ")}</Text>
          )}
        </Alert>
      )}
    </Stack>
  );
}

// ── Verlauf-Tab ─────────────────────────────────────────────────
const verlaufCols: ColDef[] = [
  { field: "erstelltAm", headerName: "Zeitpunkt", width: 170,
    valueFormatter: (p: any) => p.value ? new Date(p.value).toLocaleString("de-DE") : "" },
  { field: "dateiname", headerName: "Dateiname", width: 160 },
  { field: "format", headerName: "Format", width: 100 },
  { field: "status", headerName: "Status", width: 90 },
  { field: "benutzerName", headerName: "Benutzer", width: 120 },
];

function VerlaufTab() {
  const [daten, setDaten] = useState<any[]>([]);
  const [error, setError] = useState("");

  const laden = useCallback(async () => {
    try {
      const res = await api("/edi/log?limit=100");
      setDaten(res.data);
    } catch (err: any) { setError(err.message); }
  }, []);

  useEffect(() => { laden(); }, [laden]);

  return (
    <Stack>
      {error && <Alert color="red">{error}</Alert>}
      <Group>
        <Button variant="outline" onClick={laden}>Aktualisieren</Button>
      </Group>
      <div style={{ height: "55vh", width: "100%" }}>
        <AgGridReact
          theme={themeQuartz}
          rowData={daten}
          columnDefs={verlaufCols}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
        />
      </div>
    </Stack>
  );
}

// ── Hauptkomponente ─────────────────────────────────────────────
export function EdiSimulatorPage() {
  const [activeTab, setActiveTab] = useState<string | null>("simulator");

  return (
    <Stack>
      <Title order={2}>EDI Eingang</Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="simulator">Simulator</Tabs.Tab>
          <Tabs.Tab value="import">Import</Tabs.Tab>
          <Tabs.Tab value="verlauf">Verlauf</Tabs.Tab>
        </Tabs.List>

        <div style={{ paddingTop: "var(--mantine-spacing-md)" }}>
          {activeTab === "simulator" && <SimulatorTab />}
          {activeTab === "import" && <ImportTab />}
          {activeTab === "verlauf" && <VerlaufTab />}
        </div>
      </Tabs>
    </Stack>
  );
}
