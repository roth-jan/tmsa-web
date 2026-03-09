import { useState, useEffect, useCallback } from "react";
import {
  Title,
  Button,
  Group,
  TextInput,
  Select,
  Modal,
  Stack,
  LoadingOverlay,
  Alert,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { AgGridReact } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { AllCommunityModule, ModuleRegistry, themeQuartz } from "ag-grid-community";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

ModuleRegistry.registerModules([AllCommunityModule]);

export interface FormField {
  name: string;
  label: string;
  type?: "text" | "number" | "select";
  required?: boolean;
  /** Für type="select": API-Endpoint zum Laden der Optionen */
  optionsEndpoint?: string;
  /** Für type="select": Welches Feld als Label anzeigen */
  optionsLabel?: string | ((item: any) => string);
}

interface StammdatenPageProps {
  titel: string;
  apiEndpoint: string;
  /** Rechte-Modul, z.B. "werk", "tu" — steuert Sichtbarkeit der Buttons */
  modul: string;
  columns: ColDef[];
  formFields: FormField[];
}

export function StammdatenPage({
  titel,
  apiEndpoint,
  modul,
  columns,
  formFields,
}: StammdatenPageProps) {
  const { hatRecht } = useAuth();
  const darfErstellen = hatRecht(modul, "erstellen");
  const darfBearbeiten = hatRecht(modul, "bearbeiten");
  const darfLoeschen = hatRecht(modul, "loeschen");
  const [daten, setDaten] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [suche, setSuche] = useState("");
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editId, setEditId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [selectOptions, setSelectOptions] = useState<Record<string, { value: string; label: string }[]>>({});

  const laden = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api(`${apiEndpoint}?limit=200&suche=${suche}`);
      setDaten(res.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, suche]);

  useEffect(() => {
    laden();
  }, [laden]);

  // Dropdown-Optionen laden wenn Modal öffnet
  const ladeSelectOptionen = useCallback(async () => {
    const selectFields = formFields.filter((f) => f.type === "select" && f.optionsEndpoint);
    const results: Record<string, { value: string; label: string }[]> = {};

    await Promise.all(
      selectFields.map(async (field) => {
        try {
          const res = await api(`${field.optionsEndpoint}?limit=500`);
          results[field.name] = res.data.map((item: any) => ({
            value: item.id,
            label:
              typeof field.optionsLabel === "function"
                ? field.optionsLabel(item)
                : item[field.optionsLabel || "name"],
          }));
        } catch {
          results[field.name] = [];
        }
      })
    );

    setSelectOptions(results);
  }, [formFields]);

  const neuAnlegen = async () => {
    setFormData({});
    setEditId(null);
    setError("");
    await ladeSelectOptionen();
    open();
  };

  const bearbeiten = async (row: any) => {
    setFormData({ ...row });
    setEditId(row.id);
    setError("");
    await ladeSelectOptionen();
    open();
  };

  const speichern = async () => {
    try {
      const body: Record<string, any> = {};
      for (const field of formFields) {
        if (formData[field.name] !== undefined && formData[field.name] !== "") {
          body[field.name] =
            field.type === "number"
              ? Number(formData[field.name])
              : formData[field.name];
        }
      }

      if (editId) {
        await api(`${apiEndpoint}/${editId}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      } else {
        await api(apiEndpoint, {
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
    if (!confirm("Wirklich löschen?")) return;
    try {
      await api(`${apiEndpoint}/${id}`, { method: "DELETE" });
      laden();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderFormField = (field: FormField) => {
    if (field.type === "select") {
      return (
        <Select
          key={field.name}
          label={field.label}
          required={field.required}
          data={selectOptions[field.name] || []}
          value={formData[field.name] || null}
          onChange={(val) => setFormData({ ...formData, [field.name]: val })}
          searchable
          clearable
          placeholder="Bitte wählen..."
        />
      );
    }

    return (
      <TextInput
        key={field.name}
        label={field.label}
        required={field.required}
        type={field.type === "number" ? "number" : "text"}
        value={formData[field.name] || ""}
        onChange={(e) =>
          setFormData({ ...formData, [field.name]: e.target.value })
        }
      />
    );
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>{titel}</Title>
        <Group>
          <TextInput
            placeholder="Suchen..."
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            style={{ width: 250 }}
          />
          {darfErstellen && <Button onClick={neuAnlegen}>Neu anlegen</Button>}
          {selectedRow && (
            <>
              {darfBearbeiten && (
                <Button variant="light" onClick={() => bearbeiten(selectedRow)}>
                  Bearbeiten
                </Button>
              )}
              {darfLoeschen && (
                <Button variant="light" color="red" onClick={() => loeschen(selectedRow.id)}>
                  Löschen
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
          rowData={daten}
          columnDefs={columns}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          rowSelection="single"
          onRowSelected={(e) => setSelectedRow(e.node.isSelected() ? e.data : null)}
          onRowDoubleClicked={(e) => darfBearbeiten && bearbeiten(e.data)}
          pagination={true}
          paginationPageSize={50}
        />
      </div>

      <Modal
        opened={opened}
        onClose={close}
        title={editId ? `${titel} bearbeiten` : `${titel} anlegen`}
        size="lg"
      >
        {error && (
          <Alert color="red" mb="md">
            {error}
          </Alert>
        )}
        <Stack>
          {formFields.map(renderFormField)}
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
