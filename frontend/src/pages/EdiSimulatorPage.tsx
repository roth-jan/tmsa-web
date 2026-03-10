import { useState, useEffect, useCallback } from "react";
import {
  Title, Button, Group, Select, Stack, Alert, Text, Code,
  Paper, Table, Badge,
} from "@mantine/core";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";

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
  // 511 = Header
  lines.push(`511${pad(tpl.oem, 10)}${datum}${padNum(laufnr, 4)}`);
  // 512 = Lieferant
  lines.push(`512${pad(tpl.lieferantNr, 7)}${pad(tpl.lieferantName.toUpperCase(), 35)}`);
  // 513 = Werk
  lines.push(`513${pad(tpl.werkscode, 7)}${pad(tpl.werkName.toUpperCase(), 35)}`);
  // 514 = Artikelzeilen
  tpl.teile.forEach((t, i) => {
    lines.push(
      `514${padNum(i + 1, 3)}${pad(t.beschreibung.toUpperCase(), 30)}${padNum(t.menge, 6)}${pad(t.me, 4)}${padNum(t.gewicht, 6)}`
    );
  });
  // 519 = Footer
  lines.push("519ENDE");
  return lines.join("\n");
}

// ── Parsed Avis aus Template ableiten ───────────────────────────
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
      pos: i + 1,
      beschreibung: t.beschreibung,
      menge: t.menge,
      me: t.me,
      gewicht: t.gewicht,
    })),
  };
}

// ── Hauptkomponente ─────────────────────────────────────────────
export function EdiSimulatorPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // OEM-Auswahl
  const oemOptions = [...new Set(EDI_TEMPLATES.map((t) => t.oem))];
  const [selectedOem, setSelectedOem] = useState<string | null>(null);
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState<number | null>(null);

  // Generierter Output
  const [vdaText, setVdaText] = useState("");
  const [parsed, setParsed] = useState<ParsedAvis | null>(null);
  const [laufnr, setLaufnr] = useState(1);

  // Import-Status
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ id: string; avisNummer: string } | null>(null);
  const [error, setError] = useState("");

  // Lookup-Daten vom Backend (IDs ermitteln)
  const [lieferanten, setLieferanten] = useState<any[]>([]);
  const [werke, setWerke] = useState<any[]>([]);
  const [niederlassungen, setNiederlassungen] = useState<any[]>([]);

  const ladeStammdaten = useCallback(async () => {
    try {
      const [lief, werk, nl] = await Promise.all([
        api("/lieferanten?limit=500"),
        api("/werke?limit=500"),
        api("/niederlassungen?limit=500"),
      ]);
      setLieferanten(lief.data);
      setWerke(werk.data);
      setNiederlassungen(nl.data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    ladeStammdaten();
  }, [ladeStammdaten]);

  // Wenn OEM gewählt, zeige passende Templates
  const filteredTemplates = selectedOem
    ? EDI_TEMPLATES.filter((t) => t.oem === selectedOem)
    : [];

  const templateOptions = filteredTemplates.map((t, i) => ({
    value: String(i),
    label: `${t.werkName} ← ${t.lieferantName}`,
  }));

  // "Nachricht generieren"
  const generieren = () => {
    if (selectedTemplateIdx === null) return;
    const tpl = filteredTemplates[selectedTemplateIdx];
    const datumStr = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0].replace(/-/g, "");
    const ladeDatum = new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0];
    const nr = laufnr;

    setVdaText(generateVdaMessage(tpl, nr, datumStr));
    setParsed(parseTemplate(tpl, nr, ladeDatum));
    setImportResult(null);
    setError("");
    setLaufnr((prev) => prev + 1);
  };

  // "Importieren" → POST /api/avise
  const importieren = async () => {
    if (!parsed) return;
    setImporting(true);
    setError("");

    try {
      // IDs ermitteln
      const werk = werke.find((w: any) => w.name === parsed.werkName);
      const lieferant = lieferanten.find((l: any) => l.name === parsed.lieferantName);
      const niederlassung = niederlassungen.find((n: any) => n.name === user?.niederlassung) || niederlassungen[0];

      if (!werk) throw new Error(`Werk "${parsed.werkName}" nicht in Stammdaten gefunden`);
      if (!lieferant) throw new Error(`Lieferant "${parsed.lieferantName}" nicht in Stammdaten gefunden`);
      if (!niederlassung) throw new Error("Keine Niederlassung verfügbar");

      const body = {
        avisNummer: parsed.avisNummer,
        ladeDatum: parsed.ladeDatum,
        status: "offen",
        werkId: werk.id,
        lieferantId: lieferant.id,
        niederlassungId: niederlassung.id,
        bemerkung: `EDI-Import VDA 4913 (${parsed.oem})`,
        artikelzeilen: parsed.zeilen.map((z) => ({
          artikelBeschreibung: z.beschreibung,
          menge: z.menge,
          masseinheit: z.me,
          gewicht: z.gewicht,
          gutArt: "VOLLGUT",
        })),
      };

      const res = await api("/avise", { method: "POST", body: JSON.stringify(body) });
      setImportResult({ id: res.data.id, avisNummer: res.data.avisNummer });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Stack>
      <Title order={2}>EDI Eingang (VDA 4913 Simulator)</Title>

      {error && (
        <Alert color="red" withCloseButton onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Auswahl */}
      <Paper p="md" withBorder>
        <Group align="flex-end">
          <Select
            label="OEM"
            placeholder="OEM wählen..."
            data={oemOptions}
            value={selectedOem}
            onChange={(val) => {
              setSelectedOem(val);
              setSelectedTemplateIdx(null);
              setVdaText("");
              setParsed(null);
              setImportResult(null);
            }}
            style={{ width: 200 }}
          />
          <Select
            label="Werk / Lieferant"
            placeholder="Kombination wählen..."
            data={templateOptions}
            value={selectedTemplateIdx !== null ? String(selectedTemplateIdx) : null}
            onChange={(val) => setSelectedTemplateIdx(val !== null ? Number(val) : null)}
            disabled={!selectedOem}
            style={{ width: 350 }}
          />
          <Button
            onClick={generieren}
            disabled={selectedTemplateIdx === null}
          >
            Nachricht generieren
          </Button>
        </Group>
      </Paper>

      {/* VDA 4913 Nachricht */}
      {vdaText && (
        <Paper p="md" withBorder>
          <Text fw={600} mb="xs">VDA 4913 Nachricht:</Text>
          <Code block style={{ fontSize: 13, whiteSpace: "pre" }}>
            {vdaText}
          </Code>
        </Paper>
      )}

      {/* Erkannte Daten */}
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

          {/* Import-Aktionen */}
          <Group mt="md">
            {!importResult && (
              <Button onClick={importieren} loading={importing}>
                Importieren
              </Button>
            )}
            {importResult && (
              <>
                <Button
                  variant="light"
                  onClick={() => navigate("/avise")}
                >
                  Zum Avis
                </Button>
              </>
            )}
          </Group>

          {importResult && (
            <Alert color="green" mt="md">
              Avis <b>{importResult.avisNummer}</b> mit {parsed.zeilen.length} Zeilen erfolgreich importiert!
            </Alert>
          )}
        </Paper>
      )}

      {/* Legende */}
      {!vdaText && (
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed">
            Der EDI Simulator erzeugt eine VDA 4913 Nachricht (Sendungsanforderung) und importiert
            diese als Avis in das System. Im Echtbetrieb kommen diese Nachrichten automatisch per
            EDI von den OEMs (BMW, Daimler, VW, etc.).
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
