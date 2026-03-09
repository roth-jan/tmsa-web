export interface CsvColumn {
  header: string;
  field: string;
  format?: "decimal" | "date" | "datetime" | "text";
}

function getNestedValue(obj: any, path: string): any {
  return path.split(".").reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function formatValue(val: any, format?: CsvColumn["format"]): string {
  if (val == null || val === "") return "";

  switch (format) {
    case "decimal": {
      const num = Number(val);
      if (isNaN(num)) return String(val);
      return num.toFixed(2).replace(".", ",");
    }
    case "date": {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    }
    case "datetime": {
      const dt = new Date(val);
      if (isNaN(dt.getTime())) return String(val);
      const date = `${String(dt.getDate()).padStart(2, "0")}.${String(dt.getMonth() + 1).padStart(2, "0")}.${dt.getFullYear()}`;
      const time = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
      return `${date} ${time}`;
    }
    default: {
      const s = String(val);
      if (s.includes(";") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }
  }
}

export function toCsv(rows: any[], columns: CsvColumn[]): string {
  const BOM = "\uFEFF";
  const headerLine = columns.map((c) => formatValue(c.header)).join(";");
  const dataLines = rows.map((row) =>
    columns.map((col) => formatValue(getNestedValue(row, col.field), col.format)).join(";")
  );
  return BOM + [headerLine, ...dataLines].join("\r\n");
}
