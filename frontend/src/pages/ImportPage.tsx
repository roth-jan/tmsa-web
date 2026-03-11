import { useState } from "react";
import {
  Title, Button, Group, Select, Stack,
  Alert, Text, Textarea, Badge, Table,
} from "@mantine/core";
import { api } from "../api/client";

const MODELLE = [
  { value: "lieferant", label: "Lieferanten" },
  { value: "werk", label: "Werke" },
  { value: "abladestelle", label: "Abladestellen" },
  { value: "tu", label: "Transport-Unternehmer" },
  { value: "kfz", label: "KFZ / Fahrzeuge" },
  { value: "route", label: "Routen" },
];

const PFLICHTFELDER: Record<string, string[]> = {
  lieferant: ["name"],
  werk: ["name", "oemId"],
  abladestelle: ["name", "werkId"],
  tu: ["name", "kurzbezeichnung", "niederlassungId"],
  kfz: ["kennzeichen", "transportUnternehmerId"],
  route: ["routennummer", "oemId"],
};

export function ImportPage() {
  const [modell, setModell] = useState<string | null>(null);
  const [csvText, setCsvText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const vorschau = async () => {
    if (!modell || !csvText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api(`/import/${modell}`, {
        method: "POST",
        body: JSON.stringify({ csvContent: csvText, preview: true }),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const importieren = async () => {
    if (!modell || !csvText.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await api(`/import/${modell}`, {
        method: "POST",
        body: JSON.stringify({ csvContent: csvText, preview: false }),
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(reader.result as string);
    reader.readAsText(file, "utf-8");
  };

  return (
    <Stack>
      <Title order={2}>Stammdaten-Import</Title>

      <Group align="flex-end">
        <Select
          label="Modell"
          data={MODELLE}
          value={modell}
          onChange={setModell}
          placeholder="Bitte wählen..."
          w={250}
        />
        <div>
          <Text size="sm" fw={500} mb={4}>CSV-Datei hochladen</Text>
          <input type="file" accept=".csv,.txt" onChange={handleFileUpload} />
        </div>
      </Group>

      {modell && (
        <Alert color="blue" variant="light">
          <Text size="sm">
            <strong>Pflichtfelder:</strong> {PFLICHTFELDER[modell]?.join(", ") || "—"}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            CSV-Format: Semikolon-getrennt, UTF-8. Erste Zeile = Spaltenüberschriften.
          </Text>
        </Alert>
      )}

      <Textarea
        label="CSV-Inhalt"
        placeholder="name;lieferantennummer;adresse;plz;ort&#10;Bosch GmbH;LF-001;Stuttgarter Str. 1;70469;Stuttgart"
        minRows={8}
        maxRows={20}
        autosize
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
      />

      <Group>
        <Button onClick={vorschau} loading={loading} variant="light" disabled={!modell || !csvText.trim()}>
          Vorschau
        </Button>
        <Button onClick={importieren} loading={loading} disabled={!modell || !csvText.trim()}>
          Importieren
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      {result && (
        <Stack gap="sm">
          <Group>
            <Badge size="lg" color={result.modus === "vorschau" ? "blue" : "green"}>
              {result.modus === "vorschau" ? "Vorschau" : "Import"}
            </Badge>
            <Text>
              {result.modus === "vorschau"
                ? `${result.valide} von ${result.gesamt} Zeilen valide`
                : `${result.importiert} von ${result.gesamt} Zeilen importiert`}
            </Text>
          </Group>

          {result.fehler?.length > 0 && (
            <Alert color="orange" title={`${result.fehler.length} Fehler`}>
              <Stack gap={4}>
                {result.fehler.slice(0, 20).map((f: any, i: number) => (
                  <Text key={i} size="sm">
                    Zeile {f.zeile}: {f.fehler}
                  </Text>
                ))}
                {result.fehler.length > 20 && (
                  <Text size="sm" c="dimmed">
                    ... und {result.fehler.length - 20} weitere Fehler
                  </Text>
                )}
              </Stack>
            </Alert>
          )}

          {result.vorschau?.length > 0 && (
            <div style={{ overflow: "auto", maxHeight: 300 }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {result.headers?.map((h: string) => (
                      <Table.Th key={h}>{h}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {result.vorschau.map((row: any, i: number) => (
                    <Table.Tr key={i}>
                      {result.headers?.map((h: string) => (
                        <Table.Td key={h}>{String(row[h] ?? "")}</Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          )}
        </Stack>
      )}
    </Stack>
  );
}
