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
  Tabs,
  Table,
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
  benutzerAnzahl: number;
  rechteIds: string[];
}

interface Niederlassung {
  id: string;
  name: string;
  kurzbezeichnung: string;
}

interface RechtItem {
  id: string;
  aktion: string;
}

interface ModulRechte {
  modul: string;
  rechte: RechtItem[];
}

const modulLabels: Record<string, string> = {
  niederlassung: "Niederlassung",
  oem: "OEM",
  werk: "Werk",
  lieferant: "Lieferant",
  abladestelle: "Abladestelle",
  tu: "Transport-Unternehmer",
  kfz: "KFZ",
  route: "Route",
  kondition: "Kondition",
  dispoort: "DispoOrt",
  disporegel: "DispoRegel",
  avis: "Avis",
  mengenplan: "Mengenplan",
  tour: "Tour",
  abfahrt: "Abfahrt",
  nacharbeit: "Nacharbeit",
  sendung: "Sendung",
  tuabrechnung: "TU-Abrechnung",
  berichte: "Berichte",
  benutzer: "Benutzer",
  umschlagpunkt: "Umschlagpunkt",
  gebrocheneverkehre: "Gebrochene Verkehre",
};

const aktionLabels: Record<string, string> = {
  lesen: "Lesen",
  erstellen: "Erstellen",
  bearbeiten: "Bearbeiten",
  loeschen: "Löschen",
};

// ============================================================
// Tab 1: Benutzer
// ============================================================
function BenutzerTab() {
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
    { field: "niederlassung.name", headerName: "Niederlassung", width: 140 },
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
    <>
      <Group justify="space-between" mb="md">
        <div />
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

      <div style={{ height: "calc(100vh - 250px)", width: "100%" }}>
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
    </>
  );
}

