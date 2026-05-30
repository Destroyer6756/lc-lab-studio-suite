import * as XLSX from "xlsx";

export type SheetRow = Record<string, string | number | null | undefined>;

export function exportToExcel(filename: string, sheets: { name: string; rows: SheetRow[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{}]);
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31));
  }
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}
