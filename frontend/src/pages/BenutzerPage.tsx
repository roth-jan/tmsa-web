import { useState, useEffect, useCallback } from "react";
import {
  Title,
  Button,
  Group,
  TextInput,
  PasswordInput,
  Select,
  Checkbox,
  Switch,
  Modal,
  Stack,
  LoadingOverlay,
  Alert,
  Badge,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

interface Rolle {
  id: string;
  name: string;
  beschreibung: string | null;
  rechteAnzahl: number;
}

interface Niederlassung {
  id: string;
  name: string;
  kurzbezeichnung: string;
}

export function BenutzerPage() {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht("benutzer", "erstellen");
  const darfBearbeiten = hatRecht("benutzer", "bearbeiten");
  const darfLoeschen = hatRecht("benutzer", "loeschen");

  const [benutzer, setBenutzer] = useState<any[]>([]);
  const [rollen, setRollen] = useState<Rolle[]>([]);
  const [niederlassungen, setNiederlassungen] = useState<Niederlassung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Formular-State
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    benutzername: "",
    passwort: "",
    vorname: "",
    nachname: "",
    email: "",
    niederlassungId: null as string | null,
    aktiv: true,
    rollenIds: [] as string[],
  });

  const columns: ColDef[] = [
    { field: "benutzername", headerName: "Benutzername", width: 150 },
    { field: "vorname", headerName: "Vorname", width: 130 },
    { field: "nachname", headerName: "Nachname", width: 130 },
    { field: "email", headerName: "E-Mail", flex: 1 },
    {
      field: "niederlassung.name",
      headerName: "Niederlassung",
      width: 140,
    },
    {
      field: "rollen",
      headerName: "Rollen",
      flex: 1,
      valueFormatter: (p: any) =>
        p.value?.map((r: any) => r.name).join(", ") || "—",
    },
    { field: "aktiv", headerName: "Aktiv", width: 80 },
  ];

  const laden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/benutzer");
      setBenutzer(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const ladeOptionen = useCallback(async () => {
    try {
      const [rollenRes, nlRes] = await Promise.all([
        api("/benutzer/rollen"),
        api("/niederlassungen?limit=500"),
      ]);
      setRollen(rollenRes.data);
      setNiederlassungen(nlRes.data);
    } catch {
      // Optionen-Fehler ignorieren
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  const neuAnlegen = async () => {
    setForm({
      benutzername: "",
      passwort: "",
      vorname: "",
      nachname: "",
      email: "",
      niederlassungId: null,
      aktiv: true,
      rollenIds: [],
    });
    setEditId(null);
    setError("");
    await ladeOptionen();
    open();
  };

  const bearbeiten = async (row: any) => {
    setForm({
      benutzername: row.benutzername,
      passwort: "",
      vorname: row.vorname,
      nachname: row.nachname,
      email: row.email || "",
      niederlassungId: row.niederlassungId,
      aktiv: row.aktiv,
      rollenIds: row.rollen?.map((r: any) => r.id) || [],
    });
    setEditId(row.id);
    setError("");
    await ladeOptionen();
    open();
  };

  const speichern = async () => {
    try {
      const body: any = {
        benutzername: form.benutzername,
        vorname: form.vorname,
        nachname: form.nachname,
        email: form.email,
        niederlassungId: form.niederlassungId,
        aktiv: form.aktiv,
        rollenIds: form.rollenIds,
      };

      if (form.passwort) {
        body.passwort = form.passwort;
      } else if (!editId) {
        setError("Passwort ist Pflicht für neue Benutzer");
        return;
      }

      if (editId) {
        await api(`/benutzer/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/benutzer", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      close();
      laden();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loeschen = async (id: string) => {
    if (!confirm("Benutzer wirklich deaktivieren?")) return;
    try {
      await api(`/benutzer/${id}`, { method: "DELETE" });
      laden();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleRolle = (rolleId: string) => {
    setForm((prev) => ({
      ...prev,
      rollenIds: prev.rollenIds.includes(rolleId)
        ? prev.rollenIds.filter((id) => id !== rolleId)
        : [...prev.rollenIds, rolleId],
    }));
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Benutzer-Verwaltung</Title>
        <Group>
          {darfErstellen && (
            <Button onClick={neuAnlegen}>Neuer Benutzer</Button>
          )}
          {selectedRow && (
            <>
              {darfBearbeiten && (
                <Button variant="light" onClick={() => bearbeiten(selectedRow)}>
                  Bearbeiten
                </Button>
              )}
              {darfLoeschen && (
                <Button
                  variant="light"
                  color="red"
                  onClick={() => loeschen(selectedRow.id)}
                >
                  Deaktivieren
                </Button>
              )}
            </>
          )}
        </Group>
      </Group>

      <div style={{ height: "calc(100vh - 200px)", width: "100%" }}>
        <LoadingOverlay visible={loading} />
        <AgGridReact
          theme={themeQuartz}
          rowData={benutzer}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) =>
            setSelectedRow(e.node.isSelected() ? e.data : null)
          }
          onRowDoubleClicked={(e) => darfBearbeiten && bearbeiten(e.data)}
          pagination={true}
          paginationPageSize={50}
        />
      </div>

      <Modal
        opened={opened}
        onClose={close}
        title={editId ? "Benutzer bearbeiten" : "Neuer Benutzer"}
        size="lg"
      >
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        <Stack>
          <TextInput
            label="Benutzername"
            required
            value={form.benutzername}
            onChange={(e) => setForm({ ...form, benutzername: e.target.value })}
          />
          <Group grow>
            <TextInput
              label="Vorname"
              required
              value={form.vorname}
              onChange={(e) => setForm({ ...form, vorname: e.target.value })}
            />
            <TextInput
              label="Nachname"
              required
              value={form.nachname}
              onChange={(e) => setForm({ ...form, nachname: e.target.value })}
            />
          </Group>
          <TextInput
            label="E-Mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <PasswordInput
            label={editId ? "Neues Passwort (leer = unverändert)" : "Passwort"}
            required={!editId}
            value={form.passwort}
            onChange={(e) => setForm({ ...form, passwort: e.target.value })}
          />
          <Select
            label="Niederlassung"
            data={niederlassungen.map((nl) => ({
              value: nl.id,
              label: `${nl.name} (${nl.kurzbezeichnung})`,
            }))}
            value={form.niederlassungId}
            onChange={(val) => setForm({ ...form, niederlassungId: val })}
            searchable
            clearable
            placeholder="Bitte wählen..."
          />

          <div>
            <Text fw={500} size="sm" mb="xs">
              Rollen
            </Text>
            <Stack gap="xs">
              {rollen.map((rolle) => (
                <Checkbox
                  key={rolle.id}
                  label={
                    <Group gap="xs">
                      <span>{rolle.name}</span>
                      <Badge size="xs" variant="light">
                        {rolle.rechteAnzahl} Rechte
                      </Badge>
                    </Group>
                  }
                  checked={form.rollenIds.includes(rolle.id)}
                  onChange={() => toggleRolle(rolle.id)}
                />
              ))}
            </Stack>
          </div>

          <Switch
            label="Aktiv"
            checked={form.aktiv}
            onChange={(e) =>
              setForm({ ...form, aktiv: e.currentTarget.checked })
            }
          />

          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Abbrechen
            </Button>
            <Button onClick={speichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