// ============================================================
// Tab 2: Rollenverwaltung
// ============================================================
function RollenTab() {
  const { hatRecht } = useAuth();
  const darfBearbeiten = hatRecht("benutzer", "bearbeiten");

  const [rollen, setRollen] = useState<Rolle[]>([]);
  const [alleRechte, setAlleRechte] = useState<ModulRechte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  const [editId, setEditId] = useState<string | null>(null);
  const [rolleForm, setRolleForm] = useState({
    name: "",
    beschreibung: "",
    rechteIds: [] as string[],
  });

  const columns: ColDef[] = [
    { field: "name", headerName: "Name", width: 200 },
    { field: "beschreibung", headerName: "Beschreibung", flex: 1 },
    { field: "rechteAnzahl", headerName: "Rechte", width: 100 },
    { field: "benutzerAnzahl", headerName: "Benutzer", width: 100 },
  ];

  const laden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api("/benutzer/rollen");
      setRollen(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const ladeRechte = useCallback(async () => {
    try {
      const res = await api("/benutzer/rechte");
      setAlleRechte(res.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    laden();
  }, [laden]);

  const neueRolle = async () => {
    setRolleForm({ name: "", beschreibung: "", rechteIds: [] });
    setEditId(null);
    setError("");
    setSuccess("");
    await ladeRechte();
    open();
  };

  const rolleBearbeiten = async (row: Rolle) => {
    setRolleForm({
      name: row.name,
      beschreibung: row.beschreibung || "",
      rechteIds: row.rechteIds || [],
    });
    setEditId(row.id);
    setError("");
    setSuccess("");
    await ladeRechte();
    open();
  };

  const rolleSpeichern = async () => {
    try {
      const body = {
        name: rolleForm.name,
        beschreibung: rolleForm.beschreibung,
        rechteIds: rolleForm.rechteIds,
      };

      if (editId) {
        await api(`/benutzer/rollen/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api("/benutzer/rollen", {
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

  const rolleLoeschen = async (id: string) => {
    if (!confirm("Rolle wirklich löschen?")) return;
    try {
      await api(`/benutzer/rollen/${id}`, { method: "DELETE" });
      setSelectedRow(null);
      setSuccess("Rolle gelöscht");
      laden();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleRecht = (rechtId: string) => {
    setRolleForm((prev) => ({
      ...prev,
      rechteIds: prev.rechteIds.includes(rechtId)
        ? prev.rechteIds.filter((id) => id !== rechtId)
        : [...prev.rechteIds, rechtId],
    }));
  };

  const toggleModul = (modulRechte: RechtItem[]) => {
    const ids = modulRechte.map((r) => r.id);
    const alleAktiv = ids.every((id) => rolleForm.rechteIds.includes(id));

    setRolleForm((prev) => ({
      ...prev,
      rechteIds: alleAktiv
        ? prev.rechteIds.filter((id) => !ids.includes(id))
        : [...new Set([...prev.rechteIds, ...ids])],
    }));
  };

  // Bestimme alle möglichen Aktionen über alle Module
  const alleAktionen = ["lesen", "erstellen", "bearbeiten", "loeschen"];

  return (
    <>
      <Group justify="space-between" mb="md">
        <div />
        <Group>
          {darfBearbeiten && (
            <Button onClick={neueRolle}>Neue Rolle</Button>
          )}
          {selectedRow && darfBearbeiten && (
            <>
              <Button variant="light" onClick={() => rolleBearbeiten(selectedRow)}>
                Bearbeiten
              </Button>
              <Button
                variant="light"
                color="red"
                onClick={() => rolleLoeschen(selectedRow.id)}
              >
                Löschen
              </Button>
            </>
          )}
        </Group>
      </Group>

      {error && (
        <Alert color="red" mb="md" withCloseButton onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="green" mb="md" withCloseButton onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <div style={{ height: "calc(100vh - 280px)", width: "100%" }}>
        <LoadingOverlay visible={loading} />
        <AgGridReact
          theme={themeQuartz}
          rowData={rollen}
          columnDefs={columns}
          defaultColDef={{ sortable: true, filter: true, resizable: true }}
          rowSelection="single"
          onRowSelected={(e) =>
            setSelectedRow(e.node.isSelected() ? e.data : null)
          }
          onRowDoubleClicked={(e) => darfBearbeiten && rolleBearbeiten(e.data)}
          pagination={true}
          paginationPageSize={50}
        />
      </div>

      <Modal
        opened={opened}
        onClose={close}
        title={editId ? "Rolle bearbeiten" : "Neue Rolle"}
        size="xl"
      >
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        <Stack>
          <Group grow>
            <TextInput
              label="Name"
              required
              value={rolleForm.name}
              onChange={(e) => setRolleForm({ ...rolleForm, name: e.target.value })}
            />
            <TextInput
              label="Beschreibung"
              value={rolleForm.beschreibung}
              onChange={(e) => setRolleForm({ ...rolleForm, beschreibung: e.target.value })}
            />
          </Group>

          <div>
            <Text fw={500} size="sm" mb="xs">
              Rechte-Matrix
            </Text>
            <div style={{ maxHeight: 400, overflow: "auto", border: "1px solid #dee2e6", borderRadius: 4 }}>
              <Table striped highlightOnHover>
                <Table.Thead style={{ position: "sticky", top: 0, background: "white", zIndex: 1 }}>
                  <Table.Tr>
                    <Table.Th style={{ width: 200 }}>Modul</Table.Th>
                    {alleAktionen.map((a) => (
                      <Table.Th key={a} style={{ textAlign: "center", width: 100 }}>
                        {aktionLabels[a] || a}
                      </Table.Th>
                    ))}
                    <Table.Th style={{ textAlign: "center", width: 60 }}>Alle</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {alleRechte.map((mr) => {
                    const modulIds = mr.rechte.map((r) => r.id);
                    const alleAktiv = modulIds.every((id) => rolleForm.rechteIds.includes(id));
                    return (
                      <Table.Tr key={mr.modul}>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {modulLabels[mr.modul] || mr.modul}
                          </Text>
                        </Table.Td>
                        {alleAktionen.map((aktion) => {
                          const recht = mr.rechte.find((r) => r.aktion === aktion);
                          if (!recht) return <Table.Td key={aktion} />;
                          return (
                            <Table.Td key={aktion} style={{ textAlign: "center" }}>
                              <Checkbox
                                checked={rolleForm.rechteIds.includes(recht.id)}
                                onChange={() => toggleRecht(recht.id)}
                              />
                            </Table.Td>
                          );
                        })}
                        <Table.Td style={{ textAlign: "center" }}>
                          <Checkbox
                            checked={alleAktiv}
                            onChange={() => toggleModul(mr.rechte)}
                          />
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </div>
            <Text size="xs" c="dimmed" mt="xs">
              {rolleForm.rechteIds.length} Rechte ausgewählt
            </Text>
          </div>

          <Group justify="flex-end">
            <Button variant="default" onClick={close}>
              Abbrechen
            </Button>
            <Button onClick={rolleSpeichern}>Speichern</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

// ============================================================
// Passwort-ändern-Modal
// ============================================================
function PasswortAendernModal({
  opened,
  onClose,
}: {
  opened: boolean;
  onClose: () => void;
}) {
  const [altesPasswort, setAltesPasswort] = useState("");
  const [neuesPasswort, setNeuesPasswort] = useState("");
  const [neuesPasswortBestaetigung, setNeuesPasswortBestaetigung] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reset = () => {
    setAltesPasswort("");
    setNeuesPasswort("");
    setNeuesPasswortBestaetigung("");
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const speichern = async () => {
    setError("");
    setSuccess("");

    if (!altesPasswort || !neuesPasswort) {
      setError("Altes und neues Passwort erforderlich");
      return;
    }

    if (neuesPasswort !== neuesPasswortBestaetigung) {
      setError("Neue Passwörter stimmen nicht überein");
      return;
    }

    if (neuesPasswort.length < 4) {
      setError("Neues Passwort muss mindestens 4 Zeichen lang sein");
      return;
    }

    try {
      await api("/auth/passwort-aendern", {
        method: "POST",
        body: JSON.stringify({ altesPasswort, neuesPasswort }),
      });
      setSuccess("Passwort wurde geändert");
      setAltesPasswort("");
      setNeuesPasswort("");
      setNeuesPasswortBestaetigung("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Passwort ändern">
      {error && (
        <Alert color="red" mb="md">
          {error}
        </Alert>
      )}
      {success && (
        <Alert color="green" mb="md">
          {success}
        </Alert>
      )}
      <Stack>
        <PasswordInput
          label="Altes Passwort"
          required
          value={altesPasswort}
          onChange={(e) => setAltesPasswort(e.target.value)}
        />
        <PasswordInput
          label="Neues Passwort"
          required
          value={neuesPasswort}
          onChange={(e) => setNeuesPasswort(e.target.value)}
        />
        <PasswordInput
          label="Neues Passwort bestätigen"
          required
          value={neuesPasswortBestaetigung}
          onChange={(e) => setNeuesPasswortBestaetigung(e.target.value)}
        />
        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button onClick={speichern}>Passwort ändern</Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ============================================================
// Hauptkomponente
// ============================================================
export function BenutzerPage() {
  const { hatRecht } = useAuth();
  const darfRollenSehen = hatRecht("benutzer", "bearbeiten");
  const [pwModalOpened, { open: openPwModal, close: closePwModal }] = useDisclosure(false);

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Benutzer-Verwaltung</Title>
        <Button variant="light" onClick={openPwModal}>
          Passwort ändern
        </Button>
      </Group>

      <Tabs defaultValue="benutzer">
        <Tabs.List>
          <Tabs.Tab value="benutzer">Benutzer</Tabs.Tab>
          {darfRollenSehen && <Tabs.Tab value="rollen">Rollen</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="benutzer" pt="md">
          <BenutzerTab />
        </Tabs.Panel>

        {darfRollenSehen && (
          <Tabs.Panel value="rollen" pt="md">
            <RollenTab />
          </Tabs.Panel>
        )}
      </Tabs>

      <PasswortAendernModal opened={pwModalOpened} onClose={closePwModal} />
    </Stack>
  );
}
