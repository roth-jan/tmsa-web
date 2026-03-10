import { useEffect, useState, useCallback } from "react";
import {
  Title,
  Text,
  SimpleGrid,
  Paper,
  Stack,
  Group,
  Grid,
  RingProgress,
  ThemeIcon,
  Button,
  Center,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { useAuth } from "../hooks/useAuth";
import { api } from "../api/client";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
} from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Kennzahlen {
  offeneZeilen: number;
  tourenHeute: number;
  tourenOffen: number;
  tourenDisponiert: number;
  tourenAbgefahren: number;
  tourenAbgeschlossen: number;
  tourenGebrochen: number;
  aviseOffen: number;
  abfahrtenHeute: number;
  sendungenHeute: number;
  abrechnungenOffen: number;
  kostenMonat: number;
  letzteTouren: any[];
}

const tourenColumns: ColDef[] = [
  { field: "tourNummer", headerName: "Tour-Nr", flex: 1 },
  {
    field: "tourDatum",
    headerName: "Datum",
    width: 120,
    valueFormatter: (p: any) =>
      p.value ? new Date(p.value).toLocaleDateString("de-DE") : "",
  },
  { field: "status", headerName: "Status", width: 120 },
  {
    field: "transportUnternehmer.kurzbezeichnung",
    headerName: "TU",
    width: 100,
  },
  { field: "kfz.kennzeichen", headerName: "KFZ", width: 120 },
  {
    field: "istGebrochen",
    headerName: "GV",
    width: 70,
    cellRenderer: (p: any) => (p.value ? "GV" : ""),
  },
];

function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Paper shadow="xs" p="md" radius="md" withBorder>
      <Group>
        <ThemeIcon size="lg" radius="md" variant="light" color={color}>
          <Text size="sm" fw={700}>
            {value}
          </Text>
        </ThemeIcon>
        <div>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          <Text size="sm" c="dimmed">
            {label}
          </Text>
        </div>
      </Group>
    </Paper>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<Kennzahlen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const laden = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ data: Kennzahlen }>("/dashboard/kennzahlen");
      setKpis(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  const rolle =
    user?.rechte && user.rechte.length > 50 ? "Administrator" : "Disponent";
  const heute = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // RingProgress Daten
  const tourenGesamt = kpis
    ? kpis.tourenOffen +
      kpis.tourenDisponiert +
      kpis.tourenAbgefahren +
      kpis.tourenAbgeschlossen
    : 0;
  const ringSegments =
    tourenGesamt > 0
      ? [
          {
            value: (kpis!.tourenOffen / tourenGesamt) * 100,
            color: "blue",
            tooltip: `Offen: ${kpis!.tourenOffen}`,
          },
          {
            value: (kpis!.tourenDisponiert / tourenGesamt) * 100,
            color: "yellow",
            tooltip: `Disponiert: ${kpis!.tourenDisponiert}`,
          },
          {
            value: (kpis!.tourenAbgefahren / tourenGesamt) * 100,
            color: "orange",
            tooltip: `Abgefahren: ${kpis!.tourenAbgefahren}`,
          },
          {
            value: (kpis!.tourenAbgeschlossen / tourenGesamt) * 100,
            color: "green",
            tooltip: `Abgeschlossen: ${kpis!.tourenAbgeschlossen}`,
          },
        ]
      : [{ value: 100, color: "gray" }];

  return (
    <Stack pos="relative">
      <LoadingOverlay visible={loading} />

      <div>
        <Title order={2}>
          Willkommen, {user?.vorname} {user?.nachname}
        </Title>
        <Text c="dimmed">
          {user?.niederlassung || "Alle Niederlassungen"} · {rolle} · {heute}
        </Text>
      </div>

      {error && (
        <Alert color="red" title="Fehler">
          {error}
        </Alert>
      )}

      {kpis && (
        <>
          {/* KPI Cards */}
          <SimpleGrid cols={{ base: 2, sm: 4 }}>
            <KpiCard
              label="Offene Zeilen"
              value={kpis.offeneZeilen}
              color="blue"
            />
            <KpiCard
              label="Touren heute"
              value={kpis.tourenHeute}
              color="teal"
            />
            <KpiCard
              label="Avise offen"
              value={kpis.aviseOffen}
              color="orange"
            />
            <KpiCard
              label="Abrechnungen offen"
              value={kpis.abrechnungenOffen}
              color="red"
            />
          </SimpleGrid>

          {/* Mitte: RingProgress + Tagesübersicht */}
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper shadow="xs" p="md" radius="md" withBorder h="100%">
                <Text fw={700} mb="md">
                  Touren-Status
                </Text>
                <Center>
                  <RingProgress
                    size={180}
                    thickness={20}
                    roundCaps
                    sections={ringSegments}
                    label={
                      <Center>
                        <div style={{ textAlign: "center" }}>
                          <Text size="xl" fw={700}>
                            {tourenGesamt}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Touren
                          </Text>
                        </div>
                      </Center>
                    }
                  />
                </Center>
                <Group mt="md" justify="center" gap="lg">
                  <Group gap={4}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: "var(--mantine-color-blue-6)",
                      }}
                    />
                    <Text size="xs">Offen ({kpis.tourenOffen})</Text>
                  </Group>
                  <Group gap={4}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: "var(--mantine-color-yellow-6)",
                      }}
                    />
                    <Text size="xs">Disponiert ({kpis.tourenDisponiert})</Text>
                  </Group>
                  <Group gap={4}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: "var(--mantine-color-orange-6)",
                      }}
                    />
                    <Text size="xs">Abgefahren ({kpis.tourenAbgefahren})</Text>
                  </Group>
                  <Group gap={4}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        backgroundColor: "var(--mantine-color-green-6)",
                      }}
                    />
                    <Text size="xs">
                      Abgeschlossen ({kpis.tourenAbgeschlossen})
                    </Text>
                  </Group>
                </Group>
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Paper shadow="xs" p="md" radius="md" withBorder h="100%">
                <Text fw={700} mb="md">
                  Tagesübersicht
                </Text>
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Text>Abfahrten heute</Text>
                    <Text fw={700}>{kpis.abfahrtenHeute}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Sendungen heute</Text>
                    <Text fw={700}>{kpis.sendungenHeute}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Gebrochene Touren</Text>
                    <Text fw={700} c={kpis.tourenGebrochen > 0 ? "red" : undefined}>
                      {kpis.tourenGebrochen}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text>Kosten Monat</Text>
                    <Text fw={700}>
                      {kpis.kostenMonat.toLocaleString("de-DE", {
                        style: "currency",
                        currency: "EUR",
                      })}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Grid.Col>
          </Grid>

          {/* Letzte Touren */}
          <Paper shadow="xs" p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={700}>Letzte Touren</Text>
              <Button variant="light" size="xs" onClick={laden}>
                Aktualisieren
              </Button>
            </Group>
            <div style={{ height: 250 }}>
              <AgGridReact
                theme={themeQuartz}
                rowData={kpis.letzteTouren}
                columnDefs={tourenColumns}
                defaultColDef={{ sortable: true, resizable: true }}
                domLayout="autoHeight"
              />
            </div>
          </Paper>
        </>
      )}
    </Stack>
  );
}
